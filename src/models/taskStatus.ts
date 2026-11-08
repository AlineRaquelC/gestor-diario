export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type LegacyTaskStatus = TaskStatus | 'review';

export function normalizeTaskStatus(status: LegacyTaskStatus): TaskStatus {
  return status === 'review' ? 'in_progress' : status;
}
