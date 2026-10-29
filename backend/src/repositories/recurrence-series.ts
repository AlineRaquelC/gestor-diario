import { asc, eq, and } from 'drizzle-orm';
import type { openDatabase } from '../database/index.js';
import { recurrenceSeries } from '../database/schema/index.js';
import type { RecurrenceSeries } from '../domain/recurrence/index.js';

type Row = typeof recurrenceSeries.$inferSelect;
export class RecurrenceSeriesRepository {
  constructor(private readonly db: ReturnType<typeof openDatabase>['db']) {}
  static toDto(row: Row): RecurrenceSeries {
    const { title, description, projectId, priority, time, startOffsetDays, subtasks, reminders, ...series } = row;
    return { ...series, template: { title, description, projectId, priority, time, startOffsetDays, subtasks, reminders } };
  }
  findAll() {return this.db.select().from(recurrenceSeries).orderBy(asc(recurrenceSeries.id)).all();}
  findById(id: string) {return this.db.select().from(recurrenceSeries).where(eq(recurrenceSeries.id, id)).get();}
  findByClientId(id: string) {return this.db.select().from(recurrenceSeries).where(eq(recurrenceSeries.clientId, id)).get();}
  create(input: typeof recurrenceSeries.$inferInsert) {return this.db.insert(recurrenceSeries).values(input).returning().get();}
  update(id: string, expectedUpdatedAt: string, changes: Partial<Omit<Row, 'id' | 'clientId' | 'firstOccurrenceKey' | 'createdAt'>>) {
    return this.db.update(recurrenceSeries).set(changes)
      .where(and(eq(recurrenceSeries.id, id), eq(recurrenceSeries.updatedAt, expectedUpdatedAt))).returning().get();
  }
  transaction<T>(work: () => T): T {return this.db.transaction(work, { behavior: 'immediate' });}
}
