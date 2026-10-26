import AsyncStorage from '@react-native-async-storage/async-storage';
import { synchronize } from '../src/services/syncService';
import { fromApiTask } from '../src/services/taskService';
import type { ApiTask } from '../src/services/taskService';
import { ReminderScheduler, REMINDER_JOURNAL_KEY } from '../src/services/reminderScheduler';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../specs/NativeTaskReminders', () => ({ __esModule: true, default: null }));
jest.mock('../src/services/projectService', () => ({ listProjects: jest.fn(async () => [{ id: 'p', name: 'P', color: '#fff', icon: 'P' }]) }));
const reminder = { id: 'r', taskId: 't', offsetMinutes: 15, createdAt: '2026-10-26T12:00:00Z', updatedAt: '2026-10-26T12:00:00Z', triggerAt: '2026-10-27T12:45:00Z' };
const remote: ApiTask = { id: 't', title: 'Task', projectId: 'p', description: null, startDate: '2026-10-26', dueDate: '2026-10-27',
  time: '10:00', priority: 'HIGH', status: 'PENDING', done: false, progress: 0, favorite: false, deletedAt: null, undoUntil: null,
  createdAt: reminder.createdAt, updatedAt: reminder.updatedAt, reminderTimeZone: 'America/Sao_Paulo', reminders: [reminder] };
const storage = new Map<string, string>(), records = new Map<string, number>();
let scheduler: ReminderScheduler;
let snapshot: ApiTask[];
const schedule = jest.fn(async (id: string, at: number) => {records.set(id, at); return '{}';});
const cancel = jest.fn(async (id: string) => {records.delete(id); return '{}';});
const fetchMock = jest.fn();
beforeEach(() => {
  jest.clearAllMocks(); storage.clear(); records.clear(); snapshot = [remote];
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {storage.set(key, value);});
  fetchMock.mockImplementation(async () => ({ ok: true, status: 200, json: async () => snapshot })); global.fetch = fetchMock;
  scheduler = new ReminderScheduler({ schedule, cancel, getScheduled: async () => JSON.stringify({ usable: true,
    records: [...records].map(([notificationId, triggerAt]) => ({ notificationId, triggerAt })) }) }, AsyncStorage, () => Date.parse('2026-10-26T12:00:00Z'));
});
it('sync repetida conserva IDs e um único trigger; [] remoto cancela sem ressuscitar legado', async () => {
  const first = await synchronize([], [{ ...fromApiTask(remote), legacyReminders: ['15 min antes'] }]);
  await AsyncStorage.setItem('@taskflow:tasks', JSON.stringify(first.tasks));
  await scheduler.reconcile(first.reminderSnapshot!, true);
  const second = await synchronize(first.projects, first.tasks);
  await AsyncStorage.setItem('@taskflow:tasks', JSON.stringify(second.tasks));
  await scheduler.reconcile(second.reminderSnapshot!, true);
  expect(schedule).toHaveBeenCalledTimes(1); expect(records.size).toBe(1);
  expect(second.tasks[0].reminders).toEqual(first.tasks[0].reminders);
  snapshot = [{ ...remote, reminders: [], reminderTimeZone: null }];
  const cleared = await synchronize(second.projects, second.tasks);
  await AsyncStorage.setItem('@taskflow:tasks', JSON.stringify(cleared.tasks));
  await scheduler.reconcile(cleared.reminderSnapshot!, true);
  expect(records.size).toBe(0); expect(cleared.tasks[0]).toMatchObject({ reminders: [], legacyReminders: ['15 min antes'] });
  expect(fetchMock.mock.calls.every(([, options]) => options.method === 'GET')).toBe(true);
  expect(storage.has(REMINDER_JOURNAL_KEY)).toBe(true);
});
it('tombstone cancela e falha intermediária não cancela trigger confirmado', async () => {
  const first = await synchronize([], [fromApiTask(remote)]);
  await scheduler.reconcile(first.reminderSnapshot!, true);
  fetchMock.mockRejectedValueOnce(new Error('offline'));
  await expect(synchronize(first.projects, first.tasks)).rejects.toThrow();
  expect(records.size).toBe(1); expect(cancel).not.toHaveBeenCalled();
  snapshot = [{ ...remote, deletedAt: '2026-10-26T13:00:00Z' }];
  const deleted = await synchronize(first.projects, first.tasks);
  await AsyncStorage.setItem('@taskflow:tasks', JSON.stringify(deleted.tasks));
  await scheduler.reconcile(deleted.reminderSnapshot!, true);
  expect(records.size).toBe(0); expect(deleted.tasks).toEqual([]);
});
