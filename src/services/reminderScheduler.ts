import AsyncStorage from '@react-native-async-storage/async-storage';
import native from '../../specs/NativeTaskReminders';
import { resolveReminderSchedule } from '../domain/reminders';
import type { Task } from '../context/TaskContext';

export const REMINDER_JOURNAL_KEY = '@taskflow:reminder-journal:v1';
export type SchedulingState = 'not_required' | 'scheduled' | 'pending' | 'unavailable' | 'error';
export type SchedulingResult = { state: SchedulingState; message?: string };
type Intent = { taskId: string; reminderId: string; notificationId: string; signature: string; triggerAt: number;
  state: 'pending' | 'scheduled' | 'cancel_pending' | 'unavailable' | 'error'; error?: string };
type Journal = { version: 1; entries: Record<string, Intent>; suspended: string[] };
type NativeState = { usable: boolean; records: { notificationId: string; triggerAt: number }[] };
export type ReminderNative = {
  schedule(id: string, triggerAt: number): Promise<string>;
  cancel(id: string): Promise<string>;
  getScheduled(): Promise<string>;
};
type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;
export const notificationId = (taskId: string, reminderId: string) => `task-reminder:${taskId}:${reminderId}`;
const owned = (id: string) => /^task-reminder:[^:]+:[^:]+$/.test(id);
const message = 'Tarefa salva, mas o lembrete não foi agendado neste aparelho.';

export function schedulingFingerprint(task: Task) {
  return JSON.stringify([task.remoteId ?? task.id, !!task.deletedAt, task.status === 'completed' || task.done,
    task.dueDateKey ?? task.dueDate, task.time, task.reminderTimeZone, !!task.remindersConfirmed,
    [...(task.reminders ?? [])].sort((a, b) => a.offsetMinutes - b.offsetMinutes).map(item => [item.id, item.taskId, item.offsetMinutes])]);
}

/** Serialized, durable intent -> native mutation -> native inspection -> confirmation.
 * API operations never run here. Missing tasks only cancel under a complete remote snapshot.
 */
