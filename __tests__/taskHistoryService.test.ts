import { getTaskHistory } from '../src/services/taskService';
import type { TaskHistoryEvent } from '../src/services/taskService';
import { presentTaskHistory } from '../src/models/taskHistory';
import { normalizeTaskStatus } from '../src/models/taskStatus';
const fetchMock = jest.fn();
beforeEach(() => { global.fetch = fetchMock; fetchMock.mockReset(); });
const event: TaskHistoryEvent = { id: 'h', taskId: 't', action: 'STATUS_CHANGED', metadata: { from: 'PENDING', to: 'PARTIAL' }, createdAt: '2026-10-04T12:34:00Z' };
it('consulta endpoint codificado e preserva metadata/timestamps reais', async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [event] });
  expect(await getTaskHistory('id/espaço')).toEqual([event]);
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/tasks\/id%2Fespa%C3%A7o\/history$/);
});
it('histórico vazio não inventa eventos', async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [] });
  expect(await getTaskHistory('t')).toEqual([]);
});
it.each([404, 500])('erro HTTP %s é propagado', async status => {
  fetchMock.mockResolvedValue({ ok: false, status, json: async () => ({ error: { code: 'TASK_NOT_FOUND', message: 'Falha real' } }) });
  await expect(getTaskHistory('t')).rejects.toThrow('Falha real');
});
it('indisponibilidade é propagada sem fabricar histórico', async () => {
  fetchMock.mockRejectedValue(new TypeError('offline'));
  await expect(getTaskHistory('t')).rejects.toThrow();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it.each(['CREATED', 'UPDATED', 'STATUS_CHANGED', 'COMPLETED', 'REOPENED'] as const)('apresenta %s com data/hora do evento', action => {
  const presentation = presentTaskHistory({ ...event, action });
  expect(presentation.title).toBeTruthy();
  expect(presentation.time).toBe(new Date(event.createdAt).toLocaleString('pt-BR'));
  expect(presentation.description).toBe('A fazer → Em andamento');
});
it('metadata ausente não produz pessoas ou alterações fictícias', () => {
  expect(presentTaskHistory({ ...event, action: 'CREATED', metadata: null }).description).toBe('');
});
it.each([['todo', 'todo'], ['in_progress', 'in_progress'], ['completed', 'completed'], ['review', 'in_progress']] as const)('normaliza %s para %s', (input, expected) => {
  expect(normalizeTaskStatus(input)).toBe(expected);
});
