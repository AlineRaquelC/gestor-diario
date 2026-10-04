import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProjects } from './ProjectContext';
import { createTask, resolveProject, getTasks, getTaskById as fetchTaskById, updateTask as patchTask } from '../services/taskService';
import type { NewTask } from '../services/taskService';

export type Priority =
  | 'high'
  | 'medium'
  | 'low';

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'completed';

export type Subtask = {
  id: string;
  title: string;
  done: boolean;
};

export type Task = {
  id: string;
  projectId?: string;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;

  title: string;

  description?: string;

  project: string;

  time?: string;

  priority: Priority;

  status: TaskStatus;

  done: boolean;

  startDate?: string;

  dueDate?: string;

  subtasks?: Subtask[];

  reminders?: string[];
};

type TaskContextType = {
  tasks: Task[];
  loading: boolean;
  readError: string | null;
  loadTaskById: (id: string) => Promise<Task>;

  toggleTask: (
    id: string,
  ) => void;

  deleteTask: (
    id: string,
  ) => void;

  addTask: (
    task: NewTask,
  ) => Promise<{ task: Task; cacheSaved: boolean }>;

  updateTask: (
    id: string,
    updatedTask: Partial<Task>,
  ) => Promise<{ task: Task; cacheSaved: boolean }>;

  updateTaskLocal: (id: string, changes: Partial<Task>) => void;

  getTaskById: (
    id: string,
  ) => Task | undefined;
};

const STORAGE_KEY =
  '@taskflow:tasks';

// Read-only reconciliation: retain cache-only records until Issue #12.
function mergeReadTasks(current: Task[], remote: Task[]): Task[] {
  const byId = new Map(current.map(task => [task.id, task]));
  for (const task of remote) {
    const cached = byId.get(task.id);
    // An older in-flight GET must not undo a confirmed PATCH.
    if (cached?.updatedAt && task.updatedAt && Date.parse(task.updatedAt) < Date.parse(cached.updatedAt)) {continue;}
    byId.set(task.id, {
      ...cached, ...task,
      subtasks: task.subtasks ?? cached?.subtasks,
      reminders: task.reminders ?? cached?.reminders,
    });
  }
  return [...byId.values()];
}

const TaskContext =
  createContext<
    TaskContextType | undefined
  >(undefined);

