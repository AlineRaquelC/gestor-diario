import { apiRequest, ApiError, API_BASE_URL } from '../src/services/api';
import { toApiTask, fromApiTask, createTask, resolveProject, calendarDate, getTasks, getTaskById } from '../src/services/taskService';
import type { NewTask, ApiTask } from '../src/services/taskService';

const draft: NewTask = { title: 'Tarefa', project: 'Geral', projectId: 'p7', startDate: new Date(2026, 9, 2, 23).toISOString(), dueDate: new Date(2026, 9, 3).toISOString(), priority: 'high', status: 'review', done: false, subtasks: [{ id: 's', title: 'Local', done: false }], reminders: ['No horário'] };
const remote: ApiTask = { id: 'uuid', title: 'Tarefa', description: null, projectId: 'remote-p', startDate: '2026-10-02', dueDate: '2026-10-03', time: null, priority: 'HIGH', status: 'PARTIAL', done: false, progress: 0, favorite: false, createdAt: '2026-10-02T12:00:00Z', updatedAt: '2026-10-02T12:00:00Z', deletedAt: null, undoUntil: null };
const fetchMock = jest.fn();
const response = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data });
beforeEach(() => { global.fetch = fetchMock; fetchMock.mockReset(); });

it('centraliza URL Android e mapeia calendário local, prioridade e status', () => {
  expect(API_BASE_URL).toBe('http://10.0.2.2:3000');
  expect(toApiTask(draft, 'remote-p')).toMatchObject({ projectId: 'remote-p', startDate: '2026-10-02', dueDate: '2026-10-03', priority: 'HIGH', status: 'PARTIAL' });
  expect(toApiTask(draft, 'remote-p').subtasks).toEqual([{ title: 'Local' }]);
  expect(calendarDate('2026-10-02')).toBe('2026-10-02');
});
it.each([['low', 'LOW'], ['medium', 'MEDIUM'], ['high', 'HIGH']] as const)('mapeia prioridade %s', (priority, expected) => {
  expect(toApiTask({ ...draft, priority }, 'p').priority).toBe(expected);
});
it.each([['todo', 'PENDING'], ['in_progress', 'PARTIAL'], ['review', 'PARTIAL'], ['completed', 'COMPLETED']] as const)('mapeia status %s', (status, expected) => {
  expect(toApiTask({ ...draft, status }, 'p').status).toBe(expected);
});
it('usa resposta remota como registro final e preserva campos locais', () => {
  const task = fromApiTask(remote, draft);
  expect(task).toMatchObject({ id: 'uuid', projectId: 'remote-p', project: 'Geral', priority: 'high', status: 'in_progress', subtasks: draft.subtasks, reminders: draft.reminders });
  expect(new Date(task.startDate!).getDate()).toBe(2);
});
it('faz um único POST e retorna ID do servidor', async () => {
  fetchMock.mockResolvedValue(response(remote, 201));
  expect((await createTask(draft, 'remote-p')).id).toBe('uuid');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe(`${API_BASE_URL}/tasks`);
  expect(JSON.parse(options.body)).toMatchObject({ projectId: 'remote-p', priority: 'HIGH' });
});
it('criação usa apenas UUIDs confirmados dos quatro filhos do rascunho, sem duplicar IDs locais', async () => {
  const subtasks = [1, 2, 3, 4].map(index => ({ id: 'local-' + index, title: 'Filho ' + index, done: false }));
  const confirmed = subtasks.map((child, index) => ({ ...child, id: 'sqlite-' + index }));
  fetchMock.mockResolvedValue(response({ ...remote, status: 'PENDING', subtasks: confirmed }, 201));
  const task = await createTask({ ...draft, subtasks }, 'remote-p');
  expect(task.subtasks).toEqual(confirmed.map(child => ({ ...child, remote: true })));
  expect(task.subtasks).toHaveLength(4);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).subtasks).toEqual(subtasks.map(({ title }) => ({ title })));
  expect(task.reminders).toEqual(draft.reminders);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('sem filhos omite o campo e mantém contrato anterior de criação', () => {
  expect(toApiTask({ ...draft, subtasks: [] }, 'p')).not.toHaveProperty('subtasks');
});
it('propaga erro HTTP sem repetir POST nem produzir tarefa local', async () => {
  fetchMock.mockResolvedValue(response({ error: { code: 'PROJECT_NOT_FOUND', message: 'Projeto não encontrado.' } }, 404));
  await expect(createTask(draft, 'missing')).rejects.toMatchObject({ status: 404, code: 'PROJECT_NOT_FOUND' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('informa falha de rede sem retry automático', async () => {
  fetchMock.mockRejectedValue(new Error('network'));
  await expect(createTask(draft, 'p')).rejects.toThrow(/confirmar o salvamento/);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('reutiliza remoteId e não procura por nome', async () => {
  expect(await resolveProject({ id: 'local', remoteId: 'remote', name: 'P', color: '#fff', icon: 'P' })).toBe('remote');
  expect(fetchMock).not.toHaveBeenCalled();
});
it('cria somente o projeto selecionado após 404 e usa seu ID retornado', async () => {
  fetchMock.mockResolvedValueOnce(response({ error: { message: 'Inexistente' } }, 404)).mockResolvedValueOnce(response({ id: 'remote' }, 201));
  expect(await resolveProject({ id: 'p7', name: 'Geral', color: '#fff', icon: 'P' })).toBe('remote');
  expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/projects/p7`);
  expect(fetchMock.mock.calls[1][0]).toBe(`${API_BASE_URL}/projects`);
});
it('não cria projeto quando a consulta falha por rede', async () => {
  fetchMock.mockRejectedValue(new Error('offline'));
  await expect(resolveProject({ id: 'p', name: 'P', color: '#fff', icon: 'P' })).rejects.toBeInstanceOf(ApiError);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('encerra requisição com timeout sem reenvio', async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))));
  const pending = apiRequest('/tasks', 'POST', {});
  const result = pending.catch(error => error);
  await jest.advanceTimersByTimeAsync(15000);
  expect(await result).toBeInstanceOf(ApiError);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

it('getTasks mapeia dados reais com projeto por ID e progress persistido', async () => {
  fetchMock.mockResolvedValue(response([{ ...remote, progress: 42, project: { id: 'remote-p', name: 'Servidor', color: '#fff', icon: 'P' } }]));
  expect(await getTasks()).toEqual([expect.objectContaining({ id: 'uuid', projectId: 'remote-p', project: 'Servidor', progress: 42, status: 'in_progress' })]);
  expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/tasks`);
  expect(fetchMock.mock.calls[0][1].method).toBe('GET');
});
it('getTasks retorna lista vazia', async () => {
  fetchMock.mockResolvedValue(response([]));
  expect(await getTasks()).toEqual([]);
});
it('getTaskById consulta ID codificado e mapeia subtarefas existentes', async () => {
  fetchMock.mockResolvedValue(response({ ...remote, subtasks: [{ id: 's', title: 'SQLite', done: true }] }));
  expect(await getTaskById('uuid/child')).toMatchObject({ id: 'uuid', subtasks: [{ id: 's', title: 'SQLite', done: true }] });
  expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/tasks/uuid%2Fchild`);
});
it.each([404, 500])('propaga erro HTTP %s durante leitura', async status => {
  fetchMock.mockResolvedValue(response({ error: { code: 'TASK_NOT_FOUND', message: 'Tarefa não encontrada.' } }, status));
  await expect(getTaskById('missing')).rejects.toMatchObject({ status, code: 'TASK_NOT_FOUND' });
});
it('falha de rede na leitura usa mensagem de consulta', async () => {
  fetchMock.mockRejectedValue(new Error('offline'));
  await expect(getTasks()).rejects.toThrow(/consultar tarefas/);
});
it.each([['LOW', 'PENDING', 'low', 'todo'], ['MEDIUM', 'PARTIAL', 'medium', 'in_progress'], ['HIGH', 'COMPLETED', 'high', 'completed']] as const)('mapeia leitura %s/%s', (priority, status, mappedPriority, mappedStatus) => {
  expect(fromApiTask({ ...remote, priority, status })).toMatchObject({ priority: mappedPriority, status: mappedStatus });
});
