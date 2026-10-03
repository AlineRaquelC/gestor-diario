import type { Task, Priority, TaskStatus } from '../context/TaskContext';
import type { Project } from '../context/ProjectContext';
import { apiRequest, ApiError } from './api';

export type NewTask = Omit<Task, 'id'> & { projectId: string; startDate: string; dueDate: string };
export type ApiTask = {
  id: string; title: string; description: string | null; projectId: string;
  startDate: string; dueDate: string; time: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH'; status: 'PENDING' | 'PARTIAL' | 'COMPLETED';
  done: boolean; progress: number; favorite: boolean;
  createdAt: string; updatedAt: string; deletedAt: string | null; undoUntil: string | null;
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

export function fromApiTask(task: ApiTask, draft: NewTask): Task {
  return {
    id: task.id, title: task.title, description: task.description ?? undefined,
    project: draft.project, projectId: task.projectId, time: task.time ?? undefined,
    priority: mobilePriority[task.priority], status: mobileStatus[task.status], done: task.done,
    startDate: mobileDate(task.startDate), dueDate: mobileDate(task.dueDate),
    createdAt: task.createdAt, updatedAt: task.updatedAt,
    // These fields are local-only until their dedicated Issues.
    subtasks: draft.subtasks, reminders: draft.reminders,
  };
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
