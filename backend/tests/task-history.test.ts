import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import request from 'supertest';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';
import { projects, tasks, taskHistory, subtasks } from '../src/database/schema/index.js';
import { TasksRepository } from '../src/repositories/tasks.js';

let connection: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
const draft = { title: 'Histórico', projectId: 'p', startDate: '2026-10-04', dueDate: '2026-10-05', priority: 'LOW' } as const;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));
  connection = openDatabase(':memory:');
  migrate(connection.db, { migrationsFolder });
  connection.db.insert(projects).values({ id: 'p', name: 'Projeto', color: '#fff', icon: 'P' }).run();
  app = createApp(connection.db);
});
afterEach(() => { connection.sqlite.close(); vi.useRealTimers(); vi.restoreAllMocks(); });
async function create(status = 'PENDING') {
  const response = await request(app).post('/tasks').send({ ...draft, status });
  expect(response.status).toBe(201);
  return response.body as typeof tasks.$inferSelect;
}
const events = async (id: string) => (await request(app).get(`/tasks/${id}/history`)).body as (typeof taskHistory.$inferSelect)[];

it('POST registra somente CREATED com metadata JSON e timestamp da criação', async () => {
  const task = await create();
  expect(await events(task.id)).toEqual([expect.objectContaining({ id: expect.any(String), taskId: task.id, action: 'CREATED', metadata: {}, createdAt: task.createdAt })]);
  expect((await request(app).get('/health')).status).toBe(200);
});
it.each([
  ['PENDING', 'PARTIAL', 'STATUS_CHANGED'], ['PARTIAL', 'PENDING', 'STATUS_CHANGED'],
  ['PENDING', 'COMPLETED', 'COMPLETED'], ['PARTIAL', 'COMPLETED', 'COMPLETED'],
  ['COMPLETED', 'PENDING', 'REOPENED'], ['COMPLETED', 'PARTIAL', 'REOPENED'],
])('%s → %s registra somente %s e preserva coerência', async (from, to, action) => {
  const original = await create(from);
  const response = await request(app).patch(`/tasks/${original.id}`).send({ status: to });
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ status: to, done: to === 'COMPLETED', progress: to === 'COMPLETED' ? 100 : 0, createdAt: original.createdAt });
  expect(response.body.updatedAt > original.updatedAt).toBe(true);
  expect(await events(original.id)).toEqual([
    expect.objectContaining({ action: 'CREATED' }),
    expect.objectContaining({ action, metadata: { from, to }, createdAt: response.body.updatedAt }),
  ]);
  expect((await request(app).get(`/tasks/${original.id}`)).body).toEqual(response.body);
});
it.each(['PENDING', 'PARTIAL', 'COMPLETED'])('status repetido %s não fabrica eventos', async status => {
  const task = await create(status);
  const before = await events(task.id);
  await request(app).patch(`/tasks/${task.id}`).send({ status });
  expect(await events(task.id)).toEqual(before);
});
it('PATCH misto separa campos comuns da transição sem eventos duplicados', async () => {
  const task = await create('PARTIAL');
  await request(app).patch(`/tasks/${task.id}`).send({ title: 'Novo título', status: 'COMPLETED' });
  const history = await events(task.id);
  expect(history).toHaveLength(3);
  expect(history.filter(event => event.action === 'UPDATED')).toEqual([expect.objectContaining({ metadata: { fields: ['title'] } })]);
  expect(history.filter(event => event.action === 'COMPLETED')).toEqual([expect.objectContaining({ metadata: { from: 'PARTIAL', to: 'COMPLETED' } })]);
});
it('edição comum preserva UPDATED; reenvio sem alterações não duplica evento', async () => {
  const task = await create();
  await request(app).patch(`/tasks/${task.id}`).send({ description: 'Nova' });
  await request(app).patch(`/tasks/${task.id}`).send({ description: 'Nova' });
  expect((await events(task.id)).map(event => event.action)).toEqual(['CREATED', 'UPDATED']);
});
it('concluir com filhos força 100, reabrir zera 100 e preserva subtarefas e aplica conclusão coletiva', async () => {
  const task = await create('PARTIAL');
  connection.db.insert(subtasks).values({ id: 'child', taskId: task.id, title: 'Local remota' }).run();
  connection.db.update(tasks).set({ progress: 37 }).where(eq(tasks.id, task.id)).run();
  const completed = await request(app).patch(`/tasks/${task.id}`).send({ status: 'COMPLETED' });
  expect(completed.body).toMatchObject({ done: true, progress: 100 });
  const reopened = await request(app).patch(`/tasks/${task.id}`).send({ status: 'PARTIAL' });
  expect(reopened.body).toMatchObject({ done: false, progress: 0 });
  expect(connection.db.select().from(subtasks).get()?.done).toBe(false);
});
it('PENDING ↔ PARTIAL sem filhos aplica progresso zero do modelo', async () => {
  const task = await create();
  connection.db.update(tasks).set({ progress: 37 }).where(eq(tasks.id, task.id)).run();
  expect((await request(app).patch(`/tasks/${task.id}`).send({ status: 'PARTIAL' })).body.progress).toBe(0);
});
it.each(['PENDING', 'PARTIAL', 'COMPLETED'])('backend corrige done legado incoerente para %s sem transição falsa', async status => {
  const task = await create(status);
  connection.db.update(tasks).set({ done: status !== 'COMPLETED' }).where(eq(tasks.id, task.id)).run();
  const response = await request(app).patch(`/tasks/${task.id}`).send({ title: 'Corrigida' });
  expect(response.body.done).toBe(status === 'COMPLETED');
  expect((await events(task.id)).map(event => event.action)).toEqual(['CREATED', 'UPDATED']);
});
it('GET histórico de tarefa antiga vazio retorna 200 [] sem backfill', async () => {
  connection.db.insert(tasks).values({ ...draft, id: 'old', status: 'PENDING' }).run();
  const response = await request(app).get('/tasks/old/history');
  expect(response.status).toBe(200);
  expect(response.body).toEqual([]);
  expect(connection.db.select().from(taskHistory).all()).toEqual([]);
});
it.each(['missing', 'deleted'])('GET histórico %s retorna TASK_NOT_FOUND', async id => {
  if (id === 'deleted') {
    const task = await create();
    connection.db.update(tasks).set({ deletedAt: task.updatedAt }).where(eq(tasks.id, task.id)).run();
    id = task.id;
  }
  const response = await request(app).get(`/tasks/${id}/history`);
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ error: { code: 'TASK_NOT_FOUND', message: 'Tarefa não encontrada.' } });
});
it('histórico ordena por timestamp crescente, desempata por ID e isola tarefas', async () => {
  connection.db.insert(tasks).values([{ ...draft, id: 'old' }, { ...draft, id: 'other' }]).run();
  connection.db.insert(taskHistory).values([
    { id: 'later', taskId: 'old', action: 'UPDATED', createdAt: '2026-10-04T13:00:00Z', metadata: { fields: ['title'] } },
    { id: 'b', taskId: 'old', action: 'UPDATED', createdAt: '2026-10-04T12:00:00Z', metadata: {} },
    { id: 'a', taskId: 'old', action: 'UPDATED', createdAt: '2026-10-04T12:00:00Z', metadata: {} },
    { id: 'other-event', taskId: 'other', action: 'CREATED', metadata: {} },
  ]).run();
  expect((await events('old')).map(event => event.id)).toEqual(['a', 'b', 'later']);
});
it('falha em CREATED desfaz a criação inteira', async () => {
  vi.spyOn(TasksRepository.prototype, 'createHistoryEvent').mockImplementation(() => { throw new Error('history failed'); });
  expect((await request(app).post('/tasks').send(draft)).status).toBe(500);
  expect(connection.db.select().from(tasks).all()).toEqual([]);
  expect(connection.db.select().from(taskHistory).all()).toEqual([]);
});
it('falha no evento semântico desfaz tarefa e UPDATED do PATCH misto', async () => {
  const task = await create();
  const real = TasksRepository.prototype.createHistoryEvent;
  vi.spyOn(TasksRepository.prototype, 'createHistoryEvent').mockImplementation(function (this: TasksRepository, event) {
    if (event.action === 'COMPLETED') throw new Error('failed');
    return real.call(this, event);
  });
  expect((await request(app).patch(`/tasks/${task.id}`).send({ title: 'Nova', status: 'COMPLETED' })).status).toBe(500);
  expect(connection.db.select().from(tasks).get()).toEqual(task);
  expect((await events(task.id)).map(event => event.action)).toEqual(['CREATED']);
});
