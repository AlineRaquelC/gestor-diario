import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { TaskValidationError, TaskNotFoundError } from '../errors/tasks.js';
import { ProjectError } from '../errors/projects.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) return next(error);

  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos.' } });
    return;
  }

  if (error instanceof TaskValidationError) {
    res.status(400).json({ error: { code: error.code, message: error.message } });
    return;
  }

  if (error instanceof TaskNotFoundError) {
    res.status(404).json({ error: { code: error.code, message: error.message } });
    return;
  }

  if (error instanceof ProjectError) {
    res.status(error.code === 'PROJECT_NOT_FOUND' ? 404 : 409)
      .json({ error: { code: error.code, message: error.message } });
    return;
  }

  if (error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'JSON inválido.' } });
    return;
  }

  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } });
};
