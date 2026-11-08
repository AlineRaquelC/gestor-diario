import type { Task } from '../context/TaskContext';
import type {
  GoalPeriod,
  ProductivityGoals,
} from '../models/productivityGoals';
import {
  isCompleted,
  isOverdue,
  percentage,
  periodBounds,
  selectPeriodTasks,
} from './dashboard';
import type { DashboardPeriod } from './dashboard';
export const PRODUCTIVITY_PERIODS: readonly {
  value: GoalPeriod;
  label: string;
  title: string;
  dashboard: DashboardPeriod;
}[] = [
  { value: 'daily', label: 'Hoje', title: 'Meta diária', dashboard: 'today' },
  {
    value: 'weekly',
    label: 'Semana',
    title: 'Meta semanal',
    dashboard: 'week',
  },
  { value: 'monthly', label: 'Mês', title: 'Meta mensal', dashboard: 'month' },
];
export function productivityMetrics(
  tasks: readonly Task[],
  period: GoalPeriod,
  goals: ProductivityGoals,
  now: Date,
) {
  const mapped = PRODUCTIVITY_PERIODS.find(
    item => item.value === period,
  )!.dashboard;
  const selected = selectPeriodTasks(tasks, mapped, now);
  const total = selected.length;
  const completed = selected.filter(isCompleted).length;
  const goal = goals[period];
  return {
    period,
    ...periodBounds(mapped, now),
    total,
    completed,
    pending: total - completed,
    overdue: selected.filter(task => isOverdue(task, now)).length,
    taskProgress: percentage(completed, total),
    goal,
    goalProgress:
      goal === null ? null : Math.min(100, percentage(completed, goal)),
    goalReached: goal !== null && completed >= goal,
  };
}
export type ProductivityMetrics = ReturnType<typeof productivityMetrics>;
export function productivityText(metrics: ProductivityMetrics): string {
  if (!metrics.total) {
    return 'Nenhuma tarefa neste período.';
  }
  const prefix = {
    daily: 'Hoje',
    weekly: 'Nesta semana',
    monthly: 'Neste mês',
  }[metrics.period];
  return `${prefix}, ${metrics.completed} de ${
    metrics.total
  } tarefas foram concluídas. Há ${metrics.pending} pendentes, sendo ${
    metrics.overdue
  } ${metrics.overdue === 1 ? 'atrasada' : 'atrasadas'}.`;
}
export function productivityBars(metrics: ProductivityMetrics) {
  return (
    [
      ['Concluídas', metrics.completed],
      ['Pendentes', metrics.pending],
      ['Atrasadas', metrics.overdue],
    ] as const
  ).map(([label, value]) => ({
    label,
    value,
    width: percentage(value, metrics.total),
  }));
}
