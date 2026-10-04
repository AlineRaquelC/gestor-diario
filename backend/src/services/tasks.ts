import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ProjectError } from '../errors/projects.js';
import { TaskValidationError, TaskNotFoundError } from '../errors/tasks.js';
import { ProjectsRepository } from '../repositories/projects.js';
import { TasksRepository } from '../repositories/tasks.js';
import type { CreateTask, UpdateTask } from '../schemas/tasks.js';

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
  ) {}

  findAll() {
    return this.repository.findAll();
  }

  findById(id: string) {
    const task = this.repository.findById(id);
    if (!task) throw new TaskNotFoundError();
    return task;
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
      if (input.status !== undefined && input.status !== task.status) {
        changes.done = input.status === 'COMPLETED';
        // Reuse the existing no-subtasks rule; definitive child progress is #8.
        if (task.subtasks.length === 0) changes.progress = changes.done ? 100 : 0;
      }
      const updatedAt = new Date(Math.max(now.getTime(), Date.parse(task.updatedAt) + 1)).toISOString();
      if (!this.repository.updateById(id, changes, updatedAt)) throw new TaskNotFoundError();
      const fields = (Object.keys(input) as (keyof UpdateTask)[]).filter(key => input[key] !== task[key]);
      this.repository.recordUpdate(id, randomUUID(), updatedAt, fields);
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
      return this.repository.create({
        ...input, id: randomUUID(), done: completed, progress: completed ? 100 : 0,
        favorite: false, createdAt: timestamp, updatedAt: timestamp,
        deletedAt: null, undoUntil: null,
      });
    });
  }
}
