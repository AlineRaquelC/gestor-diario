import { API_BASE_URL } from '../src/services/api';
import { updateTask, toApiTaskUpdate } from '../src/services/taskService';
import type { ApiTask } from '../src/services/taskService';

const remote: ApiTask = { id: 'task', title: 'Editada', description: 'Nova', projectId: 'p2', project: { id: 'p2', name: 'Projeto novo', color: '#fff', icon: 'P' }, startDate: '2026-10-03', dueDate: '2026-10-05', time: '18:30', priority: 'LOW', status: 'PARTIAL', done: false, progress: 37, favorite: false, createdAt: '2026-10-03T10:00:00Z', updatedAt: '2026-10-03T12:00:00Z', deletedAt: null, undoUntil: null };
const fetchMock = jest.fn();
const response = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data });
beforeEach(() => { global.fetch = fetchMock; fetchMock.mockReset(); });

it('PATCH parcial envia somente os campos presentes, sem dados locais/subtarefas', async () => {
  fetchMock.mockResolvedValue(response(remote));
  const result = await updateTask('task/id', { title: 'Editada', subtasks: [{ id: 's', title: 'Local', done: false }] });
  expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/tasks/task%2Fid`);
  expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ title: 'Editada' });
  expect(result).toMatchObject({ title: 'Editada', projectId: 'p2', project: 'Projeto novo', status: 'in_progress', priority: 'low', progress: 37, updatedAt: remote.updatedAt });
});
it.each([['low', 'LOW'], ['medium', 'MEDIUM'], ['high', 'HIGH']] as const)('mapeia prioridade %s', (priority, expected) => {
  expect(toApiTaskUpdate({ priority })).toEqual({ priority: expected });
});
it.each([['todo', 'PENDING'], ['in_progress', 'PARTIAL'], ['review', 'PARTIAL'], ['completed', 'COMPLETED']] as const)('mapeia status %s sem redefinir review', (status, expected) => {
  expect(toApiTaskUpdate({ status })).toEqual({ status: expected });
});
it('mapeia projeto/datas locais e horário vazio para limpeza explícita', () => {
  expect(toApiTaskUpdate({ projectId: 'p2', project: 'Nome apenas visual', startDate: new Date(2026, 9, 3).toISOString(), dueDate: new Date(2026, 9, 5).toISOString(), time: '' })).toEqual({ projectId: 'p2', startDate: '2026-10-03', dueDate: '2026-10-05', time: null });
  expect(toApiTaskUpdate({ title: 'Nova' })).not.toHaveProperty('status');
});
it('resposta remota prevalece sobre nome antigo e preserva campos locais de apoio', async () => {
  const local = { project: 'Antigo', subtasks: [{ id: 's', title: 'Local', done: false }], reminders: ['Lembrar'] };
  fetchMock.mockResolvedValue(response({ ...remote, subtasks: [] }));
  expect(await updateTask('task', { projectId: 'p2' }, local)).toMatchObject({ projectId: 'p2', project: 'Projeto novo', subtasks: local.subtasks, reminders: local.reminders });
});
it.each([400, 404, 500])('propaga erro HTTP %s sem retry', async status => {
  fetchMock.mockResolvedValue(response({ error: { code: 'TASK_NOT_FOUND', message: 'Falha de atualização.' } }, status));
  await expect(updateTask('task', { title: 'Nova' })).rejects.toMatchObject({ status, message: 'Falha de atualização.' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('backend indisponível não fabrica tarefa nem repete PATCH', async () => {
  fetchMock.mockRejectedValue(new Error('offline'));
  await expect(updateTask('task', { title: 'Nova' })).rejects.toThrow(/confirmar o salvamento/);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
