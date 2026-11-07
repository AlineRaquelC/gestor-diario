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
};
const initial: SearchState = { phase: 'idle', ids: new Set(), error: null };
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
    setState({ ...initial, phase: normalizeSearch(value) ? 'typing' : 'idle' });
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
    setState({ ...initial, phase: 'typing' });
    let active = true;
    const current = () => active && request === sequence.current;
    const timer = setTimeout(async () => {
      if (!current()) {
        return;
      }
      setState({ ...initial, phase: 'loading' });
      try {
        const result = await searchTasks(normalized, current);
        if (current() && result !== null) {
          setState({
            phase: 'results',
            ids: new Set(result.map(task => task.id)),
            error: null,
          });
        }
      } catch (error) {
        if (current()) {
          setState({
            ...initial,
            phase: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'Não foi possível buscar tarefas.',
          });
        }
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [normalized, query, refresh, searchRevision, searchTasks]);
  const allowed = !normalized
    ? tasks
    : state.phase === 'results'
    ? tasks.filter(task => state.ids.has(task.id))
    : state.phase === 'error'
    ? tasks.filter(
        task =>
          containsSearch(task.title, normalized) ||
          containsSearch(task.description, normalized),
      )
    : [];
  return {
    query,
    changeQuery,
    retry,
    cancel,
    phase: state.phase,
    error: state.error,
    tasks: allowed,
    active: !!normalized,
  };
}
