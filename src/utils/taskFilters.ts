import type { Priority, Task, TaskStatus } from '../context/TaskContext';
import type { Project } from '../context/ProjectContext';
import { normalizeTaskStatus } from '../models/taskStatus';
import { taskCalendarDay } from './calendar';
import { localDay, periodBounds } from './dashboard';

export type TaskFilters = {
  status: 'all' | TaskStatus;
  priority: 'all' | Priority;
  projectId: string | null; // null = all; empty string = no identity in legacy data.
  period: 'all' | 'today' | 'week' | 'month';
};
export type TaskSorting = {
  criterion:
    | 'none'
    | 'priority'
    | 'dueDate'
    | 'priorityDueDate'
    | 'dueDatePriority';
  priorityDirection: 'asc' | 'desc';
  dueDateDirection: 'asc' | 'desc';
};
export const DEFAULT_FILTERS: TaskFilters = {
  status: 'all',
  priority: 'all',
  projectId: null,
  period: 'all',
};
export const DEFAULT_SORTING: TaskSorting = {
  criterion: 'none',
  priorityDirection: 'desc',
  dueDateDirection: 'asc',
};

export function activeFilterCount(filters: TaskFilters): number {
  return (
    Number(filters.status !== 'all') +
    Number(filters.priority !== 'all') +
    Number(filters.projectId !== null) +
    Number(filters.period !== 'all')
  );
}

// Keep unresolved IDs selectable without importing or reconciling projects (#12).
export function taskProjectOptions(
  projects: readonly Project[],
  tasks: readonly Task[],
) {
  const options = projects.map(project => ({
    id: project.id,
    name: project.name,
  }));
  const known = new Set(
    projects.flatMap(project => [project.id, project.remoteId]),
  );
  tasks.forEach(task => {
    if (task.projectId && !known.has(task.projectId)) {
      known.add(task.projectId);
      options.push({
        id: task.projectId,
        name: task.project || 'Projeto indisponível',
      });
    }
  });
  return options;
}

export function filterTasks(
  tasks: readonly Task[],
  filters: TaskFilters,
  projects: readonly Project[],
  now: Date,
): Task[] {
  const selected = projects.find(
    project =>
      project.id === filters.projectId ||
      project.remoteId === filters.projectId,
  );
  const bounds =
    filters.period === 'all' ? undefined : periodBounds(filters.period, now);
  return tasks.filter(task => {
    const status = task.status
      ? normalizeTaskStatus(task.status)
      : task.done
      ? 'completed'
      : 'todo';
    if (filters.status !== 'all' && status !== filters.status) {
      return false;
    }
    if (filters.priority !== 'all' && task.priority !== filters.priority) {
      return false;
    }
    if (filters.projectId !== null) {
      if (filters.projectId === '') {
        if (task.projectId) {
          return false;
        }
      } else if (
        !task.projectId ||
        (selected
          ? task.projectId !== selected.id &&
            task.projectId !== selected.remoteId
          : task.projectId !== filters.projectId)
      ) {
        return false;
      }
    }
    const day = taskCalendarDay(task);
    return !bounds || (!!day && day >= bounds.start && day <= bounds.end);
  });
}

const priorityRank: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

export function sortTasks(
  tasks: readonly Task[],
  sorting: TaskSorting,
): Task[] {
  const priority = (a: Task, b: Task) => {
    const left = priorityRank[a.priority],
      right = priorityRank[b.priority];
    if (left === undefined) {
      return right === undefined ? 0 : 1;
    }
    if (right === undefined) {
      return -1;
    }
    return (left - right) * (sorting.priorityDirection === 'asc' ? 1 : -1);
  };
  const dueDate = (a: Task, b: Task) => {
    const left = localDay(a.dueDate),
      right = localDay(b.dueDate);
    // Missing/invalid deadlines remain last in either direction; no invented deadline.
    if (!left) {
      return right ? 1 : 0;
    }
    if (!right) {
      return -1;
    }
    return (
      left.localeCompare(right) * (sorting.dueDateDirection === 'asc' ? 1 : -1)
    );
  };
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      let comparison = 0;
      switch (sorting.criterion) {
        case 'priority':
          comparison = priority(a.task, b.task);
          break;
        case 'dueDate':
          comparison = dueDate(a.task, b.task);
          break;
        case 'priorityDueDate':
          comparison = priority(a.task, b.task) || dueDate(a.task, b.task);
          break;
        case 'dueDatePriority':
          comparison = dueDate(a.task, b.task) || priority(a.task, b.task);
          break;
      }
      return comparison || a.index - b.index;
    })
    .map(item => item.task);
}
