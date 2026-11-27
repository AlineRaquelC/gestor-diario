import type { Priority } from '../context/TaskContext';

/** Transient input only. Never persisted as a source or raw QR. */
export type ExternalTaskDraft = {
  title?: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  priority?: Priority;
  warnings: string[];
};
