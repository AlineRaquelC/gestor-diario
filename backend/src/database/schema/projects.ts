import { sql } from 'drizzle-orm';
import { check, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { timestamps } from './timestamps.js';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  ...timestamps(),
  deletedAt: text('deleted_at'),
}, (table) => [
  check('projects_name_not_empty', sql`length(trim(${table.name})) > 0`),
]);
