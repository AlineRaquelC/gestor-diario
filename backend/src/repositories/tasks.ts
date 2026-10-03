import type { openDatabase } from '../database/index.js';
import { tasks } from '../database/schema/index.js';

type Database = ReturnType<typeof openDatabase>['db'];
export class TasksRepository {
  constructor(private readonly db: Database) {}

  create(task: typeof tasks.$inferInsert) {
    return this.db.insert(tasks).values(task).returning().get();
  }

  transaction<T>(work: () => T): T {
    // Shared synchronous connection locks project validation and insertion.
    return this.db.transaction(() => work(), { behavior: 'immediate' });
  }
}
