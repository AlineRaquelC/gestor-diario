import {
  civilDate,
  civilReferenceDay,
} from '../../backend/src/domain/recurrence/calendar';
import { resolveTaskInstant } from '../domain/reminders';
export function validateRecurrenceTimeZone(zone: string): string {
  resolveTaskInstant('2026-01-15', '12:00', zone);
  return zone;
}
export function referenceDay(timeZone: string, clock: () => number): string {
  validateRecurrenceTimeZone(timeZone);
  return civilReferenceDay(timeZone, clock);
}
import type {
  RecurrenceFrequency,
  RecurrenceSeries,
} from '../../backend/src/domain/recurrence';
export type { RecurrenceFrequency, RecurrenceSeries };
export type RecurrenceSeriesSummary = Pick<
  RecurrenceSeries,
  'frequency' | 'timeZone' | 'anchorDate' | 'materializedThrough' | 'updatedAt'
>;
export type RecurrenceInput = {
  frequency: RecurrenceFrequency;
  timeZone: string;
};
export type RecurrenceFields = {
  recurrenceSeriesId?: string | null;
  occurrenceKey?: string | null;
  recurrence?: RecurrenceSeriesSummary | null;
};
export const RECURRENCE_OPTIONS: readonly {
  value: RecurrenceFrequency;
  label: string;
}[] = [
  { value: 'NONE', label: 'Não repetir' },
  { value: 'DAILY', label: 'Diariamente' },
  { value: 'WEEKLY', label: 'Semanalmente' },
  { value: 'MONTHLY', label: 'Mensalmente' },
];
export const RECURRENCE_SCOPE =
  'A nova regra será aplicada apenas às próximas ocorrências ainda não criadas.';
export function recurrenceLabel(frequency: RecurrenceFrequency) {
  return (
    RECURRENCE_OPTIONS.find(item => item.value === frequency)?.label ??
    'Não repetir'
  );
}
export function deviceRecurrenceTimeZone() {
  return validateRecurrenceTimeZone(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
}
export function recurrenceSummary(
  series: RecurrenceSeriesSummary,
): RecurrenceSeriesSummary {
  if (
    !series ||
    !RECURRENCE_OPTIONS.some(item => item.value === series.frequency) ||
    !Number.isFinite(Date.parse(series.updatedAt))
  ) {
    throw new Error('Resumo de recorrência inválido.');
  }
  validateRecurrenceTimeZone(series.timeZone);
  civilDate(series.anchorDate);
  if (series.materializedThrough !== null) {
    civilDate(series.materializedThrough);
  }
  return {
    frequency: series.frequency,
    timeZone: series.timeZone,
    anchorDate: series.anchorDate,
    materializedThrough: series.materializedThrough,
    updatedAt: series.updatedAt,
  };
}
export function recurrenceFields(
  task: RecurrenceFields,
): Required<RecurrenceFields> {
  if (
    task.recurrenceSeriesId == null &&
    task.occurrenceKey == null &&
    task.recurrence == null
  ) {
    return { recurrenceSeriesId: null, occurrenceKey: null, recurrence: null };
  }
  if (
    typeof task.recurrenceSeriesId !== 'string' ||
    !task.recurrenceSeriesId ||
    typeof task.occurrenceKey !== 'string' ||
    !task.recurrence
  ) {
    throw new Error('Vínculo de ocorrência inválido.');
  }
  civilDate(task.occurrenceKey);
  return {
    recurrenceSeriesId: task.recurrenceSeriesId,
    occurrenceKey: task.occurrenceKey,
    recurrence: recurrenceSummary(task.recurrence),
  };
}
export function normalizeRecurrenceCache<
  T extends RecurrenceFields & { id: string },
>(task: T): T {
  if (
    task.recurrenceSeriesId === undefined &&
    task.occurrenceKey === undefined &&
    task.recurrence === undefined
  ) {
    return task;
  }
  return { ...task, ...recurrenceFields(task) };
}
export function preserveRecurrence<T extends RecurrenceFields>(
  remote: T,
  local?: RecurrenceFields,
): T {
  if (
    local?.recurrenceSeriesId &&
    (remote.recurrenceSeriesId !== local.recurrenceSeriesId ||
      remote.occurrenceKey !== local.occurrenceKey)
  ) {
    throw new Error(
      'A identidade da ocorrência diverge do cache confirmado. Dados preservados.',
    );
  }
  if (
    remote.recurrence &&
    local?.recurrence &&
    remote.recurrenceSeriesId === local.recurrenceSeriesId &&
    Date.parse(remote.recurrence.updatedAt) <
      Date.parse(local.recurrence.updatedAt)
  ) {
    return { ...remote, recurrence: local.recurrence };
  }
  return remote;
}
