import { randomUUID } from 'node:crypto';
import { TaskNotFoundError } from '../errors/tasks.js';
import { SubtaskNotFoundError } from '../errors/subtasks.js';
import type { TasksRepository } from '../repositories/tasks.js';
import type { SubtasksRepository } from '../repositories/subtasks.js';
import { nextTimestamp, taskState, recordStatus } from './task-state.js';

export class SubtasksService {
  constructor(private readonly tasks: TasksRepository, private readonly subtasks: SubtasksRepository) {}
  private mutate(taskId: string, operation: (timestamp: string) => boolean) {
    return this.tasks.transaction(() => {
      const task = this.tasks.findById(taskId);
      if (!task) throw new TaskNotFoundError();
      const timestamp = nextTimestamp(task.updatedAt);
      if (!operation(timestamp)) return { task };
      const state = taskState(this.subtasks.findByTaskId(taskId), task.status);
      if (!this.tasks.updateById(taskId, state, timestamp)) throw new TaskNotFoundError();
      this.tasks.recordUpdate(taskId, randomUUID(), timestamp, ['subtasks', 'progress']);
      recordStatus(this.tasks, taskId, task.status, state.status, timestamp);
      return { task: this.tasks.findById(taskId)! };
    });
  }
  create(taskId: string, input: { title: string }) {
    return this.mutate(taskId, timestamp => {
      this.subtasks.create({ ...input, id: randomUUID(), taskId, done: false, createdAt: timestamp, updatedAt: timestamp });
      return true;
    });
  }
  update(taskId: string, id: string, input: { title?: string; done?: boolean }) {
    return this.mutate(taskId, timestamp => {
      const child = this.subtasks.findById(taskId, id);
      if (!child) throw new SubtaskNotFoundError();
      if ((input.title === undefined || input.title === child.title) && (input.done === undefined || input.done === child.done)) return false;
      this.subtasks.update(taskId, id, input, new Date(Math.max(Date.parse(timestamp), Date.parse(child.updatedAt) + 1)).toISOString());
      return true;
    });
  }
  delete(taskId: string, id: string) {
    return this.mutate(taskId, () => {
      if (!this.subtasks.delete(taskId, id)) throw new SubtaskNotFoundError();
      return true;
    });
  }
}