export function TaskProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    tasks,
    setTasks,
  ] = useState<Task[]>(
    [],
  );

  const { projects, updateProject, hydrated: projectsHydrated } = useProjects();
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const creating = useRef(false);
  const updating = useRef(new Set<string>());
  const cacheWritable = useRef(false);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const storageQueue = useRef<Promise<unknown>>(Promise.resolve());

  const persistTasks = useCallback((list: Task[]) => {
    if (!cacheWritable.current) {return Promise.reject(new Error('Cache não foi carregado com segurança.'));}
    const write = storageQueue.current.catch(() => undefined).then(() =>
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)),
    );
    storageQueue.current = write;
    return write;
  }, []);

  /*
   * Evita salvar os dados iniciais
   * antes de terminar de carregar
   * o AsyncStorage.
   */
  const [
    hydrated,
    setHydrated,
  ] = useState(false);

  /*
   * Carrega as tarefas salvas
   * quando o aplicativo inicia.
   */
  useEffect(() => {
    let active = true;
    async function loadTasks() {
      let cacheError: string | null = null;
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const cached: Task[] = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(cached) || cached.some(task => !task || typeof task.id !== 'string')) {
          throw new Error('Cache inválido.');
        }
        if (!active) {return;}
        cacheWritable.current = true;
        tasksRef.current = mergeReadTasks([], cached);
        setTasks(tasksRef.current);
      } catch {
        cacheError = 'Não foi possível carregar o cache de tarefas. O cache original foi preservado.';
      }
      if (!active) {return;}
      setHydrated(true);
      setReadError(cacheError);
      try {
        const remote = await getTasks();
        if (!active) {return;}
        tasksRef.current = mergeReadTasks(tasksRef.current, remote);
        setTasks(tasksRef.current);
      } catch (error) {
        if (active) {setReadError([cacheError, error instanceof Error ? error.message : 'Erro ao consultar tarefas.'].filter(Boolean).join(' '));}
      } finally {
        if (active) {setLoading(false);}
      }
    }
    loadTasks();
    return () => { active = false; };
  }, []);

  const loadTaskById = useCallback(async (id: string) => {
    const remote = await fetchTaskById(id);
    const next = mergeReadTasks(tasksRef.current, [remote]);
    tasksRef.current = next;
    setTasks(next);
    return next.find(task => task.id === remote.id)!;
  }, []);

  /*
   * Sempre que a lista mudar,
   * salva automaticamente.
   */
  useEffect(() => {
    if (!hydrated || !cacheWritable.current) {
      return;
    }

    async function saveTasks() {
      try {
        await persistTasks(tasks);
      } catch (error) {
        console.log(
          'Erro ao salvar tarefas:',
          error,
        );
        setReadError('Tarefas disponíveis, mas não foi possível atualizar o cache.');
      }
    }

    saveTasks();
  }, [
    tasks,
    hydrated,
    persistTasks,
  ]);

  function toggleTask(
    id: string,
  ) {
    setTasks(current =>
      current.map(task => {
        if (
          task.id !== id
        ) {
          return task;
        }

        const newDone =
          !task.done;

        return {
          ...task,

          done:
            newDone,

          status:
            newDone
              ? 'completed'
              : 'in_progress',
        };
      }),
    );
  }

  function deleteTask(
    id: string,
  ) {
    setTasks(current =>
      current.filter(
        task =>
          task.id !== id,
      ),
    );
  }

  async function addTask(draft: NewTask) {
    if (!hydrated || !projectsHydrated) {throw new Error('Aguarde o carregamento dos dados.');}
    if (creating.current) {throw new Error('A criação de tarefa já está em andamento.');}
    const project = projects.find(item => item.id === draft.projectId);
    if (!project) {throw new Error('Selecione um projeto válido.');}
    creating.current = true;
    try {
      const remoteId = await resolveProject(project);
      if (remoteId !== project.remoteId) {updateProject(project.id, { remoteId });}
      const task = await createTask(draft, remoteId);
      const nextTasks = [...tasksRef.current.filter(item => item.id !== task.id), task];
      tasksRef.current = nextTasks;
      setTasks(nextTasks);
      try {
        await persistTasks(nextTasks);
        return { task, cacheSaved: true };
      } catch {
        // The remote task exists: report a cache warning, never repeat POST.
        return { task, cacheSaved: false };
      }
    } finally {
      creating.current = false;
    }
  }

  async function updateTask(id: string, changes: Partial<Task>) {
    if (!hydrated || !projectsHydrated) {throw new Error('Aguarde o carregamento dos dados.');}
    const current = tasksRef.current.find(task => task.id === id);
    if (!current) {throw new Error('Tarefa não encontrada.');}
    if (updating.current.has(id)) {throw new Error('A atualização da tarefa já está em andamento.');}
    updating.current.add(id);
    try {
      const payload = { ...changes };
      if (changes.projectId !== undefined) {
        const project = projects.find(item => item.id === changes.projectId || item.remoteId === changes.projectId);
        if (project) {
          const remoteId = await resolveProject(project);
          if (remoteId !== project.remoteId) {updateProject(project.id, { remoteId });}
          payload.projectId = remoteId;
        } else if (changes.projectId !== current.projectId) {
          throw new Error('Selecione um projeto válido.');
        }
      }
      const remote = await patchTask(id, payload, current);
      const task: Task = {
        ...remote,
        subtasks: changes.subtasks ?? remote.subtasks ?? tasksRef.current.find(item => item.id === id)?.subtasks,
        reminders: changes.reminders ?? current.reminders,
      };
      const next = tasksRef.current.map(item => item.id === id ? task : item);
      tasksRef.current = next;
      setTasks(next);
      try {
        await persistTasks(next);
        return { task, cacheSaved: true };
      } catch {
        return { task, cacheSaved: false };
      }
    } finally {
      updating.current.delete(id);
    }
  }

  function updateTaskLocal(
    id: string,
    updatedTask:
      Partial<Task>,
  ) {
    setTasks(current =>
      current.map(task =>
        task.id === id
          ? {
              ...task,
              ...updatedTask,
            }
          : task,
      ),
    );
  }

  function getTaskById(
    id: string,
  ) {
    return tasks.find(
      task =>
        task.id === id,
    );
  }

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        readError,
        loadTaskById,
        toggleTask,
        deleteTask,
        addTask,
        updateTask,
        updateTaskLocal,
        getTaskById,
      }}>

      {children}

    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context =
    useContext(
      TaskContext,
    );

  if (!context) {
    throw new Error(
      'useTasks deve ser usado dentro de TaskProvider',
    );
  }

  return context;
}
