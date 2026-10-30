import { recurrenceFields } from '../models/recurrence';
import type { RecurrenceFields, RecurrenceInput } from '../models/recurrence';
import { civilDate, civilDuration } from '../../backend/src/domain/recurrence/calendar';
import { referenceDay, validateRecurrenceTimeZone } from '../models/recurrence';
import { resolveTaskInstant } from '../domain/reminders';
import { durableRecurrenceRequest, checkedSeries } from './recurrenceService';
import type { SeriesCreationResult } from './recurrenceService';
import { canonicalReminders, reminderInputs, validateReminderTimeZone } from '../models/reminder';
import { validateReminderChange } from '../domain/reminders';
import type { ApiReminder, ReminderInput, VisualReminderDraft } from '../models/reminder';
import type { Task, Priority, TaskStatus, Subtask } from '../context/TaskContext';
import type { Project } from '../context/ProjectContext';
import { apiRequest, ApiError } from './api';
import type { LegacyTaskStatus } from '../models/taskStatus';

export type NewTask = Omit<Task, 'id' | 'status' | 'reminders' | keyof RecurrenceFields> & { status: LegacyTaskStatus; recurrenceInput?: RecurrenceInput; recurrenceRequestId?: string; reminders?: ReminderInput[] | VisualReminderDraft; projectId: string; startDate: string; dueDate: string };
export type TaskUpdate = Omit<Partial<Task>, 'status' | 'reminders' | keyof RecurrenceFields> & { status?: LegacyTaskStatus; reminders?: ReminderInput[] };
export type TaskHistoryEvent = {
  id: string; taskId: string;
  action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'COMPLETED' | 'REOPENED' | 'DELETE' | 'RESTORE' | 'DELETED' | 'RESTORED';
  metadata: Record<string, unknown> | null; createdAt: string;
};
export type ApiTask = RecurrenceFields & {
  clientId?: string | null;
  id: string; title: string; description: string | null; projectId: string;
  startDate: string; dueDate: string; time: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH'; status: 'PENDING' | 'PARTIAL' | 'COMPLETED';
  done: boolean; progress: number; favorite: boolean;
  createdAt: string; updatedAt: string; deletedAt: string | null; undoUntil: string | null;
  project?: { id: string; name: string; color: string; icon: string } | null;
  reminderTimeZone?: string | null;
  reminders?: ApiReminder[];
  subtasks?: Subtask[];
};
const priorities = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH' } as const;
const statuses = { todo: 'PENDING', in_progress: 'PARTIAL', review: 'PARTIAL', completed: 'COMPLETED' } as const;
const mobilePriority: Record<ApiTask['priority'], Priority> = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' };
const mobileStatus: Record<ApiTask['status'], TaskStatus> = { PENDING: 'todo', PARTIAL: 'in_progress', COMPLETED: 'completed' };

export function calendarDate(value: string) {
  // Mobile stores ISO instants. Preserve the calendar day in the device timezone.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {return value;}
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {throw new Error('Data inválida.');}
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mobileDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toISOString();
}

type CachedTask = Pick<Partial<Task>, 'project' | 'subtasks' | 'legacyReminders' | 'dueDate' | 'dueDateKey' | 'time' | 'reminderTimeZone'> & { reminders?: unknown };

function reminderPayload(input: { reminders?: ReminderInput[] | VisualReminderDraft; reminderTimeZone?: string | null }) {
  if (input.reminderTimeZone != null) {validateReminderTimeZone(input.reminderTimeZone);}
  const reminders = input.reminders === undefined ? undefined : reminderInputs(input.reminders);
  return { ...(reminders !== undefined ? { reminders } : {}),
    ...(input.reminderTimeZone !== undefined && !(input.reminders?.length && reminders === undefined)
      ? { reminderTimeZone: input.reminderTimeZone } : {}) };
}

export function toApiTask(input: NewTask, projectId: string) {
  return {
    title: input.title, description: input.description, projectId,
    startDate: input.startDateKey ?? calendarDate(input.startDate), dueDate: input.dueDateKey ?? calendarDate(input.dueDate),
    time: input.time || undefined, priority: priorities[input.priority], status: statuses[input.status],
    ...reminderPayload(input),
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(input.subtasks?.length ? { subtasks: input.subtasks.map(child => ({ title: child.title })) } : {}),
  };
}

