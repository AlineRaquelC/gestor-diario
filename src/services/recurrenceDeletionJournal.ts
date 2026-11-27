import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RecurrenceDeletionInput } from './recurrenceService';

export const RECURRENCE_DELETIONS_KEY = '@taskflow:recurrence-deletions:v1';
export type PendingRecurrenceDeletion = { seriesId: string; input: RecurrenceDeletionInput };
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.catch(() => undefined).then(operation); queue = result; return result;
}
async function read(): Promise<PendingRecurrenceDeletion[]> {
  const raw = await AsyncStorage.getItem(RECURRENCE_DELETIONS_KEY);
  const entries = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(entries) || entries.some(entry => !entry || typeof entry.seriesId !== 'string' || !entry.input ||
    !['future', 'all'].includes(entry.input.scope) || typeof entry.input.taskId !== 'string' ||
    typeof entry.input.occurrenceKey !== 'string' || typeof entry.input.expectedUpdatedAt !== 'string')) {
    throw new Error('Registro de exclusão recorrente inválido. Dados preservados.');
  }
  return entries;
}
export const pendingRecurrenceDeletions = () => serial(read);
export const recordRecurrenceDeletion = (entry: PendingRecurrenceDeletion) => serial(async () => {
  const entries = await read();
  const previous = entries.find(item => item.seriesId === entry.seriesId);
  if (previous && JSON.stringify(previous) !== JSON.stringify(entry)) {throw new Error('Confirme a exclusão pendente desta série antes de outra operação.');}
  if (!previous) {entries.push(entry);}
  await AsyncStorage.setItem(RECURRENCE_DELETIONS_KEY, JSON.stringify(entries));
});
export const completeRecurrenceDeletion = (seriesId: string) => serial(async () => {
  const entries = await read();
  await AsyncStorage.setItem(RECURRENCE_DELETIONS_KEY, JSON.stringify(entries.filter(entry => entry.seriesId !== seriesId)));
});
