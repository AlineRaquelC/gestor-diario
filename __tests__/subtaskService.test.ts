import { createSubtask, updateSubtask, deleteSubtask, mergeSubtasks } from '../src/services/taskService';
import type { ApiTask } from '../src/services/taskService';
import { API_BASE_URL } from '../src/services/api';
const remote: ApiTask = { id: 't', title: 'Pai', description: null, projectId: 'p', startDate: '2026-10-04', dueDate: '2026-10-05', time: null, priority: 'MEDIUM', status: 'PARTIAL', done: false, progress: 50, favorite: false, createdAt: '2026-10-04T12:00:00Z', updatedAt: '2026-10-04T12:01:00Z', deletedAt: null, undoUntil: null, subtasks: [{ id: 's', title: 'Filha', done: true }] };
const fetchMock = jest.fn();
const response = (task = remote) => ({ ok: true, status: 200, json: async () => ({ task }) });
beforeEach(() => { global.fetch = fetchMock; fetchMock.mockReset().mockResolvedValue(response()); });
it('createSubtask envia POST e usa filho/estado confirmado pelo servidor', async () => {
  const task = await createSubtask('t/id', 'Filha');
  expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/tasks/t%2Fid/subtasks`);
  expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ title: 'Filha' });
  expect(task).toMatchObject({ progress: 50, status: 'in_progress', done: false, subtasks: [{ id: 's', title: 'Filha', done: true, remote: true }], updatedAt: remote.updatedAt });
});
it.each([true, false])('updateSubtask transmite done=%s via PATCH', async done => {
  await updateSubtask('t', 's/id', { done });
  expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/tasks/t/subtasks/s%2Fid`);
  expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ done });
});
it('deleteSubtask envia DELETE sem payload e aceita lista remota vazia', async () => {
  fetchMock.mockResolvedValue(response({ ...remote, subtasks: [], progress: 0, status: 'PENDING' }));
  const result = await deleteSubtask('t', 's');
  expect(result.subtasks).toEqual([]);
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE', body: undefined });
});
it.each([[0, 'PENDING', false, 'todo'], [33, 'PARTIAL', false, 'in_progress'], [100, 'COMPLETED', true, 'completed']] as const)('mapeia progresso/status/done confirmado %s', async (progress, status, done, mapped) => {
  fetchMock.mockResolvedValue(response({ ...remote, progress, status, done }));
  expect(await updateSubtask('t', 's', { done: true })).toMatchObject({ progress, status: mapped, done });
});
it.each([createSubtask.bind(null, 't', 'Filha'), updateSubtask.bind(null, 't', 's', { done: true }), deleteSubtask.bind(null, 't', 's')])('falha de rede propaga erro sem repetir operação', async operation => {
  fetchMock.mockRejectedValue(new Error('offline'));
  await expect(operation()).rejects.toThrow(/confirmar o salvamento/); expect(fetchMock).toHaveBeenCalledTimes(1);
});
it.each([400, 404, 500])('propaga HTTP %s', async status => {
  fetchMock.mockResolvedValue({ ok: false, status, json: async () => ({ error: { code: 'SUBTASK_NOT_FOUND', message: 'Erro real' } }) });
  await expect(updateSubtask('t', 's', { done: true })).rejects.toMatchObject({ status, message: 'Erro real' });
});
it('merge preserva legado local sem upload e remove remoto excluído sem duplicatas', () => {
  const local = { id: 'old', title: 'Local', done: false };
  const confirmed = { id: 's', title: 'Nova', done: true, remote: true };
  expect(mergeSubtasks([confirmed], [local, { ...confirmed, title: 'Antiga' }, { id: 'deleted', title: 'Removida', done: false, remote: true }])).toEqual([confirmed, local]);
  expect(mergeSubtasks([], [confirmed, local])).toEqual([local]);
});
