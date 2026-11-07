import type { TaskFilters } from '../utils/taskFilters';

export type SavedTaskFilter = {
  id: string;
  name: string;
  filters: TaskFilters;
  createdAt: string;
  updatedAt: string;
};
export const SAVED_FILTER_NAME_LIMIT = 80;
export function copyTaskFilters(value: TaskFilters): TaskFilters {
  return {
    status: value.status,
    priority: value.priority,
    projectId: value.projectId,
    period: value.period,
  };
}
export function validTaskFilters(value: unknown): value is TaskFilters {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    Object.keys(item).length === 4 &&
    typeof item.status === 'string' &&
    typeof item.priority === 'string' &&
    typeof item.period === 'string' &&
    ['all', 'todo', 'in_progress', 'completed'].includes(String(item.status)) &&
    ['all', 'low', 'medium', 'high'].includes(String(item.priority)) &&
    (item.projectId === null || typeof item.projectId === 'string') &&
    ['all', 'today', 'week', 'month'].includes(String(item.period))
  );
}
