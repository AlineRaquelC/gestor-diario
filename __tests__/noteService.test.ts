import { getTaskNotes, createTaskNote, updateTaskNote, deleteTaskNote } from '../src/services/noteService';
import { API_BASE_URL } from '../src/services/api';
const note = { id: 'n', taskId: 't/id', content: 'Texto', createdAt: '2026-10-04T12:00:00Z', updatedAt: '2026-10-04T12:00:00Z' };
const fetchMock = jest.fn();
beforeEach(() => { global.fetch = fetchMock; fetchMock.mockReset(); });
it('GET consulta somente notas e preserva IDs/conteúdo/timestamps reais', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => [note] });
  expect(await getTaskNotes('t/id')).toEqual([note]);
  expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/tasks/t%2Fid/notes`);
  expect(fetchMock.mock.calls[0][1].method).toBe('GET');
});
it('POST envia somente content e retorna Note confirmada', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => note });
  expect(await createTaskNote('t/id', 'Texto')).toEqual(note);
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ content: 'Texto' }) });
});
it('PATCH codifica IDs e envia somente content, sem alterar createdAt', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ...note, content: 'Editada', updatedAt: '2026-10-04T13:00:00Z' }) });
  expect(await updateTaskNote('t/id', 'n/id', 'Editada')).toMatchObject({ content: 'Editada', createdAt: note.createdAt });
  expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/tasks/t%2Fid/notes/n%2Fid`);
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ content: 'Editada' }) });
});
it('DELETE sem payload retorna confirmação com updatedAt do pai', async () => {
  const ack = { id: 'n', taskId: 't', updatedAt: note.updatedAt };
  fetchMock.mockResolvedValue({ ok: true, json: async () => ack });
  expect(await deleteTaskNote('t', 'n')).toEqual(ack);
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE', body: undefined });
});
it('GET lista vazia retorna [] sem dados fictícios', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => [] }); expect(await getTaskNotes('t')).toEqual([]);
});
it.each([getTaskNotes.bind(null, 't'), createTaskNote.bind(null, 't', 'Texto'), updateTaskNote.bind(null, 't', 'n', 'Texto'), deleteTaskNote.bind(null, 't', 'n')])('offline propaga falha sem retry automático', async operation => {
  fetchMock.mockRejectedValue(new Error('offline')); await expect(operation()).rejects.toThrow(/conexão/); expect(fetchMock).toHaveBeenCalledTimes(1);
});
it.each([400, 404, 500])('propaga erro HTTP %s no padrão da API', async status => {
  fetchMock.mockResolvedValue({ ok: false, status, json: async () => ({ error: { code: 'NOTE_NOT_FOUND', message: 'Observação não encontrada.' } }) });
  await expect(updateTaskNote('t', 'n', 'Texto')).rejects.toMatchObject({ status, code: 'NOTE_NOT_FOUND' });
});
