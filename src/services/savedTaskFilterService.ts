import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  copyTaskFilters,
  validTaskFilters,
  SAVED_FILTER_NAME_LIMIT,
} from '../models/savedTaskFilter';
import type { SavedTaskFilter } from '../models/savedTaskFilter';
import type { TaskFilters } from '../utils/taskFilters';
import { activeFilterCount } from '../utils/taskFilters';

export const SAVED_TASK_FILTERS_KEY = '@taskflow:saved-task-filters:v1';
const invalid = () =>
  new Error(
    'Não foi possível ler os filtros salvos. Os dados foram preservados.',
  );
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.catch(() => undefined).then(work);
  queue = result;
  return result;
}
async function read(): Promise<SavedTaskFilter[]> {
  const raw = await AsyncStorage.getItem(SAVED_TASK_FILTERS_KEY);
  if (raw === null) {
    return [];
  }
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.items)) {
      throw invalid();
    }
    const ids = new Set<string>();
    for (const item of data.items) {
      if (
        !item ||
        typeof item.id !== 'string' ||
        !item.id.trim() ||
        ids.has(item.id) ||
        typeof item.name !== 'string' ||
        !item.name.trim() ||
        item.name !== item.name.trim() ||
        item.name.length > SAVED_FILTER_NAME_LIMIT ||
        !validTaskFilters(item.filters) ||
        !['createdAt', 'updatedAt'].every(
          key =>
            typeof item[key] === 'string' &&
            Number.isFinite(Date.parse(item[key])),
        ) ||
        Object.keys(item).sort().join(',') !==
          'createdAt,filters,id,name,updatedAt'
      ) {
        throw invalid();
      }
      ids.add(item.id);
    }
    return data.items;
  } catch {
    throw invalid();
  }
}
const write = (items: SavedTaskFilter[]) =>
  AsyncStorage.setItem(
    SAVED_TASK_FILTERS_KEY,
    JSON.stringify({ version: 1, items }),
  );
export const loadSavedFilters = () => serialize(read);
export function createSavedFilter(name: string, filters: TaskFilters) {
  const snapshot = copyTaskFilters(filters);
  return serialize(async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > SAVED_FILTER_NAME_LIMIT) {
      throw new Error(
        `Informe um nome de até ${SAVED_FILTER_NAME_LIMIT} caracteres.`,
      );
    }
    if (!validTaskFilters(snapshot) || !activeFilterCount(snapshot)) {
      throw new Error('Selecione ao menos um filtro antes de salvar.');
    }
    const items = await read();
    let id: string;
    let attempt = 0;
    do {
      id = `filter-${Date.now().toString(36)}-${attempt++}-${Math.random()
        .toString(36)
        .slice(2)}-${Math.random().toString(36).slice(2)}`;
    } while (items.some(item => item.id === id));
    const stamp = new Date().toISOString();
    const item: SavedTaskFilter = {
      id,
      name: trimmed,
      filters: snapshot,
      createdAt: stamp,
      updatedAt: stamp,
    };
    await write([...items, item]);
    return item;
  });
}
export const deleteSavedFilter = (id: string) =>
  serialize(async () => {
    const items = await read();
    await write(items.filter(item => item.id !== id));
  });
