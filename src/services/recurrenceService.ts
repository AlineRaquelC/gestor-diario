import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, ApiError } from './api';
import type { ApiTask } from './taskService';
import { recurrenceSummary } from '../models/recurrence';
import type {
  RecurrenceSeries,
  RecurrenceFrequency,
} from '../models/recurrence';

export const RECURRENCE_REQUESTS_KEY = '@taskflow:recurrence-requests:v1';
type Entry = {
  clientId: string;
  fingerprint: string;
  state: 'pending' | 'confirmed' | 'rejected';
};
type Journal = Record<string, Entry>;
let storageQueue: Promise<unknown> = Promise.resolve();
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const result = storageQueue.catch(() => undefined).then(work);
  storageQueue = result;
  return result;
}
async function readJournal(): Promise<Journal> {
  const raw = await AsyncStorage.getItem(RECURRENCE_REQUESTS_KEY);
  const journal: Journal = raw ? JSON.parse(raw) : {};
  if (
    !journal ||
    Array.isArray(journal) ||
    Object.values(journal).some(
      entry =>
        !entry ||
        !entry.clientId ||
        typeof entry.fingerprint !== 'string' ||
        !['pending', 'confirmed', 'rejected'].includes(entry.state),
    )
  ) {
    throw new Error(
      'Registro de criação recorrente inválido. Dados preservados.',
    );
  }
  return journal;
}
export const newRecurrenceRequestId = () =>
  `recurrence-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}-${Math.random().toString(36).slice(2)}`;
/** Durable intent before POST; a lost response retains its clientId across retries. */
export async function durableRecurrenceRequest<T>(
  requestId: string,
  payload: unknown,
  send: (clientId: string, retry: boolean) => Promise<T>,
): Promise<T> {
  if (!requestId) {
    throw new Error('Identidade da criação recorrente obrigatória.');
  }
  const fingerprint = JSON.stringify(payload);
  const entry = await serialize(async () => {
    const journal = await readJournal();
    const previous = journal[requestId];
    if (
      previous &&
      previous.state !== 'rejected' &&
      previous.fingerprint !== fingerprint
    ) {
      throw new Error(
        'Confirme a tentativa de criação anterior com os mesmos dados antes de alterá-los.',
      );
    }
    const pending = Object.values(journal).find(
      item => item.state === 'pending' && item.fingerprint === fingerprint,
    );
    const saved = previous?.state !== 'rejected' ? previous : undefined;
    const retry = !!(saved || pending);
    const record: Entry = saved ??
      pending ?? { clientId: requestId, fingerprint, state: 'pending' };
    journal[requestId] = record;
    await AsyncStorage.setItem(
      RECURRENCE_REQUESTS_KEY,
      JSON.stringify(journal),
    );
    return { ...record, retry };
  });
  async function mark(state: Entry['state']) {
    await serialize(async () => {
      const journal = await readJournal();
      for (const item of Object.values(journal)) {
        if (item.clientId === entry.clientId) {
          item.state = state;
        }
      }
      await AsyncStorage.setItem(
        RECURRENCE_REQUESTS_KEY,
        JSON.stringify(journal),
      );
    });
  }
  try {
    const result = await send(entry.clientId, entry.retry);
    // API confirmation is never turned into a failed creation by a journal warning.
    try {
      await mark('confirmed');
    } catch {
      /* Durable pending identity remains safe for retry. */
    }
    return result;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status !== undefined &&
      [400, 404, 409].includes(error.status)
    ) {
      try {
        await mark('rejected');
      } catch {
        /* Preserve uncertain intent if storage is unavailable. */
      }
    }
    throw error;
  }
}
export type SeriesCreationResult = {
  series: RecurrenceSeries;
  firstOccurrence: ApiTask;
};
export function checkedSeries(series: RecurrenceSeries): RecurrenceSeries {
  recurrenceSummary(series);
  if (
    !series.id ||
    !series.clientId ||
    !series.template ||
    !series.firstOccurrenceKey
  ) {
    throw new Error('Série inválida na resposta da API.');
  }
  return series;
}
export async function getRecurrenceSeries(id: string) {
  return checkedSeries(
    await apiRequest<RecurrenceSeries>(
      `/recurrence-series/${encodeURIComponent(id)}`,
    ),
  );
}
export async function updateRecurrenceSeries(
  id: string,
  input: {
    expectedUpdatedAt: string;
    taskId: string;
    frequency: RecurrenceFrequency;
  },
) {
  return checkedSeries(
    await apiRequest<RecurrenceSeries>(
      `/recurrence-series/${encodeURIComponent(id)}`,
      'PATCH',
      input,
    ),
  );
}
export async function activateRecurrence(
  taskId: string,
  input: { frequency: RecurrenceFrequency; timeZone: string },
  requestId: string,
) {
  const path = `/recurrence-series/from-task/${encodeURIComponent(taskId)}`;
  return durableRecurrenceRequest(
    requestId,
    { path, ...input },
    async clientId => {
      const result = await apiRequest<SeriesCreationResult>(path, 'POST', {
        ...input,
        clientId,
      });
      checkedSeries(result.series);
      if (
        result.firstOccurrence.id !== taskId ||
        result.firstOccurrence.recurrenceSeriesId !== result.series.id
      ) {
        throw new Error('Identidade da ativação não confirmada.');
      }
      return result;
    },
  );
}
let materializing: Promise<void> | null = null;
/** Coalesces simultaneous controlled refreshes; neither GETs nor UI renders generate. */
export function materializeRecurrences(): Promise<void> {
  if (!materializing) {
    materializing = apiRequest<unknown>(
      '/recurrence-series/materialize',
      'POST',
      {},
    )
      .then(() => undefined)
      .finally(() => {
        materializing = null;
      });
  }
  return materializing;
}
