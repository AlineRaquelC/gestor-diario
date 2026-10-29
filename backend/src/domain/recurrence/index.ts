import { resolveTaskInstant } from '../reminders/index.js';
import type { Clock } from '../reminders/index.js';

export type RecurrenceFrequency = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type OccurrenceIdentity = { recurrenceSeriesId: string; occurrenceKey: string };
export type RecurrenceTemplate = {
  title: string; description: string | null; projectId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH'; time: string | null; startOffsetDays: number;
  subtasks: { title: string }[]; reminders: { offsetMinutes: number }[];
};
export type RecurrenceSeries = {
  id: string; clientId: string; frequency: RecurrenceFrequency; timeZone: string;
  anchorDate: string; firstOccurrenceKey: string; materializedThrough: string | null;
  template: RecurrenceTemplate; createdAt: string; updatedAt: string;
};
export class RecurrenceError extends Error {
  readonly code = 'VALIDATION_ERROR';
}
const leap = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
const monthLengths = (year: number) => [31, leap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const key = (year: number, month: number, day: number) => `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
export function civilDate(value: string): [number, number, number] {
  const [year, month, day] = value.split('-').map(Number);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || year < 1900 || year > 9999 || month < 1 || month > 12 ||
      day < 1 || day > monthLengths(year)[month - 1]) {
    throw new RecurrenceError('Informe uma data civil válida entre 1900 e 9999.');
  }
  return [year, month, day];
}
export function addCivilDays(value: string, amount: number): string {
  const [year, month, day] = civilDate(value);
  if (!Number.isSafeInteger(amount)) {throw new RecurrenceError('Intervalo de dias inválido.');}
  // Calendar fields, not elapsed UTC milliseconds (a civil day may contain DST).
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCDate(date.getUTCDate() + amount);
  const result = key(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  civilDate(result);
  return result;
}
function ordinal(value: string): number {
  const [year, month, day] = civilDate(value), previous = year - 1;
  return 365 * previous + Math.floor(previous / 4) - Math.floor(previous / 100) + Math.floor(previous / 400) +
    monthLengths(year).slice(0, month - 1).reduce((sum, length) => sum + length, 0) + day;
}
export function civilDuration(startDate: string, dueDate: string): number {
  const duration = ordinal(dueDate) - ordinal(startDate);
  if (duration < 0) {throw new RecurrenceError('O prazo não pode ser anterior à data de início.');}
  return duration;
}
export function occurrenceDates(occurrenceKey: string, startOffsetDays: number) {
  if (!Number.isSafeInteger(startOffsetDays) || startOffsetDays < 0) {throw new RecurrenceError('Duração civil inválida.');}
  return { startDate: addCivilDays(occurrenceKey, -startOffsetDays), dueDate: occurrenceKey };
}
export function validateRecurrenceTimeZone(zone: string): string {
  resolveTaskInstant('2026-01-15', '12:00', zone);
  return zone;
}
export function referenceDay(timeZone: string, clock: Clock): string {
  validateRecurrenceTimeZone(timeZone);
  const now = clock();
  if (!Number.isFinite(now)) {throw new RecurrenceError('Relógio inválido.');}
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  const result = `${part('year')}-${part('month')}-${part('day')}`;
  civilDate(result);
  return result;
}
export function materializationWindow(timeZone: string, materializedThrough: string | null, clock: Clock) {
  const today = referenceDay(timeZone, clock), end = addCivilDays(today, 31);
  if (materializedThrough !== null) {civilDate(materializedThrough);}
  // Avoid overflowing at 9999-12-31 when coverage already exceeds this window.
  const start = materializedThrough !== null && materializedThrough >= end ? null :
    materializedThrough !== null && materializedThrough >= today ? addCivilDays(materializedThrough, 1) : today;
  return { today, start, end };
}
export function recurrenceSlots(series: Pick<RecurrenceSeries, 'frequency' | 'anchorDate' | 'timeZone' | 'materializedThrough'>, clock: Clock) {
  const window = materializationWindow(series.timeZone, series.materializedThrough, clock);
  civilDate(series.anchorDate);
  if (!['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'].includes(series.frequency)) {throw new RecurrenceError('Frequência inválida.');}
  const slots: string[] = [];
  if (series.frequency === 'NONE' || window.start === null) {return { ...window, slots };}
  const start = window.start > series.anchorDate ? window.start : series.anchorDate;
  if (series.frequency === 'MONTHLY') {
    const [ay, am, ad] = civilDate(series.anchorDate), [sy, sm] = civilDate(start), [ey, em] = civilDate(window.end);
    for (let month = sy * 12 + sm - 1; month <= ey * 12 + em - 1; month++) {
      const year = Math.floor(month / 12), m = month % 12 + 1;
      const slot = key(year, m, Math.min(ad, monthLengths(year)[m - 1]));
      if (month >= ay * 12 + am - 1 && slot >= start && slot <= window.end) {slots.push(slot);}
    }
  } else {
    const step = series.frequency === 'WEEKLY' ? 7 : 1;
    const difference = ordinal(start) - ordinal(series.anchorDate);
    let slot = start;
    const remainder = difference % step;
    if (remainder) {
      // No need to construct a date beyond the supported window.
      if (ordinal(window.end) - ordinal(start) < step - remainder) {return { ...window, slots };}
      slot = addCivilDays(start, step - remainder);
    }
    while (slot <= window.end) {
      slots.push(slot);
      if (ordinal(window.end) - ordinal(slot) < step) {break;}
      slot = addCivilDays(slot, step);
    }
  }
  return { ...window, slots };
}
