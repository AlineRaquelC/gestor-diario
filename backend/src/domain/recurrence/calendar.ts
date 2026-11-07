export class RecurrenceError extends Error {
  readonly code = 'VALIDATION_ERROR';
}
const leap = (year: number) =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
export const monthLengths = (year: number) => [
  31,
  leap(year) ? 29 : 28,
  31,
  30,
  31,
  30,
  31,
  31,
  30,
  31,
  30,
  31,
];
export const key = (year: number, month: number, day: number) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(
    day,
  ).padStart(2, '0')}`;
export function civilDate(value: string): [number, number, number] {
  const [year, month, day] = value.split('-').map(Number);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    year < 1900 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > monthLengths(year)[month - 1]
  ) {
    throw new RecurrenceError(
      'Informe uma data civil válida entre 1900 e 9999.',
    );
  }
  return [year, month, day];
}
export function addCivilDays(value: string, amount: number): string {
  const [year, month, day] = civilDate(value);
  if (!Number.isSafeInteger(amount)) {
    throw new RecurrenceError('Intervalo de dias inválido.');
  }
  // Calendar fields, not elapsed UTC milliseconds (a civil day may contain DST).
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCDate(date.getUTCDate() + amount);
  const result = key(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
  civilDate(result);
  return result;
}
export function ordinal(value: string): number {
  const [year, month, day] = civilDate(value),
    previous = year - 1;
  return (
    365 * previous +
    Math.floor(previous / 4) -
    Math.floor(previous / 100) +
    Math.floor(previous / 400) +
    monthLengths(year)
      .slice(0, month - 1)
      .reduce((sum, length) => sum + length, 0) +
    day
  );
}
export function civilDuration(startDate: string, dueDate: string): number {
  const duration = ordinal(dueDate) - ordinal(startDate);
  if (duration < 0) {
    throw new RecurrenceError(
      'O prazo não pode ser anterior à data de início.',
    );
  }
  return duration;
}
export function occurrenceDates(
  occurrenceKey: string,
  startOffsetDays: number,
) {
  if (!Number.isSafeInteger(startOffsetDays) || startOffsetDays < 0) {
    throw new RecurrenceError('Duração civil inválida.');
  }
  return {
    startDate: addCivilDays(occurrenceKey, -startOffsetDays),
    dueDate: occurrenceKey,
  };
}

export function civilReferenceDay(
  timeZone: string,
  clock: () => number,
): string {
  const now = clock();
  if (!Number.isFinite(now)) {
    throw new RecurrenceError('Relógio inválido.');
  }
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  const result = `${part('year')}-${part('month')}-${part('day')}`;
  civilDate(result);
  return result;
}
