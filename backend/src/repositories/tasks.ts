import type { openDatabase } from '../database/index.js';
import { and, asc, eq, isNull, inArray } from 'drizzle-orm';
import { tasks, projects, subtasks } from '../database/schema/index.js';

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

  transaction<T>(work: () => T): T {
    // Shared synchronous connection locks project validation and insertion.
    return this.db.transaction(() => work(), { behavior: 'immediate' });
  }
}
