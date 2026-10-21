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
import { getTaskHistory, createSubtask, updateSubtask, deleteSubtask, mergeSubtasks } from '../services/taskService';
import type { NewTask, TaskHistoryEvent } from '../services/taskService';
import { deleteTask as remoteDeleteTask, restoreTask as remoteRestoreTask } from '../services/taskService';
import { normalizeTaskStatus } from '../models/taskStatus';
import type { TaskStatus } from '../models/taskStatus';
import { getTaskNotes, createTaskNote, updateTaskNote, deleteTaskNote } from '../services/noteService';
import { synchronize, preserveTask } from '../services/syncService';
import { assertDataAvailable, dataGuard } from '../services/dataGuard';
import { sortNotes } from '../models/note';
import type { Note } from '../models/note';
export type { TaskStatus } from '../models/taskStatus';

export type Priority =
  | 'high'
  | 'medium'
  | 'low';

export type Subtask = {
  id: string;
  title: string;
  done: boolean;
  remote?: boolean;
};

export type Task = {
  id: string;
  remoteId?: string;
  localId?: string;
  clientId?: string;
  deletedAt?: string | null;
  syncPending?: string;
  syncSnapshot?: Omit<Task, 'syncSnapshot' | 'syncSnapshots'>;
  syncSnapshots?: Omit<Task, 'syncSnapshot' | 'syncSnapshots'>[];
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
  syncing: boolean;
  synchronizeManually: () => Promise<import('../services/syncService').SyncResult>;
  readError: string | null;
  loadTaskById: (id: string) => Promise<Task>;
  taskHistory: Record<string, TaskHistoryEvent[]>;
  loadTaskHistory: (id: string) => Promise<void>;
  taskNotes: Record<string, Note[]>;
  loadTaskNotes: (id: string) => Promise<void>;
  addTaskNote: (id: string, content: string) => Promise<{ cacheSaved: boolean }>;
  editTaskNote: (id: string, noteId: string, content: string) => Promise<{ cacheSaved: boolean }>;
  removeTaskNote: (id: string, noteId: string) => Promise<{ cacheSaved: boolean }>;

  toggleTask: (
    id: string,
  ) => Promise<{ task: Task; cacheSaved: boolean }>;

  deleteTask: (id: string) => Promise<{ cacheSaved: boolean }>;
  restoreTask: (id: string) => Promise<{ task: Task; cacheSaved: boolean }>;
  undo: { id: string; expiresAt: number } | null;

  addTask: (
    task: NewTask,
  ) => Promise<{ task: Task; cacheSaved: boolean }>;

  updateTask: (
    id: string,
    updatedTask: Partial<Task>,
  ) => Promise<{ task: Task; cacheSaved: boolean }>;

  updateTaskLocal: (id: string, changes: Partial<Task>) => void;
  addSubtask: (taskId: string, title: string) => Promise<{ task: Task; cacheSaved: boolean }>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<{ task: Task; cacheSaved: boolean }>;
  removeSubtask: (taskId: string, subtaskId: string) => Promise<{ task: Task; cacheSaved: boolean }>;

  getTaskById: (
    id: string,
  ) => Task | undefined;
};

const STORAGE_KEY =
  '@taskflow:tasks';

