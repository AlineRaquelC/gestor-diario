import { and, asc, eq } from 'drizzle-orm';
import type { openDatabase } from '../database/index.js';
import { subtasks } from '../database/schema/index.js';

export class SubtasksRepository {
  constructor(private readonly db: ReturnType<typeof openDatabase>['db']) {}
  create(value: typeof subtasks.$inferInsert) { return this.db.insert(subtasks).values(value).returning().get(); }
  findById(taskId: string, id: string) {
    return this.db.select().from(subtasks).where(and(eq(subtasks.taskId, taskId), eq(subtasks.id, id))).get();
  }
  findByTaskId(taskId: string) {
    return this.db.select().from(subtasks).where(eq(subtasks.taskId, taskId)).orderBy(asc(subtasks.createdAt), asc(subtasks.id)).all();
  }
  update(taskId: string, id: string, changes: { title?: string; done?: boolean }, updatedAt: string) {
    return this.db.update(subtasks).set({ ...changes, updatedAt })
      .where(and(eq(subtasks.taskId, taskId), eq(subtasks.id, id))).returning().get();
  }
  delete(taskId: string, id: string) {
    return this.db.delete(subtasks).where(and(eq(subtasks.taskId, taskId), eq(subtasks.id, id))).returning().get();
  }
  setAllDone(taskId: string, done: boolean, updatedAt: string) {
    return this.db.update(subtasks).set({ done, updatedAt }).where(eq(subtasks.taskId, taskId)).run();
  }
}
