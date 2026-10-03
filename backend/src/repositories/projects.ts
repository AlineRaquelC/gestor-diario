import { and, asc, eq, isNull } from 'drizzle-orm';
import type { openDatabase } from '../database/index.js';
import { projects, tasks } from '../database/schema/index.js';
import type { UpdateProject } from '../schemas/projects.js';

type Database = ReturnType<typeof openDatabase>['db'];

export class ProjectsRepository {
  constructor(private readonly db: Database) {}

  create(project: typeof projects.$inferInsert) {
    return this.db.insert(projects).values(project).returning().get();
  }

  findAll() {
    return this.db.select().from(projects).where(isNull(projects.deletedAt))
      .orderBy(asc(projects.createdAt), asc(projects.id)).all();
  }

  findById(id: string) {
    return this.db.select().from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt))).get();
  }

  update(id: string, changes: UpdateProject, updatedAt: string) {
    return this.db.update(projects).set({ ...changes, updatedAt })
      .where(and(eq(projects.id, id), isNull(projects.deletedAt))).returning().get();
  }

  hasTasks(id: string) {
    // Include soft-deleted tasks: their links must also remain intact.
    return this.db.select({ id: tasks.id }).from(tasks)
      .where(eq(tasks.projectId, id)).limit(1).get() !== undefined;
  }

  softDelete(id: string, timestamp: string) {
    return this.db.update(projects).set({ deletedAt: timestamp, updatedAt: timestamp })
      .where(and(eq(projects.id, id), isNull(projects.deletedAt))).returning().get();
  }

  transaction<T>(work: () => T): T {
    // Synchronous queries share this connection. IMMEDIATE prevents another
    // connection from linking a task between the dependency check and deletion.
    return this.db.transaction(() => work(), { behavior: 'immediate' });
  }
}