export class ReminderScheduler {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly bridge: ReminderNative | null, private readonly storage: Storage,
    private readonly now: () => number = Date.now) {}

  private enqueue(operation: () => Promise<SchedulingResult>): Promise<SchedulingResult> {
    const result = this.queue.catch(() => undefined).then(operation).catch(error => ({ state: 'error' as const,
      message: `${message} ${String(error instanceof Error ? error.message : error)}` }));
    this.queue = result;
    return result;
  }
  private async read(): Promise<Journal> {
    const raw = await this.storage.getItem(REMINDER_JOURNAL_KEY);
    if (!raw) {return { version: 1, entries: {}, suspended: [] };}
    const value = JSON.parse(raw) as Journal;
    if (value.version !== 1 || !value.entries || Array.isArray(value.entries) || !Array.isArray(value.suspended) ||
      value.suspended.some(id => typeof id !== 'string') || Object.entries(value.entries).some(([id, entry]) =>
        !entry || !owned(id) || entry.notificationId !== id || id !== notificationId(entry.taskId, entry.reminderId) ||
        !Number.isFinite(entry.triggerAt) || typeof entry.signature !== 'string' ||
        !['pending', 'scheduled', 'cancel_pending', 'unavailable', 'error'].includes(entry.state))) {
      throw new Error('Journal inválido; registro original preservado.');
    }
    return value;
  }
  private save(journal: Journal) {return this.storage.setItem(REMINDER_JOURNAL_KEY, JSON.stringify(journal));}
  private async inspect(): Promise<NativeState> {
    if (!this.bridge) {throw new Error('Adaptador Android indisponível.');}
    const state = JSON.parse(await this.bridge.getScheduled()) as NativeState;
    if (typeof state.usable !== 'boolean' || !Array.isArray(state.records) || state.records.some(record =>
      !owned(record.notificationId) || !Number.isFinite(record.triggerAt))) {throw new Error('Estado nativo inválido.');}
    return state;
  }

  reconcile(tasks: Task[], complete = false) {
    return this.enqueue(async () => {
      const journal = await this.read();
      const ids = new Set(tasks.filter(task => task.remindersConfirmed).map(task => task.remoteId ?? task.id));
      journal.suspended = complete ? [] : journal.suspended.filter(id => !ids.has(id));
      const desired = this.desired(tasks, journal.suspended);
      for (const [id, entry] of Object.entries(journal.entries)) {
        if ((complete || ids.has(entry.taskId)) && !desired[id]) {entry.state = 'cancel_pending';}
      }
      for (const [id, intent] of Object.entries(desired)) {
        const previous = journal.entries[id];
        journal.entries[id] = previous?.signature === intent.signature && previous.state !== 'cancel_pending' ? previous : intent;
      }
      // This write precedes every native mutation and preserves deletions across crashes.
      await this.save(journal);
      return this.apply(journal, ids, complete);
    });
  }

  /** Provisional durable suppression before DELETE / explicit completion. */
  suspend(task: Task) {
    return this.enqueue(async () => {
      const journal = await this.read();
      const taskId = task.remoteId ?? task.id;
      if (!journal.suspended.includes(taskId)) {journal.suspended.push(taskId);}
      for (const [id, intent] of Object.entries(this.desired([task], []))) {
        journal.entries[id] = { ...intent, state: 'cancel_pending' };
      }
      for (const entry of Object.values(journal.entries)) {
        if (entry.taskId === taskId) {entry.state = 'cancel_pending';}
      }
      await this.save(journal);
      return this.apply(journal, new Set([taskId]), false);
    });
  }

  /** Offline retry uses durable intent only; provisional suppression stays suppressed. */
  retry() {return this.enqueue(async () => this.apply(await this.read(), new Set(), false));}

  private desired(tasks: Task[], suspended: string[]) {
    const desired: Record<string, Intent> = {};
    for (const task of tasks) {
      if (!task.remindersConfirmed || !task.remoteId || task.remoteId !== task.id || task.deletedAt ||
        task.done || task.status === 'completed' || suspended.includes(task.id)) {continue;}
      for (const reminder of task.reminders ?? []) {
        if (reminder.taskId !== task.id || !reminder.id || !task.dueDateKey) {throw new Error('Configuração não confirmada.');}
        const schedule = resolveReminderSchedule(task.dueDateKey, task.time ?? '', task.reminderTimeZone ?? '', reminder.offsetMinutes, this.now);
        if (schedule.expired) {continue;}
        if (Date.parse(reminder.triggerAt) !== schedule.triggerAt) {throw new Error('Regras temporais divergentes da API.');}
        const id = notificationId(task.id, reminder.id);
        if (!owned(id)) {throw new Error('Identidade de lembrete inválida.');}
        desired[id] = { taskId: task.id, reminderId: reminder.id, notificationId: id,
          signature: JSON.stringify([task.dueDateKey, task.time, task.reminderTimeZone, reminder.offsetMinutes, schedule.triggerAt]),
          triggerAt: schedule.triggerAt, state: 'pending' };
      }
    }
    return desired;
  }

  private async apply(journal: Journal, scope: Set<string>, complete: boolean): Promise<SchedulingResult> {
    if (!this.bridge) {
      if (!Object.keys(journal.entries).length) {return { state: 'not_required' };}
      return { state: 'unavailable', message };
    }
    let nativeState = await this.inspect();
    // Adopt orphaned native records for cancellation only with authoritative scope.
    for (const record of nativeState.records) {
      const [, taskId, reminderId] = record.notificationId.split(':');
      if (!journal.entries[record.notificationId] && (complete || scope.has(taskId) || journal.suspended.includes(taskId))) {
        journal.entries[record.notificationId] = { ...record, taskId, reminderId, signature: '', state: 'cancel_pending' };
      }
    }
    for (const entry of Object.values(journal.entries)) {
      if (entry.triggerAt <= this.now() || journal.suspended.includes(entry.taskId)) {entry.state = 'cancel_pending';}
    }
    await this.save(journal);
    const relevant = (entry: Intent) => complete || scope.size === 0 || scope.has(entry.taskId);
    // Complete every cancellation before scheduling replacements. Failure stops the batch.
    for (const [id, entry] of Object.entries(journal.entries).filter(([, candidate]) => relevant(candidate))) {
      const record = nativeState.records.find(item => item.notificationId === id);
      if (entry.state === 'cancel_pending' || (record && record.triggerAt !== entry.triggerAt)) {
        try {
          await this.bridge.cancel(id);
          nativeState = await this.inspect();
          if (nativeState.records.some(item => item.notificationId === id)) {throw new Error('Cancelamento não confirmado.');}
          if (entry.state === 'cancel_pending') {delete journal.entries[id];}
          else {entry.state = 'pending';}
          await this.save(journal);
        } catch (error) {
          entry.error = String(error); await this.save(journal);
          return { state: 'error', message: `Cancelamento pendente neste aparelho. ${String(error)}` };
        }
      }
    }
    let unavailable = false;
    for (const [id, entry] of Object.entries(journal.entries).filter(([, candidate]) => relevant(candidate))) {
      if (!nativeState.usable) {entry.state = 'unavailable'; unavailable = true; continue;}
      if (nativeState.records.some(item => item.notificationId === id && item.triggerAt === entry.triggerAt)) {
        entry.state = 'scheduled'; delete entry.error; continue;
      }
      // Recheck at the last possible JS boundary before crossing into Android.
      if (entry.triggerAt <= this.now()) {delete journal.entries[id]; continue;}
      entry.state = 'pending'; await this.save(journal);
      if (entry.triggerAt <= this.now()) {delete journal.entries[id]; continue;}
      try {
        await this.bridge.schedule(id, entry.triggerAt);
        nativeState = await this.inspect();
        if (!nativeState.records.some(item => item.notificationId === id && item.triggerAt === entry.triggerAt)) {
          throw new Error('Agendamento não confirmado.');
        }
        entry.state = 'scheduled'; delete entry.error;
      } catch (error) {
        entry.state = 'error'; entry.error = String(error); await this.save(journal);
        return { state: 'error', message };
      }
    }
    await this.save(journal);
    return unavailable ? { state: 'unavailable', message } :
      { state: Object.values(journal.entries).some(relevant) ? 'scheduled' : 'not_required' };
  }
}

export const reminderScheduler = new ReminderScheduler(native ?? null, AsyncStorage);
