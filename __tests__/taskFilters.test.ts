import type { Task } from '../src/context/TaskContext';
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  DEFAULT_SORTING,
  filterTasks,
  sortTasks,
  taskProjectOptions,
} from '../src/utils/taskFilters';
import type { TaskFilters, TaskSorting } from '../src/utils/taskFilters';

const now = new Date(2026, 9, 20, 12);
const projects = [
  {
    id: 'local-a',
    remoteId: 'remote-a',
    name: 'Mesmo nome',
    color: '#5C4DFF',
    icon: 'A',
  },
  { id: 'local-b', name: 'Mesmo nome', color: '#5C4DFF', icon: 'B' },
];
const task = (id: string, changes: Partial<Task> = {}): Task => ({
  id,
  title: id,
  project: 'Mesmo nome',
  projectId: 'remote-a',
  status: 'todo',
  done: false,
  priority: 'high',
  dueDate: '2026-10-20',
  ...changes,
});
const tasks = [
  task('a'),
  task('b', {
    status: 'in_progress',
    priority: 'medium',
    projectId: 'local-a',
    dueDate: '2026-10-25',
  }),
  task('c', {
    status: 'completed',
    done: true,
    priority: 'low',
    projectId: 'local-b',
    dueDate: '2026-10-31',
  }),
  task('d', { projectId: undefined, dueDate: undefined }),
  task('e', { projectId: 'unknown', dueDate: 'invalid' }),
];
const ids = (list: Task[]) => list.map(item => item.id);
const filter = (changes: Partial<TaskFilters> = {}, list = tasks, date = now) =>
  ids(filterTasks(list, { ...DEFAULT_FILTERS, ...changes }, projects, date));
const sort = (changes: Partial<TaskSorting>, list = tasks) =>
  ids(sortTasks(list, { ...DEFAULT_SORTING, ...changes }));

