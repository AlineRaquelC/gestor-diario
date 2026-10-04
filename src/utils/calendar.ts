import type { Task } from '../context/TaskContext';
import { isCompleted, localDay, periodBounds } from './dashboard';

export const calendarKey = (date: Date): string =>
  localDay(date.toISOString())!;
// Validated calendar keys are local dates, never UTC instants.
export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}
export function monthGrid(date: Date): (string | null)[] {
  const year = date.getFullYear(),
    month = date.getMonth();
  const offset = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from(
    { length: Math.ceil((offset + count) / 7) * 7 },
    (_, index) => {
      const day = index - offset + 1;
      return day >= 1 && day <= count
        ? calendarKey(new Date(year, month, day))
        : null;
    },
  );
}
export function shiftMonth(date: Date, amount: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(date.getDate(), last));
  return first;
}
export function shiftDay(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}
export function weekDays(date: Date): string[] {
  const start = dateFromKey(periodBounds('week', date).start);
  return Array.from({ length: 7 }, (_, index) =>
    calendarKey(shiftDay(start, index)),
  );
}
export function taskCalendarDay(task: Task): string | undefined {
  return localDay(task.dueDate) ?? localDay(task.startDate);
}
export function validTime(time?: string): string | undefined {
  return time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : undefined;
}
export function tasksForDay(tasks: Task[], key: string): Task[] {
  return tasks
    .filter(task => taskCalendarDay(task) === key)
    .sort((a, b) =>
      (validTime(a.time) ?? '99:99').localeCompare(
        validTime(b.time) ?? '99:99',
      ),
    );
}
export function taskCountsByDay(tasks: Task[]): Record<string, number> {
  const counts: Record<string, number> = {};
  tasks.forEach(task => {
    const key = taskCalendarDay(task);
    if (key) {
      counts[key] = (counts[key] ?? 0) + 1;
    }
  });
  return counts;
}
export type DayGroup = 'Manhã' | 'Tarde' | 'Noite' | 'Sem horário';
export function timeGroup(task: Task): DayGroup {
  const time = validTime(task.time);
  if (!time) {
    return 'Sem horário';
  }
  const hour = Number(time.slice(0, 2));
  return hour >= 5 && hour < 12
    ? 'Manhã'
    : hour >= 12 && hour < 18
    ? 'Tarde'
    : 'Noite';
}
export function groupDayTasks(
  tasks: Task[],
): { label: DayGroup; tasks: Task[] }[] {
  return (['Manhã', 'Tarde', 'Noite', 'Sem horário'] as const).map(label => ({
    label,
    tasks: tasks.filter(task => timeGroup(task) === label),
  }));
}
// Three days is an MVP convention, not an extra official requirement.
export function isDueSoon(task: Task, now: Date): boolean {
  const due = localDay(task.dueDate);
  return (
    !isCompleted(task) &&
    !!due &&
    due >= calendarKey(now) &&
    due <= calendarKey(shiftDay(now, 3))
  );
}
