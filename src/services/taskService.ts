import type { Task, Priority, TaskStatus, Subtask } from '../context/TaskContext';
import type { Project } from '../context/ProjectContext';
import { apiRequest, ApiError } from './api';
import type { LegacyTaskStatus } from '../models/taskStatus';

export type NewTask = Omit<Task, 'id' | 'status'> & { status: LegacyTaskStatus; projectId: string; startDate: string; dueDate: string };
export type TaskUpdate = Omit<Partial<Task>, 'status'> & { status?: LegacyTaskStatus };
export type TaskHistoryEvent = {
  id: string; taskId: string;
  action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'COMPLETED' | 'REOPENED';
  metadata: Record<string, unknown> | null; createdAt: string;
};
export type ApiTask = {
  id: string; title: string; description: string | null; projectId: string;
  startDate: string; dueDate: string; time: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH'; status: 'PENDING' | 'PARTIAL' | 'COMPLETED';
  done: boolean; progress: number; favorite: boolean;
  createdAt: string; updatedAt: string; deletedAt: string | null; undoUntil: string | null;
  project?: { id: string; name: string; color: string; icon: string } | null;
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

export function toApiTask(input: NewTask, projectId: string) {
  return {
    title: input.title, description: input.description, projectId,
    startDate: calendarDate(input.startDate), dueDate: calendarDate(input.dueDate),
    time: input.time || undefined, priority: priorities[input.priority], status: statuses[input.status],
  };
}

export function fromApiTask(task: ApiTask, draft?: Pick<Task, 'project' | 'subtasks' | 'reminders'>): Task {
  return {
    id: task.id, title: task.title, description: task.description ?? undefined,
    project: task.project?.name ?? draft?.project ?? 'Projeto indisponível',
    projectId: task.projectId, time: task.time ?? undefined,
    priority: mobilePriority[task.priority], status: mobileStatus[task.status], done: task.done,
    startDate: mobileDate(task.startDate), dueDate: mobileDate(task.dueDate),
    createdAt: task.createdAt, updatedAt: task.updatedAt,
    progress: task.progress,
    subtasks: mergeSubtasks(task.subtasks?.map(({ id, title, done }) => ({ id, title, done, remote: true })), draft?.subtasks),
    reminders: draft?.reminders,
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
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
    ...(input.startDate !== undefined ? { startDate: calendarDate(input.startDate) } : {}),
    ...(input.dueDate !== undefined ? { dueDate: calendarDate(input.dueDate) } : {}),
    ...(input.time !== undefined ? { time: input.time || null } : {}),
    ...(input.priority !== undefined ? { priority: priorities[input.priority] } : {}),
    ...(input.status !== undefined ? { status: statuses[input.status] } : {}),
  };
}

export async function updateTask(id: string, input: TaskUpdate, local?: Pick<Task, 'project' | 'subtasks' | 'reminders'>): Promise<Task> {
  const response = await apiRequest<ApiTask>(`/tasks/${encodeURIComponent(id)}`, 'PATCH', toApiTaskUpdate(input));
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

export async function createTask(input: NewTask, projectId: string): Promise<Task> {
  const response = await apiRequest<ApiTask>('/tasks', 'POST', toApiTask(input, projectId));
  return fromApiTask(response, input);
}
