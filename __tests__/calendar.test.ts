import {
  calendarKey,
  dateFromKey,
  groupDayTasks,
  isDueSoon,
  monthGrid,
  shiftDay,
  shiftMonth,
  taskCalendarDay,
  taskCountsByDay,
  tasksForDay,
  timeGroup,
} from '../src/utils/calendar';
import { isOverdue } from '../src/utils/dashboard';
import type { Task } from '../src/context/TaskContext';
const now = new Date(2026, 9, 4, 10);
const task = (changes: Partial<Task> = {}): Task => ({
  id: 't',
  title: 'Real',
  project: 'Apresentação',
  priority: 'low',
  status: 'todo',
  done: false,
  dueDate: '2026-10-04',
  ...changes,
});

describe('native local calendar', () => {
  test.each([
    [2026, 0, 31, 4],
    [2026, 1, 28, 0],
    [2028, 1, 29, 2],
  ])('grid %s/%s contains every real day', (year, month, count, offset) => {
    const grid = monthGrid(new Date(year, month, 15));
    expect(grid.filter(Boolean)).toHaveLength(count);
    expect(grid.length % 7).toBe(0);
    expect(grid.indexOf(calendarKey(new Date(year, month, 1)))).toBe(offset);
    expect(grid.filter(Boolean).at(-1)).toBe(
      calendarKey(new Date(year, month, count)),
    );
  });
  test('month navigation clamps the day and crosses years', () => {
    expect(calendarKey(shiftMonth(new Date(2026, 0, 31), 1))).toBe(
      '2026-02-28',
    );
    expect(calendarKey(shiftMonth(new Date(2028, 0, 31), 1))).toBe(
      '2028-02-29',
    );
    expect(calendarKey(shiftMonth(new Date(2026, 11, 31), 1))).toBe(
      '2027-01-31',
    );
    expect(calendarKey(shiftMonth(new Date(2026, 0, 31), -1))).toBe(
      '2025-12-31',
    );
  });
  test('date keys round-trip locally and day navigation crosses months', () => {
    expect(calendarKey(dateFromKey('2026-10-04'))).toBe('2026-10-04');
    expect(calendarKey(shiftDay(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
  });
  test('dueDate is operational, startDate is fallback and invalid dates are ignored', () => {
    expect(taskCalendarDay(task({ startDate: '2026-10-01' }))).toBe(
      '2026-10-04',
    );
    expect(
      taskCalendarDay(task({ dueDate: undefined, startDate: '2026-10-01' })),
    ).toBe('2026-10-01');
    expect(
      taskCalendarDay(task({ dueDate: 'bad', startDate: '2026-02-30' })),
    ).toBeUndefined();
  });
  test.each([
    ['05:00', 'Manhã'],
    ['11:59', 'Manhã'],
    ['12:00', 'Tarde'],
    ['17:59', 'Tarde'],
    ['18:00', 'Noite'],
    ['04:59', 'Noite'],
    ['00:00', 'Noite'],
    [undefined, 'Sem horário'],
    ['25:00', 'Sem horário'],
    ['09:99', 'Sem horário'],
  ])('group %s', (time, group) =>
    expect(timeGroup(task({ time }))).toBe(group),
  );
  test('day sorting is nonmutating, missing time last; groups do not lose tasks', () => {
    const tasks = [
      task({ id: 'none' }),
      task({ id: 'night', time: '19:00' }),
      task({ id: 'morning', time: '09:00' }),
      task({ id: 'afternoon', time: '14:00' }),
    ];
    const selected = tasksForDay(tasks, '2026-10-04');
    expect(selected.map(t => t.id)).toEqual([
      'morning',
      'afternoon',
      'night',
      'none',
    ]);
    expect(tasks[0].id).toBe('none');
    expect(groupDayTasks(selected).map(group => group.tasks.length)).toEqual([
      1, 1, 1, 1,
    ]);
  });
  test.each([
    ['2026-10-03', false],
    ['2026-10-04', true],
    ['2026-10-07', true],
    ['2026-10-08', false],
    [undefined, false],
  ])('near deadline %s', (dueDate, expected) =>
    expect(isDueSoon(task({ dueDate }), now)).toBe(expected),
  );
  test('completed is neither overdue nor due soon; priority is independent', () => {
    expect(
      isOverdue(task({ dueDate: '2026-10-03', priority: 'low' }), now),
    ).toBe(true);
    expect(isOverdue(task({ priority: 'high' }), now)).toBe(false);
    expect(
      isOverdue(
        task({ dueDate: '2026-10-03', status: 'completed', done: true }),
        now,
      ),
    ).toBe(false);
    expect(isDueSoon(task({ status: 'completed', done: true }), now)).toBe(
      false,
    );
  });
  test('indicators count multiple tasks per day and exclude invalid legacy records', () => {
    expect(
      taskCountsByDay([
        task(),
        task({ id: 'other' }),
        task({ dueDate: undefined }),
      ]),
    ).toEqual({ '2026-10-04': 2 });
    expect(taskCountsByDay([])).toEqual({});
    expect(tasksForDay([], '2026-10-04')).toEqual([]);
  });
  test('collection updates move indicators to the edited date', () => {
    expect(taskCountsByDay([task()])).toEqual({ '2026-10-04': 1 });
    expect(taskCountsByDay([task({ dueDate: '2026-10-05' })])).toEqual({
      '2026-10-05': 1,
    });
  });
});
