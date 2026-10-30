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
export { RecurrenceError, civilDate, addCivilDays, civilDuration, occurrenceDates } from './calendar.js';
import { RecurrenceError, civilDate, addCivilDays, key, ordinal, monthLengths, civilReferenceDay } from './calendar.js';
export function validateRecurrenceTimeZone(zone: string): string {
  resolveTaskInstant('2026-01-15', '12:00', zone);
  return zone;
}
export function referenceDay(timeZone: string, clock: Clock): string {
  validateRecurrenceTimeZone(timeZone);
  return civilReferenceDay(timeZone, clock);
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
