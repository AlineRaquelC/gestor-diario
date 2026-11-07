import { randomUUID } from 'node:crypto';
import { RecurrenceSeriesRepository } from '../repositories/recurrence-series.js';
import { TasksRepository } from '../repositories/tasks.js';
import { ProjectsRepository } from '../repositories/projects.js';
import { SubtasksRepository } from '../repositories/subtasks.js';
import { ProjectError } from '../errors/projects.js';
import { TaskNotFoundError } from '../errors/tasks.js';
import { RecurrenceConflictError, RecurrenceNotFoundError } from '../errors/recurrence.js';
import { RecurrenceError, civilDate, civilDuration, occurrenceDates, recurrenceSlots, referenceDay, validateRecurrenceTimeZone } from '../domain/recurrence/index.js';
import type { RecurrenceSeries, RecurrenceTemplate } from '../domain/recurrence/index.js';
import { normalizeOffsets, resolveReminderSchedule, resolveTaskInstant, validateReminderChange } from '../domain/reminders/index.js';
import type { Clock } from '../domain/reminders/index.js';
import type { CreateRecurrence, UpdateRecurrence, ActivateRecurrence } from '../schemas/recurrence-series.js';

type Task = NonNullable<ReturnType<TasksRepository['findDetailedIncludingDeleted']>>;
export class RecurrenceSeriesService {
  constructor(private readonly repository: RecurrenceSeriesRepository, private readonly tasks: TasksRepository,
    private readonly projects: ProjectsRepository, private readonly subtasks: SubtasksRepository,
    private readonly clock: Clock = Date.now) {}

