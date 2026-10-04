import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ProjectError } from '../errors/projects.js';
import { TaskValidationError, TaskNotFoundError } from '../errors/tasks.js';
import { ProjectsRepository } from '../repositories/projects.js';
import { TasksRepository } from '../repositories/tasks.js';
import type { CreateTask, UpdateTask } from '../schemas/tasks.js';
import { SubtasksRepository } from '../repositories/subtasks.js';
import { taskState, recordStatus } from './task-state.js';

export const taskTimeZone = process.env.TASK_TIMEZONE ?? 'America/Sao_Paulo';

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function localToday(now: Date, timeZone = taskTimeZone) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export class TasksService {
  constructor(
    private readonly repository: TasksRepository,
    private readonly projects: ProjectsRepository,
    private readonly subtasks: SubtasksRepository,
  ) {}

  findAll() {
    return this.repository.findAll();
  }

  findById(id: string) {
    const task = this.repository.findById(id);
    if (!task) throw new TaskNotFoundError();
    return task;
  }

  findHistory(id: string) {
    this.findById(id);
    return this.repository.findHistoryByTaskId(id);
  }

  update(id: string, input: UpdateTask) {
    return this.repository.transaction(() => {
      const task = this.findById(id);
      const startDate = input.startDate ?? task.startDate;
      const dueDate = input.dueDate ?? task.dueDate;
      const now = new Date();
      if (!isCalendarDate(startDate) || !isCalendarDate(dueDate)) {
        throw new TaskValidationError('Informe datas válidas no formato YYYY-MM-DD.');
      }
      if (startDate !== task.startDate && startDate < localToday(now)) {
        throw new TaskValidationError('Uma nova data de início não pode ser anterior à data atual.');
      }
      if (dueDate < startDate) {
        throw new TaskValidationError('O prazo não pode ser anterior à data de início.');
      }
      if (!this.projects.findById(input.projectId ?? task.projectId)) {
        throw new ProjectError('PROJECT_NOT_FOUND');
      }
      const changes: UpdateTask & { done?: boolean; progress?: number } = { ...input };
      const updatedAt = new Date(Math.max(now.getTime(), Date.parse(task.updatedAt) + 1)).toISOString();
      const children = this.subtasks.findByTaskId(id);
      let childrenChanged = false;
      if (children.length && input.status !== undefined) {
        const allDone = input.status === 'COMPLETED';
        // PARTIAL cannot invent an arbitrary subset: preserve existing partial
        // children, but reopening a completed task clears all of them.
        if (allDone || input.status === 'PENDING' || task.status === 'COMPLETED') {
          childrenChanged = children.some(child => child.done !== allDone);
          if (childrenChanged) this.subtasks.setAllDone(id, allDone, updatedAt);
        }
      }
      const state = taskState(children.length ? this.subtasks.findByTaskId(id) : [], input.status ?? task.status);
      Object.assign(changes, state);
      if (!this.repository.updateById(id, changes, updatedAt)) throw new TaskNotFoundError();
      const fields: string[] = (Object.keys(input) as (keyof UpdateTask)[])
        .filter(key => key !== 'status' && input[key] !== task[key]);
      if (childrenChanged) fields.push('subtasks', 'progress');
      if (fields.length) this.repository.recordUpdate(id, randomUUID(), updatedAt, fields);
      recordStatus(this.repository, id, task.status, state.status, updatedAt);
      return this.findById(id);
    });
  }

  create(input: CreateTask) {
    const now = new Date();
    if (!isCalendarDate(input.startDate) || !isCalendarDate(input.dueDate)) {
      throw new TaskValidationError('Informe datas válidas no formato YYYY-MM-DD.');
    }
    if (input.startDate < localToday(now)) {
      throw new TaskValidationError('A data de início não pode ser anterior à data atual.');
    }
    if (input.dueDate < input.startDate) {
      throw new TaskValidationError('O prazo não pode ser anterior à data de início.');
    }
    return this.repository.transaction(() => {
      if (!this.projects.findById(input.projectId)) throw new ProjectError('PROJECT_NOT_FOUND');
      const timestamp = now.toISOString();
      const completed = input.status === 'COMPLETED';
      const { subtasks: draftChildren = [], ...fields } = input;
      const children = draftChildren.map((child, index) => ({
        id: randomUUID(), title: child.title, done: completed,
        // Preserve the draft order with the repository's existing ordering.
        createdAt: new Date(now.getTime() + index).toISOString(),
        updatedAt: new Date(now.getTime() + index).toISOString(),
      }));
      const updatedAt = children.at(-1)?.updatedAt ?? timestamp;
      const task = this.repository.create({
        ...fields, ...taskState(children, input.status), id: randomUUID(),
        favorite: false, createdAt: timestamp, updatedAt,
        deletedAt: null, undoUntil: null,
      });
      for (const child of children) this.subtasks.create({ ...child, taskId: task.id });
      this.repository.createHistoryEvent({ id: randomUUID(), taskId: task.id,
        action: 'CREATED', createdAt: timestamp, metadata: {} });
      return children.length ? this.findById(task.id) : task;
    });
  }
}
