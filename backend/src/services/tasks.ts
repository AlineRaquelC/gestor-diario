import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ProjectError } from '../errors/projects.js';
import { TaskValidationError } from '../errors/tasks.js';
import { ProjectsRepository } from '../repositories/projects.js';
import { TasksRepository } from '../repositories/tasks.js';
import type { CreateTask } from '../schemas/tasks.js';

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
