import { randomUUID } from 'node:crypto';
import { TaskNotFoundError } from '../errors/tasks.js';
import { NoteNotFoundError } from '../errors/notes.js';
import type { TasksRepository } from '../repositories/tasks.js';
import type { NotesRepository } from '../repositories/notes.js';
import { nextTimestamp } from './task-state.js';

export class NotesService {
  constructor(private readonly tasks: TasksRepository, private readonly notes: NotesRepository) {}
  findAll(taskId: string) {
    if (!this.tasks.findById(taskId)) throw new TaskNotFoundError();
    return this.notes.findByTaskId(taskId);
  }
  private mutate<T>(taskId: string, operation: (timestamp: string) => T) {
    return this.tasks.transaction(() => {
      const task = this.tasks.findById(taskId);
      if (!task) throw new TaskNotFoundError();
      const timestamp = nextTimestamp(task.updatedAt);
      const result = operation(timestamp);
      if (!this.tasks.updateById(taskId, {}, timestamp)) throw new TaskNotFoundError();
      this.tasks.recordUpdate(taskId, randomUUID(), timestamp, ['notes']);
      return result;
    });
  }
  create(taskId: string, input: { content: string }) {
    return this.mutate(taskId, timestamp => this.notes.create({
      id: randomUUID(), taskId, content: input.content,
      createdAt: timestamp, updatedAt: timestamp,
    }));
  }
  update(taskId: string, id: string, input: { content: string }) {
    return this.mutate(taskId, timestamp => {
      if (!this.notes.findById(taskId, id)) throw new NoteNotFoundError();
      return this.notes.update(taskId, id, input.content, timestamp)!;
    });
  }
  delete(taskId: string, id: string) {
    return this.mutate(taskId, timestamp => {
      if (!this.notes.delete(taskId, id)) throw new NoteNotFoundError();
      return { id, taskId, updatedAt: timestamp };
    });
  }
}
