import { sql } from 'drizzle-orm';
import { check, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { tasks } from './tasks.js';
import { timestamps } from './timestamps.js';

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey().notNull(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'restrict', onUpdate: 'no action' }),
  content: text('content').notNull(),
  ...timestamps(),
}, (table) => [
  check('notes_content_not_empty', sql`length(trim(${table.content})) > 0`),
]);
