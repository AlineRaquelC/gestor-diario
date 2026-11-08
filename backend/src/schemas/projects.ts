import { z } from 'zod';

const nonEmpty = z.string().trim().min(1);
export const createProjectSchema = z.strictObject({
  clientId: z.string().min(1).max(200).optional(),
  name: nonEmpty,
  description: z.string().nullable().optional(),
  color: nonEmpty,
  icon: nonEmpty,
});
export const updateProjectSchema = createProjectSchema.omit({ clientId: true }).partial().extend({ expectedUpdatedAt: z.string().optional() }).refine(
  value => Object.keys(value).some(key => key !== 'expectedUpdatedAt'),
  { message: 'Informe ao menos um campo para atualizar.' },
);
export const projectIdSchema = z.string().refine(value => value.trim().length > 0, {
  message: 'O ID do projeto não pode ser vazio.',
});
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
