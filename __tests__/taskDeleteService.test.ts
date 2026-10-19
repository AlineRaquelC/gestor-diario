import { deleteTask, restoreTask } from '../src/services/taskService';
import { presentTaskHistory } from '../src/models/taskHistory';
const fetchMock = jest.fn();
beforeEach(() => { global.fetch = fetchMock; fetchMock.mockReset(); });
it('DELETE usa ID codificado e retorna confirmação remota', async () => {
  const result = { id: 't', deletedAt: '2026-10-19T12:00:00Z', updatedAt: '2026-10-19T12:00:00Z' };
  fetchMock.mockResolvedValue({ ok: true, json: async () => result });
  expect(await deleteTask('id/espaço')).toEqual(result);
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/tasks\/id%2Fespa%C3%A7o$/);
  expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
});
it('RESTORE adapta tarefa original e filhos confirmados', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 't', title: 'Original', projectId: 'p', project: { name: 'Projeto' }, startDate: '2026-10-19', dueDate: '2026-10-19', priority: 'HIGH', status: 'PARTIAL', done: false, progress: 50, subtasks: [{ id: 's', title: 'Filha', done: true }], deletedAt: null }) });
  expect(await restoreTask('t')).toMatchObject({ id: 't', title: 'Original', priority: 'high', status: 'in_progress', progress: 50, subtasks: [{ id: 's', title: 'Filha', done: true, remote: true }] });
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/tasks\/t\/restore$/);
  expect(fetchMock.mock.calls[0][1].method).toBe('POST');
});
it('legado sem registro remoto recebe erro compreensível, sem confirmação falsa', async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: { code: 'TASK_NOT_FOUND' } }) });
  await expect(deleteTask('local')).rejects.toThrow('apenas neste dispositivo');
});
it.each([deleteTask, restoreTask])('backend offline não confirma operação %p', async operation => {
  fetchMock.mockRejectedValue(new TypeError('offline'));
  await expect(operation('t')).rejects.toThrow('Não foi possível confirmar');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it.each(['DELETE', 'RESTORE'] as const)('apresenta evento real %s no histórico', action => {
  expect(presentTaskHistory({ id: 'h', taskId: 't', action, metadata: {}, createdAt: '2026-10-19T12:00:00Z' }).title).toBe(action === 'DELETE' ? 'Tarefa excluída' : 'Tarefa restaurada');
});
