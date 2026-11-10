jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
import AsyncStorage from '@react-native-async-storage/async-storage';
import { completeRecurrenceDeletion, pendingRecurrenceDeletions, recordRecurrenceDeletion, RECURRENCE_DELETIONS_KEY } from '../src/services/recurrenceDeletionJournal';
let raw: string | null;
const entry = { seriesId: 'series', input: { scope: 'future' as const, taskId: 'task', occurrenceKey: '2026-11-10', expectedUpdatedAt: '2026-11-10T15:00:00Z' } };
beforeEach(() => {
  raw = null;
  jest.mocked(AsyncStorage.getItem).mockImplementation(async () => raw);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (_key, value) => {raw = value;});
});
it('intenção persistida, retry igual e conclusão não removem outra série', async () => {
  await recordRecurrenceDeletion(entry); await recordRecurrenceDeletion(entry);
  await recordRecurrenceDeletion({ ...entry, seriesId: 'other' });
  expect(await pendingRecurrenceDeletions()).toHaveLength(2);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(RECURRENCE_DELETIONS_KEY, expect.any(String));
  await completeRecurrenceDeletion('series');
  expect(await pendingRecurrenceDeletions()).toEqual([{ ...entry, seriesId: 'other' }]);
});
it('escopo diferente não sobrescreve intenção incerta e cache inválido é preservado', async () => {
  await recordRecurrenceDeletion(entry);
  await expect(recordRecurrenceDeletion({ ...entry, input: { ...entry.input, scope: 'all' } })).rejects.toThrow('pendente');
  raw = '{broken';
  await expect(pendingRecurrenceDeletions()).rejects.toThrow();
  expect(raw).toBe('{broken');
});
it('falha de storage não confirma intenção fictícia', async () => {
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk'));
  await expect(recordRecurrenceDeletion(entry)).rejects.toThrow('disk');
  expect(await pendingRecurrenceDeletions()).toEqual([]);
});
