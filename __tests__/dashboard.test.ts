import {dashboardDate, dashboardMetrics, greeting, isOverdue, localDay, periodBounds, projectMetrics} from '../src/utils/dashboard';
import type {Task} from '../src/context/TaskContext';

const now = new Date(2026, 9, 4, 10);
const task = (changes: Partial<Task> = {}): Task => ({id: 't', title: 'Real', project: 'Nome', priority: 'low', status: 'todo', done: false, dueDate: '2026-10-04', ...changes});

describe('dashboard local calendar', () => {
  test.each([[5, 'Bom dia!'], [11, 'Bom dia!'], [12, 'Boa tarde!'], [17, 'Boa tarde!'], [18, 'Boa noite!'], [0, 'Boa noite!'], [4, 'Boa noite!']])('greeting at %s', (hour, label) => {
    expect(greeting(new Date(2026, 9, 4, Number(hour)))).toBe(label);
  });
  test('date comes from the device calendar in Portuguese', () => {
    expect(dashboardDate(now)).toBe('Domingo, 4 de outubro');
    expect(dashboardDate(new Date(2026, 9, 5))).toContain('5 de outubro');
  });
  test.each([undefined, '', 'invalid', '2026-02-30'])('invalid date %s is ignored', value => expect(localDay(value)).toBeUndefined());
  test('calendar strings preserve their day; local ISO midnight matches', () => {
    expect(localDay('2026-10-04')).toBe('2026-10-04');
    expect(localDay(new Date(2026, 9, 4).toISOString())).toBe('2026-10-04');
  });
  test.each([
    ['today', '2026-10-04', '2026-10-04'],
    ['week', '2026-09-28', '2026-10-04'],
    ['month', '2026-10-01', '2026-10-31'],
  ] as const)('%s boundaries inclusive', (period, start, end) => expect(periodBounds(period, now)).toEqual({start, end}));
  test('week crosses year boundaries and month handles leap year', () => {
    expect(periodBounds('week', new Date(2027, 0, 1))).toEqual({start: '2026-12-28', end: '2027-01-03'});
    expect(periodBounds('month', new Date(2028, 1, 10))).toEqual({start: '2028-02-01', end: '2028-02-29'});
  });
});

describe('real metrics', () => {
  test('empty collection has no division by zero', () => expect(dashboardMetrics([], 'today', now)).toEqual({total: 0, pending: 0, completed: 0, overdue: 0, progress: 0}));
  test.each([[0, 0], [1, 33], [3, 100]])('%s of three completed', (count, progress) => {
    const tasks = [0, 1, 2].map(index => task({id: String(index), status: index < count ? 'completed' : 'todo', done: index < count}));
    expect(dashboardMetrics(tasks, 'today', now)).toMatchObject({total: 3, completed: count, pending: 3 - count, progress});
  });
  test('priority is independent of overdue; today and completed are not overdue', () => {
    expect(isOverdue(task({priority: 'high'}), now)).toBe(false);
    expect(isOverdue(task({priority: 'low', dueDate: '2026-10-03'}), now)).toBe(true);
    expect(isOverdue(task({status: 'completed', done: true, dueDate: '2026-10-03'}), now)).toBe(false);
  });
  test('period changes metrics while overdue remains a clearly separate global total', () => {
    const tasks = [task(), task({dueDate: '2026-09-30'}), task({dueDate: '2026-10-20', status: 'completed', done: true})];
    expect(dashboardMetrics(tasks, 'today', now)).toMatchObject({total: 1, overdue: 1});
    expect(dashboardMetrics(tasks, 'week', now)).toMatchObject({total: 2, overdue: 1});
    expect(dashboardMetrics(tasks, 'month', now)).toMatchObject({total: 2, completed: 1, progress: 50, overdue: 1});
  });
  test('missing legacy dates excluded; valid start date is fallback; due date takes precedence', () => {
    expect(dashboardMetrics([task({dueDate: undefined}), task({dueDate: undefined, startDate: '2026-10-04'}), task({dueDate: '2026-11-01', startDate: '2026-10-04'})], 'today', now)).toMatchObject({total: 1, pending: 1});
  });
  test('creation, edit, conclusion, reopen, removal and restoration recalculate', () => {
    const original = task();
    expect(dashboardMetrics([original], 'today', now).pending).toBe(1);
    expect(dashboardMetrics([{...original, dueDate: '2026-11-01'}], 'today', now).total).toBe(0);
    expect(dashboardMetrics([{...original, status: 'completed', done: true}], 'today', now).progress).toBe(100);
    expect(dashboardMetrics([original], 'today', now).progress).toBe(0);
    expect(dashboardMetrics([], 'today', now).total).toBe(0);
    expect(dashboardMetrics([original], 'today', now).total).toBe(1);
  });
  test('project IDs and remote aliases are identities; identical names do not match', () => {
    const projects = [{id: 'local', remoteId: 'remote', name: 'Nome', icon: 'P', color: '#fff'}, {id: 'other', name: 'Nome', icon: 'Q', color: '#000'}];
    const result = projectMetrics(projects, [task({projectId: 'remote'}), task({projectId: 'local', status: 'completed', done: true}), task(), task({projectId: 'unresolved'})]);
    expect(result[0]).toMatchObject({total: 2, completed: 1, progress: 50});
    expect(result[1]).toMatchObject({total: 0, completed: 0, progress: 0});
  });
  test('moving a task between projects recalculates both without relying on names', () => {
    const projects = ['a', 'b', 'c'].map(id => ({id, name: 'Mesmo nome', icon: 'P', color: '#fff'}));
    expect(projectMetrics(projects, [task({projectId: 'a'})]).map(project => project.total)).toEqual([1, 0, 0]);
    expect(projectMetrics(projects, [task({projectId: 'b'})]).map(project => project.total)).toEqual([0, 1, 0]);
  });
});
