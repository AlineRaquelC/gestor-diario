import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import request from 'supertest';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';
import { projects, tasks, subtasks, taskHistory } from '../src/database/schema/index.js';
import { TasksRepository } from '../src/repositories/tasks.js';
let connection: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));
  connection = openDatabase(':memory:'); migrate(connection.db, { migrationsFolder });
  connection.db.insert(projects).values({ id: 'p', name: 'Projeto', color: '#fff', icon: 'P' }).run();
  connection.db.insert(tasks).values([{ id: 't', title: 'Pai', projectId: 'p', priority: 'LOW', startDate: '2026-10-04', dueDate: '2026-10-05' }, { id: 'other', title: 'Outro', projectId: 'p', priority: 'LOW', startDate: '2026-10-04', dueDate: '2026-10-05' }]).run();
  app = createApp(connection.db);
});
afterEach(() => { connection.sqlite.close(); vi.useRealTimers(); vi.restoreAllMocks(); });
const add = (title = 'Filha', taskId = 't') => request(app).post(`/tasks/${taskId}/subtasks`).send({ title });
const patch = (id: string, body: object, taskId = 't') => request(app).patch(`/tasks/${taskId}/subtasks/${id}`).send(body);
const remove = (id: string, taskId = 't') => request(app).delete(`/tasks/${taskId}/subtasks/${id}`);
const parent = () => connection.db.select().from(tasks).where(eq(tasks.id, 't')).get()!;
const children = () => connection.db.select().from(subtasks).where(eq(subtasks.taskId, 't')).all();
const history = () => connection.db.select().from(taskHistory).all();
async function seed(count: number) {
  for (let i = 0; i < count; i++) expect((await add('Filha ' + i)).status).toBe(201);
  return children();
}
it('POST 201 persiste UUID, trim, timestamps e pai confirmado; GETs mantêm relação', async () => {
  const before = parent(); const result = await add('  Filha  ');
  expect(result.status).toBe(201);
  const child = result.body.task.subtasks[0];
  expect(child).toMatchObject({ taskId: 't', title: 'Filha', done: false, createdAt: expect.any(String), updatedAt: expect.any(String) });
  expect(child.id).toMatch(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
  expect(children()).toEqual([child]);
  expect(parent()).toMatchObject({ progress: 0, status: 'PENDING', done: false, createdAt: before.createdAt });
  expect(parent().updatedAt > before.updatedAt).toBe(true);
  expect((await request(app).get('/tasks/t')).body.subtasks).toEqual([child]);
  expect((await request(app).get('/tasks')).body.find((t: { id: string }) => t.id === 't').subtasks).toEqual([child]);
  expect((await request(app).get('/health')).status).toBe(200);
});
it.each([{}, { title: '' }, { title: '   ' }, { title: 2 }, { title: 'Filha', done: true }, { title: 'Filha', unknown: 1 }])('POST rejeita payload inválido %j', async body => {
  expect((await request(app).post('/tasks/t/subtasks').send(body)).status).toBe(400);
  expect(children()).toEqual([]);
});
it.each(['post', 'patch', 'delete'] as const)('%s rejeita pai inexistente e excluído', async method => {
  const child = (await seed(1))[0];
  connection.db.update(tasks).set({ deletedAt: '2026-10-04T12:00:00Z' }).where(eq(tasks.id, 't')).run();
  for (const id of ['missing', 't']) {
    const response = method === 'post' ? await add('Filha', id) : method === 'patch' ? await patch(child.id, { done: true }, id) : await remove(child.id, id);
    expect(response.status).toBe(404); expect(response.body.error.code).toBe('TASK_NOT_FOUND');
  }
});
it.each([{}, { title: '' }, { title: ' ' }, { done: 'true' }, { done: null }, { unknown: true }])('PATCH inválido %j retorna 400', async body => {
  const child = (await seed(1))[0]; expect((await patch(child.id, body)).status).toBe(400);
  expect(children()[0]).toEqual(child);
});
it.each(['patch', 'delete'] as const)('%s rejeita filho inexistente e de outra tarefa sem alterar dados', async method => {
  const child = (await add('Outro', 'other')).body.task.subtasks[0]; const before = parent();
  for (const id of ['missing', child.id]) {
    const response = method === 'patch' ? await patch(id, { done: true }) : await remove(id);
    expect(response.status).toBe(404); expect(response.body.error.code).toBe('SUBTASK_NOT_FOUND');
  }
  expect(parent()).toEqual(before); expect(connection.db.select().from(subtasks).get()).toEqual(child);
});
it.each([[0, 0, 'PENDING', false], [1, 25, 'PARTIAL', false], [2, 50, 'PARTIAL', false], [3, 75, 'PARTIAL', false], [4, 100, 'COMPLETED', true]])('%s/4 resulta em %s%% e %s', async (done, progress, status, completed) => {
  const list = await seed(4); for (let i = 0; i < Number(done); i++) await patch(list[i].id, { done: true });
  expect(parent()).toMatchObject({ progress, status, done: completed });
  expect(parent().progress).toBeGreaterThanOrEqual(0); expect(parent().progress).toBeLessThanOrEqual(100);
});
it('arredonda 1/3 para 33 e 2/3 para 67, desmarcar reabre e adicionar pendente recalcula', async () => {
  const list = await seed(3);
  await patch(list[0].id, { done: true }); expect(parent().progress).toBe(33);
  await patch(list[1].id, { done: true }); expect(parent().progress).toBe(67);
  await patch(list[2].id, { done: true }); expect(parent().done).toBe(true);
  await add(); expect(parent()).toMatchObject({ progress: 75, status: 'PARTIAL', done: false });
  await request(app).patch('/tasks/t').send({ status: 'COMPLETED' });
  await patch(list[0].id, { done: false }); expect(parent()).toMatchObject({ progress: 75, status: 'PARTIAL', done: false });
});
it('DELETE 200 recalcula restantes sem afetar outra tarefa', async () => {
  const list = await seed(3); await add('Outro', 'other');
  await patch(list[0].id, { done: true }); await patch(list[1].id, { done: true });
  expect((await remove(list[0].id)).status).toBe(200); expect(parent().progress).toBe(50);
  expect(children()).toHaveLength(2); expect(connection.db.select().from(subtasks).where(eq(subtasks.taskId, 'other')).all()).toHaveLength(1);
});
it.each([false, true])('remover última subtarefa done=%s aplica regra sem filhos', async done => {
  const child = (await seed(1))[0]; if (done) await patch(child.id, { done });
  const result = await remove(child.id); expect(result.body.task.subtasks).toEqual([]);
  expect(parent()).toMatchObject({ progress: done ? 100 : 0, status: done ? 'COMPLETED' : 'PENDING', done });
});
it('PATCH pai conclui/reabre todas atomicamente e mantém createdAt dos filhos', async () => {
  const list = await seed(3);
  expect((await request(app).patch('/tasks/t').send({ status: 'COMPLETED' })).status).toBe(200);
  expect(parent()).toMatchObject({ progress: 100, status: 'COMPLETED', done: true }); expect(children().every(child => child.done)).toBe(true);
  expect(children().every(child => child.createdAt === list.find(c => c.id === child.id)!.createdAt)).toBe(true);
  expect(children().every(child => child.updatedAt > list.find(c => c.id === child.id)!.updatedAt)).toBe(true);
  await request(app).patch('/tasks/t').send({ status: 'PENDING' });
  expect(parent()).toMatchObject({ progress: 0, status: 'PENDING', done: false }); expect(children().every(child => !child.done)).toBe(true);
});
it('PATCH title do filho preserva createdAt, atualiza timestamps e não fabrica transição', async () => {
  const child = (await seed(1))[0]; const before = parent(); const count = history().length;
  const response = await patch(child.id, { title: '  Renomeada  ' }); expect(response.status).toBe(200);
  expect(children()[0]).toMatchObject({ title: 'Renomeada', createdAt: child.createdAt }); expect(children()[0].updatedAt > child.updatedAt).toBe(true);
  expect(parent().updatedAt > before.updatedAt).toBe(true); expect(history().slice(count)).toEqual([expect.objectContaining({ action: 'UPDATED', metadata: { fields: ['subtasks', 'progress'] } })]);
});
it('PATCH sem mudança não duplica histórico nem timestamps', async () => {
  const child = (await seed(1))[0]; const before = parent(); const events = history();
  expect((await patch(child.id, { done: false, title: child.title })).status).toBe(200);
  expect(parent()).toEqual(before); expect(children()[0]).toEqual(child); expect(history()).toEqual(events);
});
it('eventos automáticos têm semântica única e histórico continua consultável', async () => {
  const list = await seed(2); await patch(list[0].id, { done: true }); await patch(list[1].id, { done: true }); await patch(list[0].id, { done: false });
  const response = await request(app).get('/tasks/t/history'); expect(response.status).toBe(200);
  expect(response.body.filter((h: { action: string }) => h.action !== 'UPDATED').map((h: { action: string }) => h.action)).toEqual(['STATUS_CHANGED', 'COMPLETED', 'REOPENED']);
  expect(response.body).toHaveLength(8);
});
it.each(['post', 'patch', 'delete', 'complete', 'reopen'])('rollback de %s preserva filhos, pai e eventos se pai falhar', async operation => {
  const list = await seed(2); if (operation === 'reopen') await request(app).patch('/tasks/t').send({ status: 'COMPLETED' });
  const before = parent(), previousChildren = children(), events = history();
  vi.spyOn(TasksRepository.prototype, 'updateById').mockImplementation(() => { throw new Error('parent failed'); });
  const result = operation === 'post' ? await add() : operation === 'patch' ? await patch(list[0].id, { done: true }) : operation === 'delete' ? await remove(list[0].id) : await request(app).patch('/tasks/t').send({ status: operation === 'complete' ? 'COMPLETED' : 'PENDING' });
  expect(result.status).toBe(500); expect(parent()).toEqual(before); expect(children()).toEqual(previousChildren); expect(history()).toEqual(events);
});
it('falha de histórico também desfaz mutação do filho e pai', async () => {
  const child = (await seed(1))[0]; const before = parent(), events = history();
  vi.spyOn(TasksRepository.prototype, 'createHistoryEvent').mockImplementation(() => { throw new Error('history failed'); });
  expect((await patch(child.id, { done: true })).status).toBe(500);
  expect(parent()).toEqual(before); expect(children()).toEqual([child]); expect(history()).toEqual(events);
});