export function fromApiTask(task: ApiTask, draft?: CachedTask): Task {
  return {
    ...recurrenceFields(task),
    id: task.id, remoteId: task.id, clientId: task.clientId ?? undefined, deletedAt: task.deletedAt, title: task.title, description: task.description ?? undefined,
    project: task.project?.name ?? draft?.project ?? 'Projeto indisponível',
    projectId: task.projectId, time: task.time ?? undefined,
    priority: mobilePriority[task.priority], status: mobileStatus[task.status], done: task.done,
    startDate: mobileDate(task.startDate), dueDate: mobileDate(task.dueDate),
    createdAt: task.createdAt, updatedAt: task.updatedAt,
    progress: task.progress,
    subtasks: mergeSubtasks(task.subtasks?.map(({ id, title, done }) => ({ id, title, done, remote: true })), draft?.subtasks),
    dueDateKey: task.dueDate, startDateKey: task.startDate,
    reminderTimeZone: task.reminderTimeZone ?? null,
    reminders: canonicalReminders(task.reminders ?? [], task.id),
    remindersConfirmed: true,
    ...(draft ? { legacyReminders: [...new Set([...(draft.legacyReminders ?? []), ...(Array.isArray(draft.reminders) && draft.reminders.every(item => typeof item === 'string') ? draft.reminders as string[] : [])])] } : {}),
  };
}

export function mergeSubtasks(remote: Subtask[] | undefined, cached: Subtask[] | undefined) {
  if (remote === undefined) {return cached;}
  const confirmed = new Map(remote.map(child => [child.id, child]));
  for (const child of cached ?? []) {
    if (!child.remote && !confirmed.has(child.id)) {confirmed.set(child.id, child);}
  }
  return [...confirmed.values()];
}
const subtaskPath = (taskId: string, subtaskId?: string) => `/tasks/${encodeURIComponent(taskId)}/subtasks${subtaskId === undefined ? '' : '/' + encodeURIComponent(subtaskId)}`;
async function subtaskRequest(path: string, method: string, payload?: unknown): Promise<Task> {
  const result = await apiRequest<{ task: ApiTask }>(path, method, payload);
  return fromApiTask(result.task);
}
export const createSubtask = (taskId: string, title: string) => subtaskRequest(subtaskPath(taskId), 'POST', { title });
export const updateSubtask = (taskId: string, id: string, changes: { title?: string; done?: boolean }) => subtaskRequest(subtaskPath(taskId, id), 'PATCH', changes);
export const deleteSubtask = (taskId: string, id: string) => subtaskRequest(subtaskPath(taskId, id), 'DELETE');

export async function getTasks(): Promise<Task[]> {
  const response = await apiRequest<ApiTask[]>('/tasks');
  return response.map(task => fromApiTask(task));
}

export async function getTaskById(id: string): Promise<Task> {
  return fromApiTask(await apiRequest<ApiTask>(`/tasks/${encodeURIComponent(id)}`));
}

export function toApiTaskUpdate(input: TaskUpdate) {
  return {
    ...reminderPayload(input),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
    ...(input.startDate !== undefined ? { startDate: input.startDateKey ?? calendarDate(input.startDate) } : {}),
    ...(input.dueDate !== undefined ? { dueDate: input.dueDateKey ?? calendarDate(input.dueDate) } : {}),
    ...(input.time !== undefined ? { time: input.time || null } : {}),
    ...(input.priority !== undefined ? { priority: priorities[input.priority] } : {}),
    ...(input.status !== undefined ? { status: statuses[input.status] } : {}),
  };
}

export async function updateTask(id: string, input: TaskUpdate, local?: CachedTask): Promise<Task> {
  const payload = toApiTaskUpdate(input);
  if (local?.dueDateKey) {
    const previous = Array.isArray(local.reminders) && local.reminders.every(item => typeof item === 'object')
      ? canonicalReminders(local.reminders, id) : [];
    validateReminderChange({ dueDate: payload.dueDate ?? local.dueDateKey, time: input.time ?? local.time ?? '',
      timeZone: input.reminderTimeZone === undefined ? local.reminderTimeZone ?? '' : input.reminderTimeZone ?? '',
      offsets: (input.reminders ?? previous).map(item => item.offsetMinutes) },
      { dueDate: local.dueDateKey, time: local.time ?? '', timeZone: local.reminderTimeZone ?? '',
        offsets: previous.map(item => item.offsetMinutes) }, Date.now);
  }
  const response = await apiRequest<ApiTask>(`/tasks/${encodeURIComponent(id)}`, 'PATCH', payload);
  return fromApiTask(response, local);
}

export async function getTaskHistory(id: string): Promise<TaskHistoryEvent[]> {
  return apiRequest<TaskHistoryEvent[]>(`/tasks/${encodeURIComponent(id)}/history`);
}

export async function resolveProject(project: Project): Promise<string> {
  if (project.remoteId) {return project.remoteId;}
  try {
    const existing = await apiRequest<{ id: string }>(`/projects/${encodeURIComponent(project.id)}`);
    return existing.id;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {throw error;}
  }
  // Provision only the selected project; no general synchronization or name matching.
  const created = await apiRequest<{ id: string }>('/projects', 'POST', {
    name: project.name, description: project.description, color: project.color, icon: project.icon,
  });
  return created.id;
}

