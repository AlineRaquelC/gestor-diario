import type { Task } from '../src/context/TaskContext';
import { emptyGoals } from '../src/models/productivityGoals';
import {
  productivityBars,
  productivityMetrics,
  productivityText,
} from '../src/utils/productivity';
import { dashboardMetrics } from '../src/utils/dashboard';
const now = new Date(2026, 10, 8, 12);
const goals = { ...emptyGoals(), daily: 5, weekly: 5, monthly: 5 };
const task = (changes: Partial<Task> = {}): Task => ({
  id: 't',
  title: 'Real',
  project: '',
  priority: 'low',
  status: 'todo',
  done: false,
  dueDate: '2026-11-08',
  ...changes,
});
it('mesmo conjunto gera totais, texto e barras com atrasadas subconjunto das pendentes', () => {
  const tasks = [
    task(),
    task({ id: 'past', dueDate: '2026-11-02' }),
    task({ id: 'complete', status: 'completed', done: false }),
    task({ id: 'old', dueDate: '2026-10-01' }),
    task({ deletedAt: '2026-11-08' }),
  ];
  const m = productivityMetrics(tasks, 'weekly', goals, now);
  expect(m).toMatchObject({
    start: '2026-11-02',
    end: '2026-11-08',
    total: 3,
    completed: 1,
    pending: 2,
    overdue: 1,
    taskProgress: 33,
    goalProgress: 20,
  });
  expect(productivityText(m)).toBe(
    'Nesta semana, 1 de 3 tarefas foram concluídas. Há 2 pendentes, sendo 1 atrasada.',
  );
  expect(productivityBars(m)).toEqual([
    { label: 'Concluídas', value: 1, width: 33 },
    { label: 'Pendentes', value: 2, width: 67 },
    { label: 'Atrasadas', value: 1, width: 33 },
  ]);
  expect(
    dashboardMetrics(
      tasks.filter(t => !t.deletedAt),
      'week',
      now,
    ).overdue,
  ).toBe(2);
});
it.each([
  ['daily', new Date(2026, 10, 8), '2026-11-08', '2026-11-08'],
  ['weekly', new Date(2027, 0, 1), '2026-12-28', '2027-01-03'],
  ['monthly', new Date(2028, 1, 10), '2028-02-01', '2028-02-29'],
  ['monthly', new Date(2027, 1, 10), '2027-02-01', '2027-02-28'],
] as const)('limites inclusivos %s', (period, clock, start, end) => {
  expect(
    productivityMetrics(
      [
        task({ dueDate: start }),
        task({ dueDate: end }),
        task({ dueDate: '2025-01-01' }),
      ],
      period,
      goals,
      clock,
    ),
  ).toMatchObject({ start, end, total: 2 });
});
it('vazio, meta configurada e meta ausente', () => {
  const m = productivityMetrics([], 'daily', goals, now);
  expect(m).toMatchObject({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    taskProgress: 0,
    goalProgress: 0,
    goal: 5,
  });
  expect(productivityText(m)).toBe('Nenhuma tarefa neste período.');
  expect(productivityBars(m).every(bar => bar.width === 0)).toBe(true);
  expect(productivityMetrics([], 'daily', emptyGoals(), now)).toMatchObject({
    goal: null,
    goalProgress: null,
    goalReached: false,
  });
});
it('dueDate tem precedência; fallback start; sem data não entra; hoje não é atrasada', () => {
  const m = productivityMetrics(
    [
      task({ dueDate: undefined, startDate: '2026-11-08' }),
      task({ dueDate: '2026-12-01', startDate: '2026-11-08' }),
      task({ dueDate: undefined }),
      task(),
    ],
    'daily',
    goals,
    now,
  );
  expect(m).toMatchObject({ total: 2, overdue: 0 });
});
it('concluída vencida não é atrasada; reabertura reflete snapshot', () => {
  const original = task({
    dueDate: '2026-11-03',
    status: 'completed',
    done: true,
  });
  expect(productivityMetrics([original], 'weekly', goals, now)).toMatchObject({
    completed: 1,
    overdue: 0,
  });
  expect(
    productivityMetrics(
      [{ ...original, status: 'todo', done: true }],
      'weekly',
      goals,
      now,
    ),
  ).toMatchObject({ completed: 0, pending: 1, overdue: 1 });
});
it.each([3, 5, 7])(
  'meta mantém contagem real %s e limita visual a 100',
  count => {
    const m = productivityMetrics(
      Array.from({ length: count }, (_, i) =>
        task({ id: String(i), status: 'completed' }),
      ),
      'daily',
      goals,
      now,
    );
    expect(m.completed).toBe(count);
    expect(m.goalProgress).toBe(Math.min(100, (count / 5) * 100));
    expect(m.goalReached).toBe(count >= 5);
  },
);
it('ocorrências materializadas da mesma série contam individualmente, sem projeção', () => {
  const tasks = [
    task({
      id: 'a',
      recurrenceSeriesId: 'series',
      occurrenceKey: '2026-11-08',
    }),
    task({
      id: 'b',
      recurrenceSeriesId: 'series',
      occurrenceKey: '2026-11-09',
      dueDate: '2026-11-09',
    }),
  ];
  expect(productivityMetrics(tasks, 'daily', goals, now).total).toBe(1);
  expect(productivityMetrics(tasks, 'monthly', goals, now).total).toBe(2);
});
it.each([
  ['daily', 'Hoje'],
  ['weekly', 'Nesta semana'],
  ['monthly', 'Neste mês'],
] as const)('prefixo %s', (period, prefix) =>
  expect(
    productivityText(productivityMetrics([task()], period, goals, now)),
  ).toMatch(new RegExp(`^${prefix}`)),
);
