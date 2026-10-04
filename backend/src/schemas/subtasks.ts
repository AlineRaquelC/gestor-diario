import { z } from 'zod';
export const taskIdSchema = z.string().trim().min(1);
export const subtaskIdSchema = z.string().trim().min(1);
export const createSubtaskSchema = z.strictObject({ title: z.string().trim().min(1) });
export const updateSubtaskSchema = z.strictObject({
  title: z.string().trim().min(1).optional(), done: z.boolean().optional(),
}).refine(value => Object.values(value).some(field => field !== undefined), 'Informe ao menos um campo.');
