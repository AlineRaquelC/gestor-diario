export class SubtaskNotFoundError extends Error {
  readonly code = 'SUBTASK_NOT_FOUND';
  constructor() { super('Subtarefa não encontrada.'); }
}
