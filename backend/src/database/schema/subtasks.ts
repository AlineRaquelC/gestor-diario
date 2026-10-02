import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { tasks } from './tasks.js';
import { timestamps } from './timestamps.js';

export const subtasks = sqliteTable('subtasks', {
  id: text('id').primaryKey().notNull(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'restrict', onUpdate: 'no action' }),
  title: text('title').notNull(),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  ...timestamps(),
}, (table) => [
  check('subtasks_title_not_empty', sql`length(trim(${table.title})) > 0`),
  check('subtasks_done_boolean', sql`${table.done} IN (0, 1)`),
]);
