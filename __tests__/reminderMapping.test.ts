import { fromApiTask, toApiTask, toApiTaskUpdate, createTask, getTasks, getTaskById, getTasksForSync, importLocalTask, updateTask } from '../src/services/taskService';
import type { ApiTask, NewTask } from '../src/services/taskService';
import { normalizeReminderCache, deviceReminderTimeZone } from '../src/models/reminder';

const reminder = { id: 'r', taskId: 't', offsetMinutes: 15, createdAt: '2026-10-26T12:00:00Z', updatedAt: '2026-10-26T12:00:00Z', triggerAt: '2026-10-27T12:45:00Z' };
const remote: ApiTask = { id: 't', title: 'Task', projectId: 'p', description: null, startDate: '2026-10-26', dueDate: '2026-10-27',
  time: '10:00', priority: 'HIGH', status: 'PENDING', done: false, progress: 0, favorite: false, deletedAt: null, undoUntil: null,
  createdAt: reminder.createdAt, updatedAt: reminder.updatedAt, reminderTimeZone: 'America/Sao_Paulo', reminders: [reminder] };
const draft: NewTask = { title: 'Task', projectId: 'p', project: 'P', startDate: '2026-10-26', dueDate: '2026-10-27',
  time: '10:00', priority: 'high', status: 'todo', done: false, reminderTimeZone: 'America/Sao_Paulo', reminders: [{ offsetMinutes: 15 }] };
const fetchMock = jest.fn();
beforeEach(() => {jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-26T12:00:00Z')); global.fetch = fetchMock; fetchMock.mockReset();});
afterEach(() => jest.restoreAllMocks());
const respond = (value: unknown) => ({ ok: true, status: 200, json: async () => value });
it('ApiReminder preserva todos os campos canônicos, IANA e dia literal', () => {
  expect(fromApiTask(remote)).toMatchObject({ reminders: [reminder], reminderTimeZone: remote.reminderTimeZone,
    dueDateKey: '2026-10-27', startDateKey: '2026-10-26', remindersConfirmed: true });
});
it('POST envia apenas offsets e IANA; nenhum ID/timestamp/journal', async () => {
  fetchMock.mockResolvedValue(respond(remote));
  const task = await createTask(draft, 'p');
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.reminders).toEqual([{ offsetMinutes: 15 }]); expect(body.reminderTimeZone).toBe(draft.reminderTimeZone);
  expect(task.reminders).toEqual([reminder]); expect(body).not.toHaveProperty('remindersConfirmed');
});
it('PATCH omitido preserva; [] limpa; itens serializam somente offsets', () => {
  expect(toApiTaskUpdate({ title: 'Outra' })).toEqual({ title: 'Outra' });
  expect(toApiTaskUpdate({ reminders: [] })).toEqual({ reminders: [] });
  expect(toApiTaskUpdate({ reminders: [reminder], reminderTimeZone: draft.reminderTimeZone })).toEqual({ reminders: [{ offsetMinutes: 15 }], reminderTimeZone: draft.reminderTimeZone });
});
it('dia canônico prevalece sobre ISO do cache reinterpretado depois de viagem', () => {
  expect(toApiTaskUpdate({ dueDate: '2026-10-28T02:00:00Z', dueDateKey: '2026-10-27' }).dueDate).toBe('2026-10-27');
});
it('cache antigo separa labels sem promovê-las; novo cache faz round trip', () => {
  const legacy = normalizeReminderCache({ id: 't', reminders: ['15 min antes', 'desconhecido'] });
  expect(legacy).toEqual({ id: 't', reminders: [], legacyReminders: ['15 min antes', 'desconhecido'] });
  const current = fromApiTask(remote);
  expect(normalizeReminderCache(JSON.parse(JSON.stringify(current)))).toEqual(current);
  expect(() => normalizeReminderCache({ id: 't', reminders: [{ ...reminder, taskId: 'other' }] })).toThrow();
});
it('remoto [] é autoritativo e legado permanece separado', () => {
  const mapped = fromApiTask({ ...remote, reminders: [], reminderTimeZone: null }, { reminders: ['15 min antes'] });
  expect(mapped.reminders).toEqual([]); expect(mapped.legacyReminders).toEqual(['15 min antes']);
  expect(toApiTask({ ...draft, reminders: ['15 min antes'] }, 'p')).not.toHaveProperty('reminders');
});
it.each(['list', 'detail', 'sync'])('GET %s sempre usa reminders remotos, incluindo []', async kind => {
  const empty = { ...remote, reminders: [] };
  fetchMock.mockResolvedValue(respond(kind === 'detail' ? empty : [empty]));
  const value = kind === 'detail' ? [await getTaskById('t')] : kind === 'sync' ? await getTasksForSync() : await getTasks();
  expect(value[0].reminders).toEqual([]);
});
it('importação de cache legado não envia labels nem journal', async () => {
  fetchMock.mockResolvedValue(respond({ ...remote, reminders: [] }));
  const local = { ...fromApiTask(remote), id: 'local', reminders: [], legacyReminders: ['No horário'] };
  await importLocalTask(local, 'p', 'stable');
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body).toMatchObject({ clientId: 'stable', reminders: [] });
  expect(body).not.toHaveProperty('legacyReminders'); expect(body).not.toHaveProperty('journal');
});
it('helper retorna IANA resolvível do aparelho', () => {
  const zone = deviceReminderTimeZone(); expect(new Intl.DateTimeFormat('en', { timeZone: zone }).resolvedOptions().timeZone).toBeTruthy();
});
it('IANA inválido e trigger passado são rejeitados antes do POST pelo mesmo domínio T01', async () => {
  expect(() => toApiTaskUpdate({ reminderTimeZone: 'Invalid/Zone' })).toThrow();
  await expect(createTask({ ...draft, dueDate: '2026-10-26', time: '08:00' }, 'p')).rejects.toThrow(/já passou/);
  expect(fetchMock).not.toHaveBeenCalled();
});
it('PATCH de histórico expirado permite título/remoção mas rejeita novo offset sem enviar HTTP', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-28T12:00:00Z'));
  const local = fromApiTask(remote); fetchMock.mockResolvedValue(respond(remote));
  await expect(updateTask('t', { title: 'Outra' }, local)).resolves.toMatchObject({ id: 't' });
  await expect(updateTask('t', { reminders: [] }, local)).resolves.toMatchObject({ id: 't' });
  fetchMock.mockClear();
  await expect(updateTask('t', { reminders: [{ offsetMinutes: 30 }] }, local)).rejects.toThrow(/já passou/);
  expect(fetchMock).not.toHaveBeenCalled();
});
it('POST com clientId deixa backend resolver retry idempotente mesmo após vencimento', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-28T12:00:00Z'));
  fetchMock.mockResolvedValue(respond(remote));
  await expect(createTask({ ...draft, clientId: 'saved-retry' }, 'p')).resolves.toMatchObject({ id: 't', reminders: [reminder] });
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).clientId).toBe('saved-retry'); expect(fetchMock).toHaveBeenCalledTimes(1);
});