export function recurrenceCreationPayload(input: NewTask, projectId: string) {
  const recurrence = input.recurrenceInput;
  if (!recurrence || !['DAILY', 'WEEKLY', 'MONTHLY'].includes(recurrence.frequency)) {throw new Error('Frequência de recorrência inválida.');}
  validateRecurrenceTimeZone(recurrence.timeZone);
  const task = toApiTask(input, projectId);
  civilDate(task.startDate); civilDate(task.dueDate);
  if (input.reminders?.length && task.reminders === undefined) {throw new Error('Use offsets canônicos para os lembretes da série.');}
  if (task.reminders?.length && task.reminderTimeZone !== recurrence.timeZone) {throw new Error('A série e seus lembretes devem usar o mesmo fuso.');}
  if (task.status !== 'PENDING') {throw new Error('A primeira ocorrência deve iniciar com status A fazer.');}
  return { frequency: recurrence.frequency, timeZone: recurrence.timeZone, anchorDate: task.dueDate,
    template: { title: task.title, description: task.description || null, projectId,
      priority: task.priority, time: task.time || null, startOffsetDays: civilDuration(task.startDate, task.dueDate),
      subtasks: task.subtasks ?? [], reminders: task.reminders ?? [] } };
}
export function validateNewRecurrence(input: NewTask, projectId: string, checkFuture = true) {
  const payload = recurrenceCreationPayload(input, projectId);
  if (checkFuture) {
    const now = Date.now();
    if (calendarDate(input.startDate) < referenceDay(payload.timeZone, () => now)) {throw new Error('A data de início não pode ser anterior à data atual.');}
    if (payload.template.time && resolveTaskInstant(payload.anchorDate, payload.template.time, payload.timeZone) <= now) {
      throw new Error('O horário da tarefa já passou. Escolha um horário futuro.');
    }
    validateReminderChange({ dueDate: payload.anchorDate, time: payload.template.time ?? '', timeZone: payload.timeZone,
      offsets: payload.template.reminders.map(item => item.offsetMinutes) }, undefined, () => now);
  }
  return payload;
}
export async function createTask(input: NewTask, projectId: string): Promise<Task> {
  if (input.recurrenceInput && input.recurrenceInput.frequency !== 'NONE') {
    const payload = validateNewRecurrence(input, projectId, false);
    return durableRecurrenceRequest(input.recurrenceRequestId ?? '', { path: '/recurrence-series', ...payload }, async (clientId, retry) => {
      if (!retry) {
        try {validateNewRecurrence(input, projectId);} catch (error) {throw new ApiError((error as Error).message, 400, 'VALIDATION_ERROR');}
      }
      const result = await apiRequest<SeriesCreationResult>('/recurrence-series', 'POST', { ...payload, clientId });
      checkedSeries(result.series);
      const confirmed = fromApiTask(result.firstOccurrence, { ...input, subtasks: undefined });
      if (confirmed.recurrenceSeriesId !== result.series.id || confirmed.occurrenceKey !== result.series.firstOccurrenceKey) {throw new Error('Identidade da primeira ocorrência inválida.');}
      return confirmed;
    });
  }

  const payload = toApiTask(input, projectId);
  // A keyed retry may refer to a persisted configuration that has now expired.
  // Only the backend can distinguish that retry from a new keyed creation.
  if (!input.clientId) {
    validateReminderChange({ dueDate: payload.dueDate, time: payload.time ?? '', timeZone: payload.reminderTimeZone ?? '',
      offsets: (payload.reminders ?? []).map(item => item.offsetMinutes) }, undefined, Date.now);
  }
  const response = await apiRequest<ApiTask>('/tasks', 'POST', payload);
  // Draft IDs are temporary. Their confirmed replacements come from SQLite;
  // merging them as local children would duplicate the submitted subtasks.
  return fromApiTask(response, { ...input, subtasks: undefined });
}

export async function deleteTask(id: string) {
  try {
    return await apiRequest<{ id: string; deletedAt: string; updatedAt: string }>(`/tasks/${encodeURIComponent(id)}`, 'DELETE');
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new Error('Tarefa não encontrada no servidor. Ela pode existir apenas neste dispositivo ou já estar excluída. Nenhuma exclusão foi confirmada.');
    }
    throw error;
  }
}

export async function restoreTask(id: string): Promise<Task> {
  return fromApiTask(await apiRequest<ApiTask>(`/tasks/${encodeURIComponent(id)}/restore`, 'POST'));
}

// Only the explicit manual sync asks for tombstones. Ordinary lists stay active.
export async function getTasksForSync(): Promise<Task[]> {
  return (await apiRequest<ApiTask[]>('/tasks?includeDeleted=true')).map(task => fromApiTask(task));
}

export async function importLocalTask(task: Task, projectId: string, clientId: string): Promise<Task> {
  if (task.recurrenceSeriesId || task.occurrenceKey) {throw new Error('Ocorrências são criadas somente pelo backend.');}
  if (!task.startDate || !task.dueDate) {throw new Error('Tarefa legada sem datas válidas; dados preservados.');}
  const input = { ...task, projectId, startDate: task.startDate, dueDate: task.dueDate, subtasks: undefined };
  const response = await apiRequest<ApiTask>('/tasks', 'POST', { ...toApiTask(input, projectId), clientId });
  return fromApiTask(response);
}
