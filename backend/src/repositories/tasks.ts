import type { openDatabase } from '../database/index.js';
import { and, asc, eq, isNull, inArray } from 'drizzle-orm';
import { tasks, projects, subtasks, taskHistory } from '../database/schema/index.js';
import type { UpdateTask } from '../schemas/tasks.js';

type Database = ReturnType<typeof openDatabase>['db'];
export class TasksRepository {
  constructor(private readonly db: Database) {}

  create(task: typeof tasks.$inferInsert) {
    return this.db.insert(tasks).values(task).returning().get();
  }

  private query() {
    return this.db.select({ task: tasks, project: projects }).from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id));
  }

  findAll() {
    const rows = this.query().where(isNull(tasks.deletedAt))
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
    return rows.map(row => ({ ...row.task, project: row.project, subtasks: byTask.get(row.task.id) ?? [] }));
  }

  findById(id: string) {
    const row = this.query().where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).get();
    if (!row) return undefined;
    const children = this.db.select().from(subtasks).where(eq(subtasks.taskId, id))
      .orderBy(asc(subtasks.createdAt), asc(subtasks.id)).all();
    return { ...row.task, project: row.project, subtasks: children };
  }

  updateById(id: string, changes: UpdateTask & { done?: boolean; progress?: number }, updatedAt: string) {
    return this.db.update(tasks).set({ ...changes, updatedAt })
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).returning().get();
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
