import type {Task} from '../context/TaskContext';
import type {Project} from '../context/ProjectContext';

export type DashboardPeriod = 'today' | 'week' | 'month';

// Calendar strings are local dates, never UTC instants.
export function localDay(value?: string): string | undefined {
  if (!value) {return undefined;}
  let date: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {return undefined;}
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) {return undefined;}
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const dayKey = (date: Date) => localDay(date.toISOString())!;

export function periodBounds(period: DashboardPeriod, now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  if (period === 'week') {
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 6);
  } else if (period === 'month') {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  }
  return {start: dayKey(start), end: dayKey(end)};
}

export function isCompleted(task: Task): boolean {
  return task.status ? task.status === 'completed' : task.done === true;
}

export function isOverdue(task: Task, now: Date): boolean {
  const due = localDay(task.dueDate);
  return !isCompleted(task) && !!due && due < dayKey(now);
}

export function percentage(completed: number, total: number): number {
  return total > 0 ? Math.round(completed / total * 100) : 0;
}

export function dashboardMetrics(tasks: Task[], period: DashboardPeriod, now: Date) {
  const {start, end} = periodBounds(period, now);
  const selected = tasks.filter(task => {
    const date = localDay(task.dueDate) ?? localDay(task.startDate);
    return !!date && date >= start && date <= end;
  });
  const completed = selected.filter(isCompleted).length;
  return {total: selected.length, completed, pending: selected.length - completed,
    progress: percentage(completed, selected.length),
    overdue: tasks.filter(task => isOverdue(task, now)).length};
}

export function projectMetrics(projects: Project[], tasks: Task[]) {
  return projects.map(project => {
    const linked = tasks.filter(task => !!task.projectId &&
      (task.projectId === project.id || task.projectId === project.remoteId));
    const completed = linked.filter(isCompleted).length;
    return {...project, total: linked.length, completed, progress: percentage(completed, linked.length)};
  });
}

export function greeting(now: Date): string {
  const hour = now.getHours();
  return hour >= 5 && hour < 12 ? 'Bom dia!' : hour >= 12 && hour < 18 ? 'Boa tarde!' : 'Boa noite!';
}

export function dashboardDate(now: Date): string {
  const label = now.toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long'});
  return label.charAt(0).toUpperCase() + label.slice(1);
}