test('default includes every operational task, in Context order, without mutating data', () => {
  const frozen = Object.freeze(tasks.map(item => Object.freeze({ ...item })));
  expect(ids(filterTasks(frozen, DEFAULT_FILTERS, projects, now))).toEqual([
    'a',
    'b',
    'c',
    'd',
    'e',
  ]);
  expect(ids(sortTasks(frozen, DEFAULT_SORTING))).toEqual([
    'a',
    'b',
    'c',
    'd',
    'e',
  ]);
  expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
});
test.each([
  ['todo', ['a', 'd', 'e']],
  ['in_progress', ['b']],
  ['completed', ['c']],
] as const)('status %s', (status, expected) => {
  expect(filter({ status })).toEqual(expected);
});
test('legacy done fallback and review mapping respect canonical status', () => {
  const legacy = [
    task('done', {
      status: undefined as unknown as Task['status'],
      done: true,
    }),
    task('review', { status: 'review' as Task['status'] }),
    task('canonical', { status: 'todo', done: true }),
  ];
  expect(filter({ status: 'completed' }, legacy)).toEqual(['done']);
  expect(filter({ status: 'in_progress' }, legacy)).toEqual(['review']);
  expect(filter({ status: 'todo' }, legacy)).toEqual(['canonical']);
});
test.each([
  ['high', ['a', 'd', 'e']],
  ['medium', ['b']],
  ['low', ['c']],
] as const)('priority %s', (priority, expected) => {
  expect(filter({ priority })).toEqual(expected);
});
test('projects use local and remote IDs, never equal names or undefined remoteId', () => {
  expect(filter({ projectId: 'local-a' })).toEqual(['a', 'b']);
  expect(filter({ projectId: 'remote-a' })).toEqual(['a', 'b']);
  expect(filter({ projectId: 'local-b' })).toEqual(['c']);
  expect(filter({ projectId: '' })).toEqual(['d']);
  expect(filter({ projectId: 'unknown' })).toEqual(['e']);
  expect(filter({ projectId: 'missing' })).toEqual([]);
});
test('project options retain Context names and distinct identities, including unresolved IDs', () => {
  expect(taskProjectOptions(projects, tasks)).toEqual([
    { id: 'local-a', name: 'Mesmo nome' },
    { id: 'local-b', name: 'Mesmo nome' },
    { id: 'unknown', name: 'Mesmo nome' },
  ]);
  expect(
    taskProjectOptions([], [task('a', { project: '' }), task('b')]),
  ).toEqual([{ id: 'remote-a', name: 'Projeto indisponível' }]);
});
test.each([
  ['today', ['a']],
  ['week', ['a', 'b']],
  ['month', ['a', 'b', 'c']],
  ['all', ['a', 'b', 'c', 'd', 'e']],
] as const)('period %s', (period, expected) => {
  expect(filter({ period })).toEqual(expected);
});
test('period includes Monday through Sunday across month and year boundaries', () => {
  const list = [
    '2026-12-27',
    '2026-12-28',
    '2026-12-31',
    '2027-01-01',
    '2027-01-03',
    '2027-01-04',
  ].map(day => task(day, { dueDate: day }));
  expect(filter({ period: 'week' }, list, new Date(2027, 0, 1))).toEqual([
    '2026-12-28',
    '2026-12-31',
    '2027-01-01',
    '2027-01-03',
  ]);
  expect(filter({ period: 'month' }, list, new Date(2026, 11, 31))).toEqual([
    '2026-12-27',
    '2026-12-28',
    '2026-12-31',
  ]);
  expect(filter({ period: 'month' }, list, new Date(2027, 0, 1))).toEqual([
    '2027-01-01',
    '2027-01-03',
    '2027-01-04',
  ]);
});
test('invalid and missing dates use existing startDate fallback only for periods', () => {
  const list = [
    task('fallback', { dueDate: '2026-02-30', startDate: '2026-10-20' }),
    task('invalid', { dueDate: 'invalid', startDate: 'invalid' }),
    task('missing', { dueDate: undefined }),
    task('iso', { dueDate: new Date(2026, 9, 20, 12).toISOString() }),
  ];
  expect(filter({ period: 'today' }, list)).toEqual(['fallback', 'iso']);
  expect(filter({}, list)).toHaveLength(4);
});
test.each([
  [{ status: 'todo', priority: 'high' }, ['a', 'd', 'e']],
  [{ projectId: 'local-a', status: 'in_progress' }, ['b']],
  [{ period: 'week', priority: 'medium' }, ['b']],
  [
    { projectId: 'local-a', status: 'todo', priority: 'high', period: 'today' },
    ['a'],
  ],
  [
    { projectId: 'local-b', status: 'todo', priority: 'high', period: 'today' },
    [],
  ],
] as [Partial<TaskFilters>, string[]][])(
  'filters intersect: %j',
  (selection, expected) => {
    expect(filter(selection)).toEqual(expected);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, ...selection })).toBe(
      Object.keys(selection).length,
    );
  },
);
test('priority uses explicit rank in both directions, stable for ties', () => {
  expect(sort({ criterion: 'priority' })).toEqual(['a', 'd', 'e', 'b', 'c']);
  expect(sort({ criterion: 'priority', priorityDirection: 'asc' })).toEqual([
    'c',
    'b',
    'a',
    'd',
    'e',
  ]);
});
test('dueDate sorts both ways, missing/invalid last even with a valid startDate', () => {
  const list = [
    task('missing', { dueDate: undefined, startDate: '2026-10-01' }),
    task('late', { dueDate: '2026-10-31' }),
    task('early'),
    task('invalid', { dueDate: 'invalid' }),
  ];
  expect(sort({ criterion: 'dueDate' }, list)).toEqual([
    'early',
    'late',
    'missing',
    'invalid',
  ]);
  expect(
    sort({ criterion: 'dueDate', dueDateDirection: 'desc' }, list),
  ).toEqual(['late', 'early', 'missing', 'invalid']);
});
test('combined criteria respect their precedence and independent directions', () => {
  const list = [
    task('high-late', { dueDate: '2026-10-31' }),
    task('low-early', { priority: 'low' }),
    task('high-early'),
    task('medium-early', { priority: 'medium' }),
  ];
  expect(sort({ criterion: 'priorityDueDate' }, list)).toEqual([
    'high-early',
    'high-late',
    'medium-early',
    'low-early',
  ]);
  expect(
    sort(
      {
        criterion: 'priorityDueDate',
        priorityDirection: 'asc',
        dueDateDirection: 'desc',
      },
      list,
    ),
  ).toEqual(['low-early', 'medium-early', 'high-late', 'high-early']);
  expect(sort({ criterion: 'dueDatePriority' }, list)).toEqual([
    'high-early',
    'medium-early',
    'low-early',
    'high-late',
  ]);
  expect(
    sort(
      {
        criterion: 'dueDatePriority',
        priorityDirection: 'asc',
        dueDateDirection: 'desc',
      },
      list,
    ),
  ).toEqual(['high-late', 'low-early', 'medium-early', 'high-early']);
});
test('equal values retain input order and sorting never changes the Context array or objects', () => {
  const list = Object.freeze([
    Object.freeze(task('z')),
    Object.freeze(task('a')),
  ]);
  expect(
    ids(sortTasks(list, { ...DEFAULT_SORTING, criterion: 'priorityDueDate' })),
  ).toEqual(['z', 'a']);
  expect(list.map(item => item.id)).toEqual(['z', 'a']);
  expect(sortTasks(list, DEFAULT_SORTING)[0]).toBe(list[0]);
});
