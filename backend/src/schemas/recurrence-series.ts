import { z } from 'zod';
import { createTaskSchema } from './tasks.js';

export const recurrenceTemplateSchema = z.strictObject({
  title: createTaskSchema.shape.title,
  description: z.string().nullable().default(null),
  projectId: createTaskSchema.shape.projectId,
  priority: createTaskSchema.shape.priority,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().default(null),
  startOffsetDays: z.number().int().min(0).max(2958463),
  subtasks: z.array(z.strictObject({ title: z.string().trim().min(1) })).default([]),
  reminders: createTaskSchema.shape.reminders.default([]).transform(items => [...items].sort((a, b) => a.offsetMinutes - b.offsetMinutes)),
});
const frequency = z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']);
export const createRecurrenceSchema = z.strictObject({
  clientId: z.string().trim().min(1).max(200),
  frequency,
  timeZone: z.string().min(1),
  anchorDate: z.string(),
  template: recurrenceTemplateSchema,
});
export const activateRecurrenceSchema = createRecurrenceSchema.pick({ clientId: true, frequency: true, timeZone: true });
export type ActivateRecurrence = z.infer<typeof activateRecurrenceSchema>;
export const updateRecurrenceSchema = z.strictObject({
  expectedUpdatedAt: z.iso.datetime(),
  taskId: z.string().min(1),
  frequency: frequency.optional(),
  anchorDate: z.string().optional(),
  template: recurrenceTemplateSchema.optional(),
}).refine(value => value.frequency !== undefined || value.anchorDate !== undefined || value.template !== undefined,
  'Informe uma alteração na regra.');
export const materializeSchema = z.strictObject({});
export type CreateRecurrence = z.infer<typeof createRecurrenceSchema>;
export type UpdateRecurrence = z.infer<typeof updateRecurrenceSchema>;
