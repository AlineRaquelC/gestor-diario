export class NoteNotFoundError extends Error {
  readonly code = 'NOTE_NOT_FOUND';
  constructor() { super('Observação não encontrada.'); }
}