  findAll() {return this.repository.findAll().map(RecurrenceSeriesRepository.toDto);}
  findById(id: string): RecurrenceSeries {
    const row = this.repository.findById(id);
    if (!row) {throw new RecurrenceNotFoundError();}
    return RecurrenceSeriesRepository.toDto(row);
  }
  private validate(anchorDate: string, zone: string, template: RecurrenceTemplate) {
    civilDate(anchorDate); validateRecurrenceTimeZone(zone);
    occurrenceDates(anchorDate, template.startOffsetDays);
    if (!this.projects.findById(template.projectId)) {throw new ProjectError('PROJECT_NOT_FOUND');}
    normalizeOffsets(template.reminders.map(item => item.offsetMinutes));
    if (template.reminders.length && !template.time) {throw new RecurrenceError('Defina um horário válido para configurar lembretes.');}
    if (template.time) {resolveTaskInstant(anchorDate, template.time, zone);}
    for (const reminder of template.reminders) {resolveReminderSchedule(anchorDate, template.time!, zone, reminder.offsetMinutes, () => 0);}
  }
  private past(day: string, series: RecurrenceSeries, now: number) {
    return series.template.time ? resolveTaskInstant(day, series.template.time, series.timeZone) <= now :
      day < referenceDay(series.timeZone, () => now);
  }
  create(input: CreateRecurrence) {
    return this.repository.transaction(() => {
      // Stable request identity must be resolved before checking dates that may now be expired.
      const existing = this.repository.findByClientId(input.clientId);
      if (existing) {
        const firstOccurrence = this.tasks.findOccurrence(existing.id, existing.firstOccurrenceKey);
        if (!firstOccurrence) {throw new Error('Identidade inicial da série inconsistente.');}
        return { series: RecurrenceSeriesRepository.toDto(existing), firstOccurrence };
      }
      const now = this.clock();
      this.validate(input.anchorDate, input.timeZone, input.template);
      const { startDate } = occurrenceDates(input.anchorDate, input.template.startOffsetDays);
      if (startDate < referenceDay(input.timeZone, () => now)) {throw new RecurrenceError('A data de início não pode ser anterior à data atual.');}
      validateReminderChange({ dueDate: input.anchorDate, time: input.template.time ?? '', timeZone: input.timeZone,
        offsets: input.template.reminders.map(item => item.offsetMinutes) }, undefined, () => now);
      const stamp = new Date(now).toISOString();
      const series: RecurrenceSeries = { ...input, id: randomUUID(), firstOccurrenceKey: input.anchorDate,
        materializedThrough: input.anchorDate, createdAt: stamp, updatedAt: stamp };
      if (this.past(input.anchorDate, series, now)) {throw new RecurrenceError('O horário da tarefa já passou. Escolha um horário futuro.');}
      const { template, ...fields } = series;
      this.repository.create({ ...fields, ...template });
      const firstOccurrence = this.insertOccurrence(series, input.anchorDate, now);
      if (!firstOccurrence) {throw new Error('Primeira ocorrência não confirmada.');}
      return { series, firstOccurrence };
    });
  }
  activate(taskId: string, input: ActivateRecurrence) {
    return this.repository.transaction(() => {
      const existing = this.repository.findByClientId(input.clientId);
      if (existing) {
        const firstOccurrence = this.tasks.findOccurrence(existing.id, existing.firstOccurrenceKey);
        if (!firstOccurrence || firstOccurrence.id !== taskId) {throw new RecurrenceConflictError();}
        return { series: RecurrenceSeriesRepository.toDto(existing), firstOccurrence };
      }
      const task = this.tasks.findById(taskId);
      if (!task) {throw new TaskNotFoundError();}
      if (task.recurrenceSeriesId) {throw new RecurrenceConflictError();}
      if (task.reminders.length && task.reminderTimeZone !== input.timeZone) {
        throw new RecurrenceError('Preserve o fuso dos lembretes existentes ao ativar a recorrência.');
      }
      const template: RecurrenceTemplate = { title: task.title, description: task.description,
        projectId: task.projectId, priority: task.priority, time: task.time,
        startOffsetDays: civilDuration(task.startDate, task.dueDate),
        subtasks: task.subtasks.map(child => ({ title: child.title })),
        reminders: task.reminders.map(item => ({ offsetMinutes: item.offsetMinutes })) };
      this.validate(task.dueDate, input.timeZone, template);
      const now = this.clock(), stamp = new Date(now).toISOString();
      const { id } = this.repository.create({ ...input, ...template, id: randomUUID(), anchorDate: task.dueDate,
        firstOccurrenceKey: task.dueDate, materializedThrough: task.dueDate, createdAt: stamp, updatedAt: stamp });
      const taskUpdatedAt = new Date(Math.max(now, Date.parse(task.updatedAt) + 1)).toISOString();
      if (!this.tasks.linkOccurrence(taskId, id, task.dueDate, taskUpdatedAt)) {throw new RecurrenceConflictError();}
      this.tasks.createHistoryEvent({ id: randomUUID(), taskId, action: 'UPDATED', createdAt: taskUpdatedAt,
        metadata: { fields: ['recurrence'], seriesId: id, occurrenceKey: task.dueDate, scope: 'activate' } });
      return { series: this.findById(id), firstOccurrence: this.tasks.findDetailedIncludingDeleted(taskId)! };
    });
  }
  update(id: string, input: UpdateRecurrence) {
    return this.repository.transaction(() => {
      const current = this.findById(id);
      if (input.expectedUpdatedAt !== current.updatedAt) {throw new RecurrenceConflictError();}
      const origin = this.tasks.findById(input.taskId);
      if (!origin || origin.recurrenceSeriesId !== id) {throw new TaskNotFoundError();}
      const anchorDate = input.anchorDate ?? current.anchorDate, template = input.template ?? current.template;
      this.validate(anchorDate, current.timeZone, template);
      const now = this.clock();
      validateReminderChange({ dueDate: anchorDate, time: template.time ?? '', timeZone: current.timeZone,
        offsets: template.reminders.map(item => item.offsetMinutes) },
        { dueDate: current.anchorDate, time: current.template.time ?? '', timeZone: current.timeZone,
          offsets: current.template.reminders.map(item => item.offsetMinutes) }, () => now);
      const frequency = input.frequency ?? current.frequency;
      if (frequency === current.frequency && anchorDate === current.anchorDate && JSON.stringify(template) === JSON.stringify(current.template)) {return current;}
      const timestamp = new Date(Math.max(now, Date.parse(current.updatedAt) + 1)).toISOString();
      const updated = this.repository.update(id, current.updatedAt, { ...template, frequency, anchorDate, updatedAt: timestamp });
      if (!updated) {throw new RecurrenceConflictError();}
      this.tasks.createHistoryEvent({ id: randomUUID(), taskId: input.taskId, action: 'UPDATED', createdAt: timestamp,
        metadata: { fields: ['recurrence'], seriesId: id, scope: 'unmaterialized',
          before: { frequency: current.frequency, anchorDate: current.anchorDate, template: current.template },
          after: { frequency, anchorDate, template } } });
      return RecurrenceSeriesRepository.toDto(updated);
    });
  }
  materialize(id: string) {
    return this.repository.transaction(() => this.materializeLocked(id, this.clock()));
  }
  materializeAll() {
    return this.repository.transaction(() => {
      const now = this.clock();
      const results = this.repository.findAll().map(series => this.materializeLocked(series.id, now));
      return { results, createdCount: results.reduce((sum, result) => sum + result.created.length, 0) };
    });
  }
  private materializeLocked(id: string, now: number) {
    let series = this.findById(id);
    const created: Task[] = [];
    if (series.frequency === 'NONE') {return { series, created };}
    const window = recurrenceSlots(series, () => now);
    if (window.start === null) {return { series, created };}
    this.validate(series.anchorDate, series.timeZone, series.template);
    for (const slot of window.slots) {
      // A tombstone occupies the slot, independently of its edited dueDate/status.
      if (this.tasks.findOccurrence(id, slot)) {continue;}
      if (this.past(slot, series, now)) {continue;}
      const task = this.insertOccurrence(series, slot, now);
      if (task) {created.push(task);}
    }
    const updatedAt = new Date(Math.max(now, Date.parse(series.updatedAt) + 1)).toISOString();
    const updated = this.repository.update(id, series.updatedAt, { materializedThrough: window.end, updatedAt });
    if (!updated) {throw new RecurrenceConflictError();}
    series = RecurrenceSeriesRepository.toDto(updated);
    // Return the same revision in all summaries, without touching persisted occurrences.
    return { series, created: created.map(task => this.tasks.findDetailedIncludingDeleted(task.id)!) };
  }
  private insertOccurrence(series: RecurrenceSeries, occurrenceKey: string, now: number): Task | undefined {
    const { template } = series;
    const dates = occurrenceDates(occurrenceKey, template.startOffsetDays);
    // A generated snapshot preserves expired offsets. This is not manual CREATE validation.
    for (const item of template.reminders) {
      resolveReminderSchedule(dates.dueDate, template.time!, series.timeZone, item.offsetMinutes, () => now);
    }
    const stamp = new Date(now).toISOString(), id = randomUUID();
    const lastChildStamp = new Date(now + Math.max(0, template.subtasks.length - 1)).toISOString();
    const row = this.tasks.createOccurrence({ id, recurrenceSeriesId: series.id, occurrenceKey, ...dates,
      title: template.title, description: template.description, projectId: template.projectId, priority: template.priority,
      time: template.time, reminderTimeZone: template.reminders.length ? series.timeZone : null,
      status: 'PENDING', done: false, progress: 0, favorite: false, createdAt: stamp, updatedAt: lastChildStamp });
    if (!row) {return undefined;}
    template.subtasks.forEach((child, index) => {
      const createdAt = new Date(now + index).toISOString();
      this.subtasks.create({ id: randomUUID(), taskId: id, title: child.title, done: false, createdAt, updatedAt: createdAt });
    });
    this.tasks.replaceReminders(id, template.reminders.map(item => item.offsetMinutes), stamp);
    this.tasks.createHistoryEvent({ id: randomUUID(), taskId: id, action: 'CREATED', createdAt: stamp,
      metadata: { seriesId: series.id, occurrenceKey } });
    return this.tasks.findDetailedIncludingDeleted(id)!;
  }
}
