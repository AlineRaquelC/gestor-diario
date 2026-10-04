import { z } from 'zod';

export const createTaskSchema = z.strictObject({
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  projectId: z.string().min(1).refine(value => value.trim().length > 0),
  startDate: z.string(),
  dueDate: z.string(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  status: z.enum(['PENDING', 'PARTIAL', 'COMPLETED']).default('PENDING'),
});
export type CreateTask = z.infer<typeof createTaskSchema>;

// Avoid creation defaults in a partial update (especially status).
export const updateTaskSchema = createTaskSchema.omit({ status: true, time: true }).partial().extend({
  status: z.enum(['PENDING', 'PARTIAL', 'COMPLETED']).optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
}).refine(value => Object.values(value).some(field => field !== undefined), 'Informe ao menos um campo.');
export type UpdateTask = z.infer<typeof updateTaskSchema>;
