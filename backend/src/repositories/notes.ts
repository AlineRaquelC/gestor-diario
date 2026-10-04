import { and, asc, eq } from 'drizzle-orm';
import type { openDatabase } from '../database/index.js';
import { notes } from '../database/schema/index.js';

export class NotesRepository {
  constructor(private readonly db: ReturnType<typeof openDatabase>['db']) {}
  create(value: typeof notes.$inferInsert) {
    return this.db.insert(notes).values(value).returning().get();
  }
  findByTaskId(taskId: string) {
    return this.db.select().from(notes).where(eq(notes.taskId, taskId))
      .orderBy(asc(notes.createdAt), asc(notes.id)).all();
  }
  findById(taskId: string, id: string) {
    return this.db.select().from(notes).where(and(eq(notes.taskId, taskId), eq(notes.id, id))).get();
  }
  update(taskId: string, id: string, content: string, updatedAt: string) {
    return this.db.update(notes).set({ content, updatedAt })
      .where(and(eq(notes.taskId, taskId), eq(notes.id, id))).returning().get();
  }
  delete(taskId: string, id: string) {
    return this.db.delete(notes).where(and(eq(notes.taskId, taskId), eq(notes.id, id))).returning().get();
  }
}
