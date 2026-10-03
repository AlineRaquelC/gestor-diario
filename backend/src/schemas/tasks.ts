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
