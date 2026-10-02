import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { projects } from './projects.js';
import { timestamps } from './timestamps.js';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().notNull(),
  title: text('title').notNull(),
  description: text('description'),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'restrict', onUpdate: 'no action' }),
  startDate: text('start_date').notNull(),
  dueDate: text('due_date').notNull(),
  time: text('time'),
  priority: text('priority', { enum: ['LOW', 'MEDIUM', 'HIGH'] }).notNull(),
  status: text('status', { enum: ['PENDING', 'PARTIAL', 'COMPLETED'] }).notNull().default('PENDING'),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  progress: integer('progress').notNull().default(0),
  favorite: integer('favorite', { mode: 'boolean' }).default(false),
  ...timestamps(),
  deletedAt: text('deleted_at'),
  undoUntil: text('undo_until'),
}, (table) => [
  check('tasks_title_not_empty', sql`length(trim(${table.title})) > 0`),
  check('tasks_priority_valid', sql`${table.priority} IN ('LOW', 'MEDIUM', 'HIGH')`),
  check('tasks_status_valid', sql`${table.status} IN ('PENDING', 'PARTIAL', 'COMPLETED')`),
  check('tasks_progress_valid', sql`typeof(${table.progress}) = 'integer' AND ${table.progress} BETWEEN 0 AND 100`),
  check('tasks_done_boolean', sql`${table.done} IN (0, 1)`),
  check('tasks_favorite_boolean', sql`${table.favorite} IN (0, 1)`),
]);
