import { apiRequest } from '../src/services/api';
import { searchTasks, fromApiTask, toApiTaskUpdate, getTasks, getTasksForSync } from '../src/services/taskService';
import type { ApiTask } from '../src/services/taskService';
import { preserveTask, taskFields } from '../src/services/syncService';
jest.mock('../src/services/api', () => ({ ...jest.requireActual('../src/services/api'), apiRequest: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
const remote: ApiTask = {
  id: 't', title: 'Task', description: null, projectId: 'p', priority: 'HIGH', status: 'PENDING', done: false, progress: 0,
  favorite: true, startDate: '2026-11-07', dueDate: '2026-11-08', time: null, createdAt: '2026-11-07T12:00:00Z', updatedAt: '2026-11-07T12:00:00Z', deletedAt: null, undoUntil: null, subtasks: [], reminders: [],
  recurrenceSeriesId: 's', occurrenceKey: '2026-11-08', recurrence: { frequency: 'DAILY', timeZone: 'UTC', anchorDate: '2026-11-08', updatedAt: '2026-11-07T12:00:00Z', materializedThrough: '2026-12-08' },
};
beforeEach(() => { jest.clearAllMocks(); jest.mocked(apiRequest).mockResolvedValue([remote]); });
it('query trim/encoded usa o mapper único, preservando shape e identidade', async () => {
  expect(await searchTasks('  ação & cliente  ')).toEqual([fromApiTask(remote)]);
  expect(apiRequest).toHaveBeenCalledWith('/tasks/search?q=a%C3%A7%C3%A3o%20%26%20cliente');
});
it('query vazia não chama endpoint', async () => {
  expect(await searchTasks('   ')).toEqual([]); expect(apiRequest).not.toHaveBeenCalled();
});
it.each([true, false])('favorite %s é enviado explicitamente e lido em todos os snapshots', async favorite => {
  expect(toApiTaskUpdate({ favorite })).toEqual({ favorite });
  jest.mocked(apiRequest).mockResolvedValue([{ ...remote, favorite }]);
  expect((await getTasks())[0].favorite).toBe(favorite);
  expect((await getTasksForSync())[0].favorite).toBe(favorite);
});
it('cache antigo não vence favorito canônico no sync, fingerprint considera favorite', () => {
  const server = fromApiTask(remote), cached = { ...server, favorite: false };
  expect(preserveTask(server, cached).favorite).toBe(true);
  expect(taskFields(server)).not.toBe(taskFields(cached));
  expect(fromApiTask({ ...remote, favorite: undefined } as unknown as ApiTask).favorite).toBe(false);
});
