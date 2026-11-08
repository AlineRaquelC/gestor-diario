import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { tasks } from './tasks.js';
import { timestamps } from './timestamps.js';

export const taskReminders = sqliteTable('task_reminders', {
  id: text('id').primaryKey().notNull(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'restrict', onUpdate: 'no action' }),
  offsetMinutes: integer('offset_minutes').notNull(),
  ...timestamps(),
}, table => [
  unique('task_reminders_task_offset_unique').on(table.taskId, table.offsetMinutes),
  check('task_reminders_offset_valid', sql`typeof(${table.offsetMinutes}) = 'integer' AND ${table.offsetMinutes} BETWEEN 0 AND 150119987579`),
]);
