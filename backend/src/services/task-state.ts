import { randomUUID } from 'node:crypto';
import type { TasksRepository } from '../repositories/tasks.js';

type Status = 'PENDING' | 'PARTIAL' | 'COMPLETED';
export function taskState(children: { done: boolean }[], status: Status) {
  const progress = children.length
    ? Math.round(children.filter(child => child.done).length / children.length * 100)
    : status === 'COMPLETED' ? 100 : 0;
  const nextStatus: Status = children.length
    ? progress === 100 ? 'COMPLETED' : progress === 0 ? 'PENDING' : 'PARTIAL'
    : status;
  return { progress, status: nextStatus, done: nextStatus === 'COMPLETED' };
}
export function nextTimestamp(previous: string) {
  return new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();
}
export function recordStatus(repository: TasksRepository, id: string, from: Status, to: Status, createdAt: string) {
  if (from === to) return;
  const action = to === 'COMPLETED' ? 'COMPLETED' : from === 'COMPLETED' ? 'REOPENED' : 'STATUS_CHANGED';
  repository.createHistoryEvent({ id: randomUUID(), taskId: id, action, createdAt, metadata: { from, to } });
}
