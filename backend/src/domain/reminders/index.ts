/** Canonical business values; presentation labels and native state stay outside. */
export interface Reminder {
  readonly id: string;
  readonly taskId: string;
  readonly offsetMinutes: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReminderTiming {
  readonly dueDate: string;
  readonly time: string;
  readonly timeZone: string;
  readonly offsets: readonly number[];
}

export const MAX_REMINDERS = 5;
export type ReminderUnit = 'minutes' | 'hours' | 'days';
export type Clock = () => number;
export class ReminderError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'ReminderError';
  }
}

function fail(code: string, message: string): never {
  throw new ReminderError(code, message);
}

export function normalizeOffsets(offsets: readonly number[]): number[] {
  if (offsets.length > MAX_REMINDERS) {
    fail('LIMIT', 'Configure no máximo cinco lembretes.');
  }
  for (const offset of offsets) {
    if (!Number.isSafeInteger(offset) || offset < 0 ||
        !Number.isSafeInteger(offset * 60000)) {
      fail('OFFSET', 'A antecedência deve ser um número inteiro de minutos válido.');
    }
  }
  if (new Set(offsets).size !== offsets.length) {
    fail('DUPLICATE', 'Há lembretes com a mesma antecedência.');
  }
  return [...offsets].sort((a, b) => a - b);
}

export function toOffsetMinutes(amount: number, unit: ReminderUnit): number {
  const multiplier = {minutes: 1, hours: 60, days: 1440}[unit];
  if (!Number.isSafeInteger(amount) || amount <= 0 || !multiplier) {
    fail('AMOUNT', 'Informe uma quantidade inteira positiva e uma unidade válida.');
  }
  return normalizeOffsets([amount * multiplier])[0];
}

/** Resolve civil time using the runtime's IANA rules, never the process zone.
 * Candidate offsets on both sides of the date are round-tripped to detect DST
 * gaps and overlaps. No fixed UTC offset or automatic DST disambiguation.
 */
export function resolveTaskInstant(dueDate: string, time: string, timeZone: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    fail('DATE_TIME', 'Defina uma data válida e um horário HH:mm para os lembretes.');
  }
  const [year, month, day] = dueDate.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const civil = new Date(0);
  civil.setUTCFullYear(year, month - 1, day);
  civil.setUTCHours(hour, minute, 0, 0);
  if (year < 1900 || civil.getUTCFullYear() !== year ||
      civil.getUTCMonth() !== month - 1 || civil.getUTCDate() !== day) {
    fail('DATE_TIME', 'Defina uma data válida entre 1900 e 9999.');
  }
  let formatter: Intl.DateTimeFormat;
  try {
    if (!timeZone || /^[+-]/.test(timeZone)) { throw new Error('IANA'); }
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone, calendar: 'gregory', numberingSystem: 'latn',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
  } catch {
    return fail('TIME_ZONE', 'Defina um fuso horário IANA válido.');
  }
  const civilAt = (instant: number): number => {
    const parts: Record<string, number> = {};
    for (const part of formatter.formatToParts(instant)) {
      if (part.type !== 'literal') { parts[part.type] = Number(part.value); }
    }
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  };
  const local = civil.getTime();
  const offsets = new Set<number>();
  // Includes pre/post-transition offsets, including half-hour and date-line changes.
  for (let hours = -48; hours <= 48; hours += 6) {
    const sample = local + hours * 3600000;
    offsets.add(civilAt(sample) - sample);
  }
  const candidates = [...offsets].map(offset => local - offset)
    .filter(instant => civilAt(instant) === local);
  if (candidates.length !== 1) {
    fail('LOCAL_TIME', 'Esse horário é inexistente ou ambíguo nesse fuso. Escolha outro horário.');
  }
  return candidates[0];
}

export function resolveReminderSchedule(
  dueDate: string, time: string, timeZone: string, offsetMinutes: number, now: Clock,
): {anchorAt: number; triggerAt: number; expired: boolean} {
  normalizeOffsets([offsetMinutes]);
  const anchorAt = resolveTaskInstant(dueDate, time, timeZone);
  const triggerAt = anchorAt - offsetMinutes * 60000;
  if (!Number.isFinite(new Date(triggerAt).getTime())) {
    fail('RANGE', 'A antecedência resulta em uma data fora do intervalo válido.');
  }
  const current = now();
  if (!Number.isFinite(current)) { fail('CLOCK', 'Relógio inválido.'); }
  return {anchorAt, triggerAt, expired: triggerAt <= current};
}

/** Validate effective merged timing. Existing expired offsets may be retained,
 * but never become eligible for a retroactive trigger. IDs belong to storage.
 */
export function validateReminderChange(next: ReminderTiming, previous: ReminderTiming | undefined, now: Clock) {
  const offsets = normalizeOffsets(next.offsets);
  const old = previous ? normalizeOffsets(previous.offsets) : [];
  if (!offsets.length) { return []; }
  const anchorChanged = !previous || next.dueDate !== previous.dueDate ||
    next.time !== previous.time || next.timeZone !== previous.timeZone;
  const current = now();
  return offsets.map(offset => {
    const schedule = resolveReminderSchedule(next.dueDate, next.time, next.timeZone, offset, () => current);
    if (schedule.expired && (anchorChanged || !old.includes(offset))) {
      fail(schedule.anchorAt <= current ? 'TASK_PAST' : 'TRIGGER_PAST',
        schedule.anchorAt <= current
          ? 'O horário da tarefa já passou. Escolha um horário futuro para o lembrete.'
          : 'O lembrete precisa ser agendado para um horário futuro. Reduza a antecedência ou altere o horário da tarefa.');
    }
    return {offsetMinutes: offset, ...schedule};
  });
}

export function sameReminderTiming(a: ReminderTiming, b: ReminderTiming): boolean {
  const left = normalizeOffsets(a.offsets);
  const right = normalizeOffsets(b.offsets);
  return a.dueDate === b.dueDate && a.time === b.time && a.timeZone === b.timeZone &&
    left.length === right.length && left.every((offset, index) => offset === right[index]);
}
