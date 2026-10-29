import { randomUUID } from 'node:crypto';
import { resolveReminderSchedule } from '../domain/reminders/index.js';
import type { openDatabase } from '../database/index.js';
import { and, asc, eq, isNull, inArray } from 'drizzle-orm';
import { tasks, projects, subtasks, taskHistory, taskReminders } from '../database/schema/index.js';
import type { UpdateTask } from '../schemas/tasks.js';

type Database = ReturnType<typeof openDatabase>['db'];
export class TasksRepository {
  constructor(private readonly db: Database) {}

  findByClientId(clientId: string) {
    const row = this.db.select().from(tasks).where(eq(tasks.clientId, clientId)).get();
    return row ? this.findIncludingDeleted(row.id) : undefined;
  }

  create(task: typeof tasks.$inferInsert) {
    return this.db.insert(tasks).values(task).returning().get();
  }

  private query() {
    return this.db.select({ task: tasks, project: projects }).from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id));
  }

  findAll(includeDeleted = false) {
    const rows = this.query().where(includeDeleted ? undefined : isNull(tasks.deletedAt))
      .orderBy(asc(tasks.createdAt), asc(tasks.id)).all();
    const children = rows.length === 0 ? [] : this.db.select().from(subtasks)
      .where(inArray(subtasks.taskId, rows.map(row => row.task.id)))
      .orderBy(asc(subtasks.createdAt), asc(subtasks.id)).all();
    const byTask = new Map<string, typeof children>();
    for (const child of children) {
      const list = byTask.get(child.taskId) ?? [];
      list.push(child);
      byTask.set(child.taskId, list);
    }
    const reminders = rows.length ? this.db.select().from(taskReminders)
      .where(inArray(taskReminders.taskId, rows.map(row => row.task.id)))
      .orderBy(asc(taskReminders.offsetMinutes)).all() : [];
    const remindersByTask = new Map<string, typeof reminders>();
    for (const item of reminders) {
      const list = remindersByTask.get(item.taskId) ?? [];
      list.push(item);
      remindersByTask.set(item.taskId, list);
    }
    return rows.map(row => ({ ...row.task, project: row.project, subtasks: byTask.get(row.task.id) ?? [],
      reminders: this.withTriggers(row.task, remindersByTask.get(row.task.id) ?? []) }));
  }

  findById(id: string) {
    const row = this.query().where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).get();
    if (!row) return undefined;
    const children = this.db.select().from(subtasks).where(eq(subtasks.taskId, id))
      .orderBy(asc(subtasks.createdAt), asc(subtasks.id)).all();
    return { ...row.task, project: row.project, subtasks: children, reminders: this.remindersFor(row.task) };
  }

  updateById(id: string, changes: Omit<UpdateTask, 'reminders'> & { done?: boolean; progress?: number }, updatedAt: string) {
    return this.db.update(tasks).set({ ...changes, updatedAt })
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).returning().get();
  }

  findIncludingDeleted(id: string) {
    const row = this.db.select().from(tasks).where(eq(tasks.id, id)).get();
    return row ? { ...row, reminders: this.remindersFor(row) } : undefined;
  }

  private withTriggers(task: typeof tasks.$inferSelect, items: (typeof taskReminders.$inferSelect)[]) {
    return items.map(item => ({ ...item, triggerAt: new Date(resolveReminderSchedule(
      task.dueDate, task.time!, task.reminderTimeZone!, item.offsetMinutes, () => 0,
    ).triggerAt).toISOString() }));
  }

  private remindersFor(task: typeof tasks.$inferSelect) {
    return this.withTriggers(task, this.db.select().from(taskReminders)
      .where(eq(taskReminders.taskId, task.id)).orderBy(asc(taskReminders.offsetMinutes)).all());
  }

  replaceReminders(taskId: string, offsets: number[], timestamp: string) {
    const current = this.db.select().from(taskReminders).where(eq(taskReminders.taskId, taskId)).all();
    for (const item of current) {
      if (!offsets.includes(item.offsetMinutes)) {
        this.db.delete(taskReminders).where(and(eq(taskReminders.taskId, taskId), eq(taskReminders.id, item.id))).run();
      }
    }
    for (const offsetMinutes of offsets) {
      if (!current.some(item => item.offsetMinutes === offsetMinutes)) {
        this.db.insert(taskReminders).values({ id: randomUUID(), taskId, offsetMinutes,
          createdAt: timestamp, updatedAt: timestamp }).run();
      }
    }
  }

  setDeletedAt(id: string, deletedAt: string | null, updatedAt: string) {
    return this.db.update(tasks).set({ deletedAt, undoUntil: null, updatedAt })
      .where(eq(tasks.id, id)).returning().get();
  }

  recordUpdate(taskId: string, id: string, createdAt: string, fields: string[]) {
    this.createHistoryEvent({ id, taskId, action: 'UPDATED', createdAt, metadata: { fields } });
  }

  createHistoryEvent(event: typeof taskHistory.$inferInsert) {
    this.db.insert(taskHistory).values(event).run();
  }

  findHistoryByTaskId(taskId: string) {
    return this.db.select().from(taskHistory).where(eq(taskHistory.taskId, taskId))
      .orderBy(asc(taskHistory.createdAt), asc(taskHistory.id)).all();
  }

  transaction<T>(work: () => T): T {
    // Shared synchronous connection locks project validation and insertion.
    return this.db.transaction(() => work(), { behavior: 'immediate' });
  }
}
