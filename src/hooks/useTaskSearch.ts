import { useCallback, useEffect, useRef, useState } from 'react';
import { useTasks } from '../context/TaskContext';
import {
  containsSearch,
  normalizeSearch,
} from '../../backend/src/domain/search';

type SearchState = {
  phase: 'idle' | 'typing' | 'loading' | 'results' | 'error';
  ids: Set<string>;
  error: string | null;
  confirmedQuery: string | null;
};
const canonicalTaskId = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const initial: SearchState = {
  phase: 'idle',
  ids: new Set(),
  error: null,
  confirmedQuery: null,
};
export function useTaskSearch() {
  const { tasks, searchTasks, searchRevision } = useTasks();
  const [query, setQuery] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<SearchState>(initial);
  const sequence = useRef(0);
  const queryRef = useRef('');
  const normalized = normalizeSearch(query);
  const changeQuery = useCallback((value: string) => {
    if (value === queryRef.current) {
      return;
    }
    queryRef.current = value;
    sequence.current++;
    setQuery(value);
    setState(previous =>
      normalizeSearch(value)
        ? { ...previous, phase: 'typing', error: null }
        : initial,
    );
  }, []);
  const retry = useCallback(() => {
    sequence.current++;
    setRefresh(value => value + 1);
  }, []);
  const cancel = useCallback(() => {
    sequence.current++;
  }, []);
  useEffect(() => {
    const request = ++sequence.current;
    if (!normalized) {
      setState(initial);
      return;
    }
    setState(previous => ({ ...previous, phase: 'typing', error: null }));
    let active = true;
    const current = () => active && request === sequence.current;
    const timer = setTimeout(async () => {
      if (!current()) {
        return;
      }
      setState(previous => ({ ...previous, phase: 'loading', error: null }));
      try {
        const result = await searchTasks(normalized, current);
        if (current() && result !== null) {
          setState({
            phase: 'results',
            ids: new Set(result.map(task => task.id)),
            error: null,
            confirmedQuery: normalized,
          });
        }
      } catch (error) {
        if (current()) {
          setState(previous => ({
            ...previous,
            phase: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'Não foi possível buscar tarefas.',
          }));
        }
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [normalized, query, refresh, searchRevision, searchTasks]);
  const localMatches = normalized
    ? tasks.filter(
        task =>
          !task.remoteId &&
          !task.recurrenceSeriesId &&
          !canonicalTaskId.test(task.id) &&
          (containsSearch(task.title, normalized) ||
            containsSearch(task.description, normalized)),
      )
    : [];
  const localIds = new Set(localMatches.map(task => task.id));
  const allowed = !normalized
    ? tasks
    : state.phase === 'results'
    ? tasks.filter(task => state.ids.has(task.id) || localIds.has(task.id))
    : state.phase === 'error'
    ? tasks.filter(
        task =>
          (state.confirmedQuery === normalized && state.ids.has(task.id)) ||
          containsSearch(task.title, normalized) ||
          containsSearch(task.description, normalized),
      )
    : state.confirmedQuery !== null
    ? tasks.filter(task => state.ids.has(task.id))
    : tasks;
  return {
    query,
    changeQuery,
    retry,
    cancel,
    phase: state.phase,
    error: state.error,
    tasks: allowed,
    active: !!normalized,
    localOnlyMatches: state.phase === 'results' && localMatches.length > 0,
    retained:
      state.phase === 'error' &&
      state.confirmedQuery === normalized &&
      state.ids.size > 0,
  };
}
