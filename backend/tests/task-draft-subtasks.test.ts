import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import request from 'supertest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';
import { projects, tasks, subtasks, taskHistory } from '../src/database/schema/index.js';
import { SubtasksRepository } from '../src/repositories/subtasks.js';
import { TasksRepository } from '../src/repositories/tasks.js';

let connection: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
const draft = { title: 'Rascunho com quatro filhos', projectId: 'p', startDate: '2026-10-04',
  dueDate: '2026-10-05', priority: 'MEDIUM',
  subtasks: [1, 2, 3, 4].map(index => ({ title: 'Subtarefa ' + index })) };
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));
  connection = openDatabase(':memory:'); migrate(connection.db, { migrationsFolder });
  connection.db.insert(projects).values({ id: 'p', name: 'Projeto', color: '#fff', icon: 'P' }).run();
  app = createApp(connection.db);
});
afterEach(() => { connection.sqlite.close(); vi.restoreAllMocks(); vi.useRealTimers(); });

it('POST do rascunho persiste os quatro filhos antes de responder; 2/4 → concluir → reabrir mantém todos coerentes', async () => {
  const created = await request(app).post('/tasks').send(draft);
  expect(created.status).toBe(201);
  const task = created.body;
  expect(task).toMatchObject({ progress: 0, status: 'PENDING', done: false, projectId: 'p' });
  expect(task.subtasks.map((child: { title: string }) => child.title)).toEqual(draft.subtasks.map(child => child.title));
  expect(connection.db.select().from(subtasks).where(eq(subtasks.taskId, task.id)).all()).toEqual(task.subtasks);
  expect(new Set(task.subtasks.map((child: { id: string }) => child.id)).size).toBe(4);
  for (const child of task.subtasks) {
    expect(child.id).toMatch(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
    expect(child).toMatchObject({ done: false, taskId: task.id, createdAt: expect.any(String), updatedAt: expect.any(String) });
  }
  for (const child of task.subtasks.slice(0, 2)) {
    expect((await request(app).patch(`/tasks/${task.id}/subtasks/${child.id}`).send({ done: true })).status).toBe(200);
  }
  expect((await request(app).get(`/tasks/${task.id}`)).body).toMatchObject({ progress: 50, status: 'PARTIAL', done: false });
  for (const [status, done, progress] of [['COMPLETED', true, 100], ['PENDING', false, 0]] as const) {
    const result = await request(app).patch(`/tasks/${task.id}`).send({ status });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ status, done, progress });
    expect(result.body.subtasks).toHaveLength(4);
    expect(result.body.subtasks.every((child: { done: boolean }) => child.done === done)).toBe(true);
    expect((await request(app).get(`/tasks/${task.id}`)).body).toEqual(result.body);
    expect((await request(app).get('/tasks')).body).toEqual([result.body]);
  }
  const events = (await request(app).get(`/tasks/${task.id}/history`)).body;
  expect(events.filter((event: { action: string }) => event.action === 'CREATED')).toHaveLength(1);
  expect(events.filter((event: { action: string }) => event.action === 'COMPLETED')).toHaveLength(1);
  expect(events.filter((event: { action: string }) => event.action === 'REOPENED')).toHaveLength(1);
});
it('rascunho com status COMPLETED cria filhos concluídos; PARTIAL com filhos pendentes fica PENDING', async () => {
  for (const status of ['COMPLETED', 'PARTIAL']) {
    const response = await request(app).post('/tasks').send({ ...draft, status });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ status: status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      done: status === 'COMPLETED', progress: status === 'COMPLETED' ? 100 : 0 });
    expect(response.body.subtasks.every((child: { done: boolean }) => child.done === (status === 'COMPLETED'))).toBe(true);
  }
});
it.each([[{}], [{ title: '' }], [{ title: '   ' }], [{ title: 'Filho', id: 'local' }], [{ title: 'Filho', done: true }], 'invalid'].map(children => ({ children })))('rascunho inválido $children retorna 400 sem gravar pai ou filhos', async ({ children }) => {
  const result = await request(app).post('/tasks').send({ ...draft, subtasks: children });
  expect(result.status).toBe(400);
  expect(result.body.error.code).toBe('VALIDATION_ERROR');
  expect(connection.db.select().from(tasks).all()).toEqual([]);
  expect(connection.db.select().from(subtasks).all()).toEqual([]);
  expect(connection.db.select().from(taskHistory).all()).toEqual([]);
});
it.each(['subtask', 'history'])('falha em %s desfaz a criação inteira, incluindo filhos anteriores', async failure => {
  if (failure === 'subtask') {
    const original = SubtasksRepository.prototype.create;
    let calls = 0;
    vi.spyOn(SubtasksRepository.prototype, 'create').mockImplementation(function (this: SubtasksRepository, value) {
      if (++calls === 3) throw new Error('subtask failed');
      return original.call(this, value);
    });
  } else {
    vi.spyOn(TasksRepository.prototype, 'createHistoryEvent').mockImplementation(() => { throw new Error('history failed'); });
  }
  expect((await request(app).post('/tasks').send(draft)).status).toBe(500);
  expect(connection.db.select().from(tasks).all()).toEqual([]);
  expect(connection.db.select().from(subtasks).all()).toEqual([]);
  expect(connection.db.select().from(taskHistory).all()).toEqual([]);
});
