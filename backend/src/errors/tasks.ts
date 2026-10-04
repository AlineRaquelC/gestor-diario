export class TaskValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
}

export class TaskNotFoundError extends Error {
  readonly code = 'TASK_NOT_FOUND';
  constructor() { super('Tarefa não encontrada.'); }
}
