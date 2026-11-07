import { normalizeRecurrenceCache, preserveRecurrence } from '../models/recurrence';
import { materializeRecurrences } from './recurrenceService';
import { normalizeReminderCache } from '../models/reminder';
import type { SchedulingResult } from './reminderScheduler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { localDay } from '../utils/dashboard';
import type { Project } from '../context/ProjectContext';
import type { Task } from '../context/TaskContext';
import { listProjects, createProject, updateProject } from './projectService';
import { getTasksForSync, importLocalTask, mergeSubtasks } from './taskService';

export const SYNC_LEDGER_KEY = '@taskflow:sync-ledger';
type Entry = { clientId: string; remoteId?: string };
type Ledger = { entries: Record<string, Entry>; snapshots: Record<string, unknown[]> };
export type SyncResult = { projects: Project[]; tasks: Task[]; pending: number; projectsSent: number; tasksSent: number; conflicts: number; reminderSnapshot?: Task[]; scheduling?: SchedulingResult };

// This is an import identity, not a security token. Persist before making a POST.
const newClientId = () => `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function taskFields(task: Task) {
  return JSON.stringify([task.title, task.description ?? '', task.projectId, task.startDateKey ?? localDay(task.startDate), task.dueDateKey ?? localDay(task.dueDate),
    task.time ?? '', task.priority, task.status, task.done, task.reminderTimeZone ?? null,
    task.recurrenceSeriesId ?? null, task.occurrenceKey ?? null, task.recurrence?.frequency ?? 'NONE',
    task.recurrence?.timeZone ?? null, task.recurrence?.anchorDate ?? null,
    [...(task.reminders ?? [])].sort((a, b) => a.offsetMinutes - b.offsetMinutes).map(item => [item.id, item.taskId, item.offsetMinutes])]);
}
export function preserveTask(remote: Task, local?: Task): Task {
  if (!local) {return remote;}
  remote = preserveRecurrence(remote, local);
  local = normalizeRecurrenceCache(normalizeReminderCache(local));
  const { syncSnapshot, syncSnapshots, ...snapshot } = local;
  const versions = [...(syncSnapshots ?? (syncSnapshot ? [syncSnapshot] : []))];
  if (taskFields(local) !== taskFields(remote) && !versions.some(version => JSON.stringify(version) === JSON.stringify(snapshot))) {versions.push(snapshot);}
  return { ...local, ...remote, localId: local.localId, syncPending: undefined,
    syncSnapshot: versions[0], ...(versions.length ? { syncSnapshots: versions } : {}),
    subtasks: mergeSubtasks(remote.subtasks, local.subtasks), reminders: remote.reminders ?? [], legacyReminders: local.legacyReminders };
}

export async function synchronize(projects: Project[], tasks: Task[]): Promise<SyncResult> {
  tasks = tasks.map(task => normalizeRecurrenceCache(normalizeReminderCache(task)));
  await materializeRecurrences();
  // Complete both initial downloads before preparing any upload.
  const remoteProjects = await listProjects();
  const remoteTasks = await getTasksForSync();
  const stored = await AsyncStorage.getItem(SYNC_LEDGER_KEY);
  const ledger: Ledger = stored ? JSON.parse(stored) : { entries: {}, snapshots: {} };
  if (!ledger.entries || !ledger.snapshots || Array.isArray(ledger.entries) || Array.isArray(ledger.snapshots)) {
    throw new Error('Registro de sincronização inválido. Dados preservados.');
  }
  const save = () => AsyncStorage.setItem(SYNC_LEDGER_KEY, JSON.stringify(ledger));
  async function identity(key: string, clientId?: string) {
    if (!ledger.entries[key]) {ledger.entries[key] = { clientId: clientId ?? newClientId() }; await save();}
    return ledger.entries[key];
  }
  async function archive(key: string, value: unknown) {
    const versions = ledger.snapshots[key] ?? [];
    if (!versions.some(version => JSON.stringify(version) === JSON.stringify(value))) {
      ledger.snapshots[key] = [...versions, value]; await save();
    }
  }
  const nextProjects: Project[] = [];
  let projectsSent = 0, tasksSent = 0, conflicts = 0;
  for (const local of projects) {
    const key = `project:${local.id}`;
    const entry = ledger.entries[key];
    const remoteId = local.remoteId ?? entry?.remoteId;
    let remote = remoteProjects.find(item => item.id === (remoteId ?? local.id) ||
      (!!(entry?.clientId ?? local.clientId) && item.clientId === (entry?.clientId ?? local.clientId)));
    if (remoteId && !remote) {
      nextProjects.push({ ...local, remoteId, syncPending: 'Projeto remoto indisponível; referência local preservada.' }); continue;
    }
    if (!remote) {
      const link = await identity(key, local.clientId);
      remote = await createProject(local, link.clientId);
      ledger.entries[key] = { ...link, remoteId: remote.id }; await save();
      projectsSent++;
      if (remote.deletedAt) {
        nextProjects.push({ ...local, remoteId: remote.id, syncPending: 'Projeto remoto excluído; referência local preservada.' }); continue;
      }
    } else if (local.dirty && !!local.updatedAt && local.updatedAt === remote.updatedAt) {
      await archive(key, local);
      remote = await updateProject(remote.id, local); projectsSent++;
    }
    if (JSON.stringify([local.name, local.description ?? '', local.color, local.icon]) !==
        JSON.stringify([remote.name, remote.description ?? '', remote.color, remote.icon])) {
      await archive(key, local); conflicts++;
    }
    nextProjects.push({ ...local, ...remote, id: local.id, remoteId: remote.id, dirty: false, syncPending: undefined });
  }
  for (const remote of remoteProjects) {
    if (!nextProjects.some(item => item.remoteId === remote.id)) {
      if (nextProjects.some(item => item.id === remote.id)) {throw new Error('Colisão de IDs de projetos. Dados preservados.');}
      nextProjects.push({ ...remote, remoteId: remote.id });
    }
  }
  const nextTasks: Task[] = [];
  const represented = new Set<string>();
  for (const local of tasks) {
    const key = `task:${local.localId ?? local.id}`;
    const entry = ledger.entries[key];
    const remoteId = local.remoteId ?? entry?.remoteId;
    let remote = remoteTasks.find(item => item.id === (remoteId ?? local.id) ||
      (!!(entry?.clientId ?? local.clientId) && item.clientId === (entry?.clientId ?? local.clientId)));
    if (!remote && (remoteId || uuid.test(local.id) || local.recurrenceSeriesId || local.occurrenceKey)) {
      nextTasks.push({ ...local, remoteId, syncPending: 'Tarefa remota indisponível; não recriada.' }); continue;
    }
    if (!remote) {
      const project = nextProjects.find(item => !!local.projectId && (item.id === local.projectId || item.remoteId === local.projectId));
      const start = localDay(local.startDate), due = localDay(local.dueDate);
      if (!project?.remoteId || project.syncPending || !start || !due || due < start || !local.title?.trim() || !['high', 'medium', 'low'].includes(local.priority)) {
        nextTasks.push({ ...local, syncPending: 'Tarefa legada com projeto ou datas pendentes; dados preservados.' }); continue;
      }
      await archive(key, local);
      const link = await identity(key, local.clientId);
      remote = await importLocalTask(local, project.remoteId, link.clientId);
      ledger.entries[key] = { ...link, remoteId: remote.id }; await save(); tasksSent++;
    }
    if (represented.has(remote.id)) {await archive(key, local); continue;}
    represented.add(remote.id);
    if (remote.deletedAt) {await archive(key, local); continue;}
    if (taskFields(local) !== taskFields(remote) || local.syncSnapshot) {
      for (const snapshot of local.syncSnapshots ?? (local.syncSnapshot ? [local.syncSnapshot] : [])) {await archive(key, snapshot);}
      const snapshot = { ...local };
      delete snapshot.syncSnapshot;
      delete snapshot.syncSnapshots;
      if (taskFields(local) !== taskFields(remote)) {await archive(key, snapshot);}
      conflicts++;
    }
    const merged = preserveTask(remote, local);
    nextTasks.push({ ...merged, localId: local.localId ?? (local.id !== remote.id ? local.id : undefined), remoteId: remote.id });
  }
  // Consolidate a fresh remote view. Failure here must never publish success.
  const consolidatedProjects = await listProjects();
  const consolidatedTasks = await getTasksForSync();
  const finalProjects: Project[] = nextProjects.map(local => {
    const remote = consolidatedProjects.find(item => item.id === local.remoteId);
    return remote ? { ...local, ...remote, id: local.id, remoteId: remote.id, dirty: false, syncPending: undefined } :
      { ...local, syncPending: 'Projeto remoto indisponível; referência local preservada.' };
  });
  for (const remote of consolidatedProjects) {
    if (!finalProjects.some(item => item.remoteId === remote.id)) {finalProjects.push({ ...remote, remoteId: remote.id });}
  }
  const finalTasks: Task[] = [];
  for (const local of nextTasks) {
    const remote = consolidatedTasks.find(item => item.id === (local.remoteId ?? local.id));
    if (remote?.deletedAt) {await archive(`task:${local.localId ?? local.id}`, local); continue;}
    const merged = remote ? preserveTask(remote, local) : { ...local, ...(local.remoteId ? { syncPending: 'Tarefa remota indisponível; dados locais preservados.' } : {}) };
    if (merged.projectId && !finalProjects.some(item => item.id === merged.projectId || item.remoteId === merged.projectId)) {
      merged.syncPending = 'Vínculo de projeto indisponível; tarefa preservada.';
    }
    finalTasks.push(merged);
  }
  for (const remote of consolidatedTasks) {
    if (!remote.deletedAt && !finalTasks.some(item => (item.remoteId ?? item.id) === remote.id)) {
      finalTasks.push({ ...remote, ...(!finalProjects.some(item => item.remoteId === remote.projectId)
        ? { syncPending: 'Vínculo de projeto indisponível; tarefa preservada.' } : {}) });
    }
  }
  return { projects: finalProjects, tasks: finalTasks, reminderSnapshot: consolidatedTasks,
    pending: finalProjects.filter(item => item.syncPending).length + finalTasks.filter(item => item.syncPending).length,
    projectsSent, tasksSent, conflicts };
}
