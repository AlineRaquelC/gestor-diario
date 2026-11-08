import { z } from 'zod';
export const taskIdSchema = z.string().trim().min(1);
export const noteIdSchema = z.string().trim().min(1);
export const createNoteSchema = z.strictObject({ content: z.string().trim().min(1) });
export const updateNoteSchema = createNoteSchema;