// Startup reads preserve local candidates; only explicit manual sync uploads them.
function mergeReadTasks(current: Task[], remote: Task[]): Task[] {
  const normalize = (task: Task): Task => {
    const status = task.status ? normalizeTaskStatus(task.status) : task.done ? 'completed' : 'todo';
    return { ...task, status, done: status === 'completed',
      progress: status === 'completed' ? 100 : task.progress === 100 ? 0 : task.progress };
  };
  const byId = new Map(current.map(task => [task.remoteId ?? task.id, normalize(task)]));
  for (const task of remote) {
    const cached = byId.get(task.id);
    // An older in-flight GET must not undo a confirmed PATCH.
    if (cached?.updatedAt && task.updatedAt && Date.parse(task.updatedAt) < Date.parse(cached.updatedAt)) {continue;}
    byId.set(task.id, normalize({
      ...preserveTask(task, cached),
      subtasks: mergeSubtasks(task.subtasks, cached?.subtasks),
      reminders: task.reminders ?? cached?.reminders,
    }));
  }
  return [...byId.values()].filter(task => !task.deletedAt);
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

  const { projects, updateProject, hydrated: projectsHydrated, readError: projectReadError, flushProjects, persistProjects, publishProjects } = useProjects();
  const [syncing, setSyncing] = useState(false);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const deletedIds = useRef(new Set<string>());
  const deletionBusy = useRef(false);
  const [undo, setUndo] = useState<{ id: string; expiresAt: number } | null>(null);
  const undoRef = useRef<{ id: string; expiresAt: number; task: Task } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (undoTimer.current) {clearTimeout(undoTimer.current);} }, []);
  const creating = useRef(false);
  const updating = useRef(new Set<string>());
  // Confirmed notes are kept separately from Task and its persisted cache.
  const [taskNotes, setTaskNotes] = useState<Record<string, Note[]>>({});
  const notesRequests = useRef(new Map<string, number>());
  const loadTaskNotes = useCallback(async (id: string) => {
    const request = (notesRequests.current.get(id) ?? 0) + 1;
    notesRequests.current.set(id, request);
    const notes = await getTaskNotes(id);
    if (notesRequests.current.get(id) === request) {
      setTaskNotes(current => ({ ...current, [id]: sortNotes(notes) }));
    }
  }, []);
  const [taskHistory, setTaskHistory] = useState<Record<string, TaskHistoryEvent[]>>({});
  const historyRequests = useRef(new Map<string, number>());
  const loadTaskHistory = useCallback(async (id: string) => {
    const request = (historyRequests.current.get(id) ?? 0) + 1;
    historyRequests.current.set(id, request);
    const events = await getTaskHistory(id);
    if (historyRequests.current.get(id) === request) {
      setTaskHistory(current => ({ ...current, [id]: events }));
    }
  }, []);
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
        tasksRef.current = mergeReadTasks(tasksRef.current, remote.filter(task => !deletedIds.current.has(task.id)));
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
    if (dataGuard.syncing) {throw new Error('Sincronização em andamento.');}
    const remote = await fetchTaskById(id);
    if (dataGuard.syncing) {throw new Error('Sincronização em andamento.');}
    if (deletedIds.current.has(id)) {throw new Error('Tarefa excluída.');}
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

  async function synchronizeManually() {
    assertDataAvailable();
    if (!hydrated || !projectsHydrated || loading || !cacheWritable.current || projectReadError) {
      throw new Error('Aguarde o carregamento seguro dos dados antes de sincronizar.');
    }
    if (creating.current || updating.current.size || deletionBusy.current || undoRef.current) {
      throw new Error('Aguarde as operações e a janela de desfazer antes de sincronizar.');
    }
    dataGuard.syncing = true;
    setSyncing(true);
    try {
      await storageQueue.current;
      await flushProjects();
      const result = await synchronize(projects, tasksRef.current);
      await persistProjects(result.projects);
      await persistTasks(result.tasks);
      publishProjects(result.projects);
      tasksRef.current = result.tasks;
      setTasks(result.tasks);
      setReadError(null);
      return result;
    } finally {dataGuard.syncing = false; setSyncing(false);}
  }

  async function toggleTask(id: string) {
    const task = tasksRef.current.find(item => item.id === id);
    if (!task) {throw new Error('Tarefa não encontrada.');}
    return updateTask(id, { status: task.status === 'completed' ? 'todo' : 'completed' });
  }

  async function deleteTask(id: string) {
    assertDataAvailable();
    if (!hydrated || loading) {throw new Error('Aguarde o carregamento das tarefas.');}
    if (deletionBusy.current || updating.current.has(id)) {throw new Error('Uma operação já está em andamento.');}
    const task = tasksRef.current.find(item => item.id === id);
    if (!task) {throw new Error('Tarefa não encontrada.');}
    deletionBusy.current = true;
    updating.current.add(id);
    dataGuard.activeTasks++;
    try {
      await remoteDeleteTask(id);
      deletedIds.current.add(id);
      const next = tasksRef.current.filter(item => item.id !== id);
      tasksRef.current = next;
      setTasks(next);
      if (undoTimer.current) {clearTimeout(undoTimer.current);}
      const opportunity = { id, expiresAt: Date.now() + 5000, task };
      undoRef.current = opportunity;
      setUndo({ id, expiresAt: opportunity.expiresAt });
      undoTimer.current = setTimeout(() => {
        if (undoRef.current === opportunity) {undoRef.current = null; setUndo(null);}
      }, 5000);
      try { await persistTasks(next); return { cacheSaved: true }; }
      catch { return { cacheSaved: false }; }
    } finally { deletionBusy.current = false; updating.current.delete(id); dataGuard.activeTasks--; }
  }

  async function restoreTask(id: string) {
    assertDataAvailable();
    const opportunity = undoRef.current;
    if (!opportunity || opportunity.id !== id || Date.now() >= opportunity.expiresAt) {
      throw new Error('O prazo para desfazer terminou.');
    }
    if (deletionBusy.current || updating.current.has(id)) {throw new Error('Uma operação já está em andamento.');}
    deletionBusy.current = true;
    updating.current.add(id);
    dataGuard.activeTasks++;
    try {
      const remote = await remoteRestoreTask(id);
      const task = { ...opportunity.task, ...remote, subtasks: mergeSubtasks(remote.subtasks, opportunity.task.subtasks), reminders: opportunity.task.reminders };
      deletedIds.current.delete(id);
      const next = mergeReadTasks(tasksRef.current, [task]);
      tasksRef.current = next;
      setTasks(next);
      if (undoTimer.current) {clearTimeout(undoTimer.current);}
      undoRef.current = null;
      setUndo(null);
      try { await persistTasks(next); return { task, cacheSaved: true }; }
      catch { return { task, cacheSaved: false }; }
    } finally { deletionBusy.current = false; updating.current.delete(id); dataGuard.activeTasks--; }
  }

  async function addTask(draft: NewTask) {
    assertDataAvailable();
    if (!hydrated || !projectsHydrated) {throw new Error('Aguarde o carregamento dos dados.');}
    if (creating.current) {throw new Error('A criação de tarefa já está em andamento.');}
    const project = projects.find(item => item.id === draft.projectId);
    if (!project) {throw new Error('Selecione um projeto válido.');}
    creating.current = true;
    dataGuard.activeTasks++;
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
      dataGuard.activeTasks--;
    }
  }

  async function updateTask(id: string, changes: Partial<Task>) {
    assertDataAvailable();
    if (!hydrated || !projectsHydrated) {throw new Error('Aguarde o carregamento dos dados.');}
    const current = tasksRef.current.find(task => task.id === id);
    if (!current) {throw new Error('Tarefa não encontrada.');}
    if (updating.current.has(id)) {throw new Error('A atualização da tarefa já está em andamento.');}
    updating.current.add(id);
    dataGuard.activeTasks++;
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
      const confirmedSubtasks = mergeSubtasks(remote.subtasks, changes.subtasks ?? tasksRef.current.find(item => item.id === id)?.subtasks);
      // Old cache-only children are not uploaded. A confirmed collective action
      // applies to their actual cached done values as well as remote children.
      const collective = changes.status === 'completed' || changes.status === 'todo';
      const task: Task = {
        ...current, ...remote,
        subtasks: collective ? confirmedSubtasks?.map(child => child.remote ? child : { ...child, done: remote.done }) : confirmedSubtasks,
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
      updating.current.delete(id); dataGuard.activeTasks--;
    }
  }

  function updateTaskLocal(
    id: string,
    updatedTask:
      Partial<Task>,
  ) {
    assertDataAvailable();
    const next = tasksRef.current.map(task => task.id === id ? { ...task, ...updatedTask } : task);
    tasksRef.current = next;
    setTasks(next);
  }

  async function mutateSubtask(id: string, request: (current: Task) => Promise<Task>) {
    assertDataAvailable();
    if (!hydrated) {throw new Error('Aguarde o carregamento dos dados.');}
    const current = tasksRef.current.find(task => task.id === id);
    if (!current) {throw new Error('Tarefa não encontrada.');}
    if (updating.current.has(id)) {throw new Error('A atualização da tarefa já está em andamento.');}
    updating.current.add(id);
    dataGuard.activeTasks++;
    try {
      const remote = await request(current);
      const task = { ...current, ...remote, subtasks: mergeSubtasks(remote.subtasks, current.subtasks), reminders: current.reminders };
      const next = tasksRef.current.map(item => item.id === id ? task : item);
      tasksRef.current = next;
      setTasks(next);
      try { await persistTasks(next); return { task, cacheSaved: true }; }
      catch { return { task, cacheSaved: false }; }
    } finally { updating.current.delete(id); dataGuard.activeTasks--; }
  }
  function remoteChild(task: Task, id: string) {
    const child = task.subtasks?.find(item => item.id === id);
    if (!child?.remote) {throw new Error('Esta subtarefa está apenas no dispositivo e ainda não pode ser alterada no servidor.');}
    return child;
  }
  const addSubtask = (id: string, title: string) => mutateSubtask(id, () => createSubtask(id, title));
  const toggleSubtask = (id: string, childId: string) => mutateSubtask(id, task => updateSubtask(id, childId, { done: !remoteChild(task, childId).done }));
  const removeSubtask = (id: string, childId: string) => mutateSubtask(id, task => { remoteChild(task, childId); return deleteSubtask(id, childId); });

  async function mutateNote(id: string, operation: () => Promise<Note | { id: string; taskId: string; updatedAt: string }>, remove = false) {
    assertDataAvailable();
    if (!hydrated) {throw new Error('Aguarde o carregamento dos dados.');}
    if (!tasksRef.current.some(task => task.id === id)) {throw new Error('Tarefa não encontrada.');}
    if (updating.current.has(id)) {throw new Error('A atualização da tarefa já está em andamento.');}
    updating.current.add(id);
    dataGuard.activeTasks++;
    try {
      const confirmed = await operation();
      // Invalidate an older GET so it cannot undo the confirmed mutation.
      notesRequests.current.set(id, (notesRequests.current.get(id) ?? 0) + 1);
      setTaskNotes(current => ({ ...current, [id]: sortNotes([
        ...(current[id] ?? []).filter(note => note.id !== confirmed.id),
        ...(!remove && 'content' in confirmed ? [confirmed] : []),
      ]) }));
      const next = tasksRef.current.map(task => task.id === id ? { ...task, updatedAt: confirmed.updatedAt } : task);
      tasksRef.current = next;
      setTasks(next);
      try { await persistTasks(next); return { cacheSaved: true }; }
      catch { return { cacheSaved: false }; }
    } finally { updating.current.delete(id); dataGuard.activeTasks--; }
  }
  const addTaskNote = (id: string, content: string) => mutateNote(id, () => createTaskNote(id, content));
  const editTaskNote = (id: string, noteId: string, content: string) => mutateNote(id, () => updateTaskNote(id, noteId, content));
  const removeTaskNote = (id: string, noteId: string) => mutateNote(id, () => deleteTaskNote(id, noteId), true);

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
        syncing,
        synchronizeManually,
        readError,
        loadTaskById,
        taskHistory,
        loadTaskHistory,
        taskNotes,
        loadTaskNotes,
        addTaskNote,
        editTaskNote,
        removeTaskNote,
        toggleTask,
        deleteTask,
        restoreTask,
        undo,
        addTask,
        updateTask,
        updateTaskLocal,
        addSubtask,
        toggleSubtask,
        removeSubtask,
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
