import { sql } from 'drizzle-orm';
import { check, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { tasks } from './tasks.js';
import { timestamps } from './timestamps.js';

export const taskHistory = sqliteTable('task_history', {
  id: text('id').primaryKey().notNull(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'restrict', onUpdate: 'no action' }),
  action: text('action', { enum: [
    'CREATED', 'UPDATED', 'STATUS_CHANGED', 'COMPLETED',
    'REOPENED', 'DELETED', 'RESTORED', 'PROJECT_CHANGED',
  ] }).notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: timestamps().createdAt,
}, (table) => [
  check('task_history_action_valid', sql`${table.action} IN ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'COMPLETED', 'REOPENED', 'DELETED', 'RESTORED', 'PROJECT_CHANGED')`),
]);
