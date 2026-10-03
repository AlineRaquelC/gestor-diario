import { z } from 'zod';

const nonEmpty = z.string().trim().min(1);
export const createProjectSchema = z.strictObject({
  name: nonEmpty,
  description: z.string().nullable().optional(),
  color: nonEmpty,
  icon: nonEmpty,
});
export const updateProjectSchema = createProjectSchema.partial().refine(
  value => Object.keys(value).length > 0,
  { message: 'Informe ao menos um campo para atualizar.' },
);
export const projectIdSchema = z.string().refine(value => value.trim().length > 0, {
  message: 'O ID do projeto não pode ser vazio.',
});
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
