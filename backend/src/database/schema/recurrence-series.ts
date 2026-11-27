import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { projects } from './projects.js';
import { timestamps } from './timestamps.js';
import type { RecurrenceTemplate } from '../../domain/recurrence/index.js';

export const recurrenceSeries = sqliteTable('recurrence_series', {
  id: text('id').primaryKey().notNull(),
  clientId: text('client_id').notNull().unique(),
  frequency: text('frequency', { enum: ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] }).notNull(),
  timeZone: text('time_zone').notNull(),
  anchorDate: text('anchor_date').notNull(),
  // Immutable retry identity even if the current rule's anchor is later edited.
  firstOccurrenceKey: text('first_occurrence_key').notNull(),
  materializedThrough: text('materialized_through'),
  endBeforeOccurrenceKey: text('end_before_occurrence_key'),
  deletedAt: text('deleted_at'),
  title: text('title').notNull(),
  description: text('description'),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'restrict', onUpdate: 'no action' }),
  priority: text('priority', { enum: ['LOW', 'MEDIUM', 'HIGH'] }).notNull(),
  time: text('time'),
  startOffsetDays: integer('start_offset_days').notNull(),
  subtasks: text('subtasks', { mode: 'json' }).$type<RecurrenceTemplate['subtasks']>().notNull(),
  reminders: text('reminders', { mode: 'json' }).$type<RecurrenceTemplate['reminders']>().notNull(),
  ...timestamps(),
}, table => [
  check('recurrence_end_before_valid', sql`end_before_occurrence_key IS NULL OR (end_before_occurrence_key GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr(end_before_occurrence_key,1,4) >= '1900' AND date(end_before_occurrence_key,'+0 days') IS NOT NULL AND date(end_before_occurrence_key,'+0 days') = end_before_occurrence_key)`),
  check('recurrence_deleted_at_valid', sql`deleted_at IS NULL OR (strftime('%Y-%m-%dT%H:%M:%fZ',deleted_at) IS NOT NULL AND strftime('%Y-%m-%dT%H:%M:%fZ',deleted_at) = deleted_at)`),
  check('recurrence_frequency_valid', sql`${table.frequency} IN ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY')`),
  check('recurrence_client_valid', sql`length(trim(${table.clientId})) > 0`),
  check('recurrence_title_valid', sql`length(trim(${table.title})) > 0`),
  check('recurrence_zone_valid', sql`length(trim(${table.timeZone})) > 0`),
  check('recurrence_priority_valid', sql`${table.priority} IN ('LOW', 'MEDIUM', 'HIGH')`),
  check('recurrence_duration_valid', sql`typeof(${table.startOffsetDays}) = 'integer' AND ${table.startOffsetDays} BETWEEN 0 AND 2958463`),
  check('recurrence_subtasks_valid', sql`json_valid(${table.subtasks}) AND json_type(${table.subtasks}) = 'array'`),
  check('recurrence_reminders_valid', sql`json_valid(${table.reminders}) AND json_type(${table.reminders}) = 'array' AND json_array_length(${table.reminders}) <= 5`),
]);
