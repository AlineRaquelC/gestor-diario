export class RecurrenceNotFoundError extends Error {
  readonly code = 'RECURRENCE_NOT_FOUND';
  constructor() {super('Série recorrente não encontrada.');}
}
export class RecurrenceConflictError extends Error {
  readonly code = 'RECURRENCE_CONFLICT';
  constructor() {super('A série foi alterada. Recarregue a regra antes de editar.');}
}
