import { normalizeOffsets, resolveTaskInstant } from '../domain/reminders';
import type { Reminder as StoredReminder } from '../domain/reminders';

export type Reminder = StoredReminder & { readonly triggerAt: string };
export type ApiReminder = Reminder;
export type ReminderInput = { offsetMinutes: number };
// Temporary boundary for the unchanged NewTaskScreen, removed by T10.
export type VisualReminderDraft = string[];

export function validateReminderTimeZone(zone: string): string {
  resolveTaskInstant('2026-01-15', '12:00', zone);
  return zone;
}

export function deviceReminderTimeZone(): string {
  return validateReminderTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

export function reminderInputs(items: readonly ReminderInput[] | VisualReminderDraft): ReminderInput[] | undefined {
  if (items.length && items.every(item => typeof item === 'string')) {return undefined;}
  const offsets = normalizeOffsets(items.map(item => {
    if (!item || typeof item !== 'object' || typeof item.offsetMinutes !== 'number') {throw new Error('Lembretes inválidos.');}
    return item.offsetMinutes;
  }));
  return offsets.map(offsetMinutes => ({ offsetMinutes }));
}

export function canonicalReminders(value: unknown, taskId: string): Reminder[] {
  if (!Array.isArray(value)) {throw new Error('Coleção de lembretes inválida.');}
  const items = value as Reminder[];
  normalizeOffsets(items.map(item => item?.offsetMinutes));
  if (items.some(item => !item || typeof item.id !== 'string' || !item.id || item.taskId !== taskId ||
    ![item.createdAt, item.updatedAt, item.triggerAt].every(stamp => typeof stamp === 'string' && Number.isFinite(Date.parse(stamp))))) {
    throw new Error('Identidade ou timestamps de lembrete inválidos.');
  }
  if (new Set(items.map(item => item.id)).size !== items.length) {throw new Error('Identidade de lembrete duplicada.');}
  return [...items].sort((a, b) => a.offsetMinutes - b.offsetMinutes);
}

/** Cache labels remain evidence, never configuration or scheduling authority. */
export function normalizeReminderCache<T extends { id: string; reminders?: unknown; legacyReminders?: string[] }>(task: T): Omit<T, 'reminders'> & { reminders: Reminder[]; legacyReminders?: string[] } {
  if (task.legacyReminders !== undefined && (!Array.isArray(task.legacyReminders) || task.legacyReminders.some(item => typeof item !== 'string'))) {
    throw new Error('Evidência legada inválida.');
  }
  const legacy = Array.isArray(task.reminders) && task.reminders.length > 0 && task.reminders.every(item => typeof item === 'string');
  const legacyReminders = [...new Set([...(task.legacyReminders ?? []), ...(legacy ? task.reminders as string[] : [])])];
  return { ...task, reminders: legacy || task.reminders === undefined ? [] : canonicalReminders(task.reminders, task.id),
    ...(legacyReminders.length ? { legacyReminders } : {}) };
}
