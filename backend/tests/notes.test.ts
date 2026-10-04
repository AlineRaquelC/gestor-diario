import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import request from 'supertest';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';
import { projects, tasks, notes, taskHistory } from '../src/database/schema/index.js';
import { TasksRepository } from '../src/repositories/tasks.js';
let connection: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));
  connection = openDatabase(':memory:'); migrate(connection.db, { migrationsFolder });
  connection.db.insert(projects).values({ id: 'p', name: 'Projeto', color: '#fff', icon: 'P' }).run();
  connection.db.insert(tasks).values(['t', 'other'].map(id => ({ id, title: id, description: 'Descrição principal', projectId: 'p', priority: 'LOW' as const, startDate: '2026-10-04', dueDate: '2026-10-05' }))).run();
  app = createApp(connection.db);
});
afterEach(() => { connection.sqlite.close(); vi.useRealTimers(); vi.restoreAllMocks(); });
const list = (id = 't') => request(app).get(`/tasks/${id}/notes`);
const add = (content = 'Observação', id = 't') => request(app).post(`/tasks/${id}/notes`).send({ content });
const patch = (id: string, body: object, taskId = 't') => request(app).patch(`/tasks/${taskId}/notes/${id}`).send(body);
const remove = (id: string, taskId = 't') => request(app).delete(`/tasks/${taskId}/notes/${id}`);
const parent = () => connection.db.select().from(tasks).where(eq(tasks.id, 't')).get()!;
const rows = () => connection.db.select().from(notes).all();
const history = () => connection.db.select().from(taskHistory).all();

it('GET vazio retorna 200 [] e não transforma description em nota', async () => {
  const result = await list(); expect(result.status).toBe(200); expect(result.body).toEqual([]);
  expect(parent().description).toBe('Descrição principal'); expect(history()).toEqual([]);
});
it('POST 201 persiste trim, UUID e timestamps; atualiza somente updatedAt do pai', async () => {
  const before = parent(); const result = await add('  Texto adicional  ');
  expect(result.status).toBe(201);
  expect(result.body).toMatchObject({ taskId: 't', content: 'Texto adicional', createdAt: expect.any(String), updatedAt: expect.any(String) });
  expect(result.body.id).toMatch(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
  expect(result.body.updatedAt).toBe(result.body.createdAt); expect(rows()).toEqual([result.body]);
  expect(parent()).toEqual({ ...before, updatedAt: result.body.updatedAt });
  expect(parent().updatedAt > before.updatedAt).toBe(true);
  expect(history()).toEqual([expect.objectContaining({ action: 'UPDATED', metadata: { fields: ['notes'] }, createdAt: result.body.updatedAt })]);
});
it.each([{}, { content: '' }, { content: '  \n ' }, { content: 3 }, { content: null }, { content: 'x', title: 'y' }, { content: 'x', taskId: 'other' }])('POST inválido %j → 400 VALIDATION_ERROR', async body => {
  const before = parent(); const result = await request(app).post('/tasks/t/notes').send(body);
  expect(result.status).toBe(400); expect(result.body.error.code).toBe('VALIDATION_ERROR');
  expect(rows()).toEqual([]); expect(parent()).toEqual(before); expect(history()).toEqual([]);
});
it.each(['get', 'post', 'patch', 'delete'] as const)('%s rejeita tarefa inexistente e soft-deleted', async method => {
  const note = (await add()).body;
  connection.db.update(tasks).set({ deletedAt: '2026-10-04T12:00:00Z' }).where(eq(tasks.id, 't')).run();
  for (const taskId of ['missing', 't']) {
    const result = method === 'get' ? await list(taskId) : method === 'post' ? await add('x', taskId) : method === 'patch' ? await patch(note.id, { content: 'x' }, taskId) : await remove(note.id, taskId);
    expect(result.status).toBe(404); expect(result.body.error.code).toBe('TASK_NOT_FOUND');
  }
});
it('PATCH mantém createdAt, atualiza updatedAt e conteúdo independente', async () => {
  const note = (await add()).body; const before = parent(); const result = await patch(note.id, { content: '  Editada  ' });
  expect(result.status).toBe(200); expect(result.body).toEqual({ ...note, content: 'Editada', updatedAt: expect.any(String) });
  expect(result.body.updatedAt > note.updatedAt).toBe(true);
  expect(parent()).toEqual({ ...before, updatedAt: result.body.updatedAt });
  expect((await list()).body).toEqual([result.body]); expect(history()).toHaveLength(2);
});
it.each([{}, { content: '' }, { content: ' ' }, { content: false }, { content: 'x', id: 'new' }, { content: 'x', taskId: 'other' }, { content: 'x', createdAt: 'new' }, { content: 'x', updatedAt: 'new' }])('PATCH inválido %j não altera nota/pai/eventos', async body => {
  const note = (await add()).body; const before = parent(); const events = history();
  const result = await patch(note.id, body); expect(result.status).toBe(400); expect(result.body.error.code).toBe('VALIDATION_ERROR');
  expect(rows()).toEqual([note]); expect(parent()).toEqual(before); expect(history()).toEqual(events);
});
it.each(['patch', 'delete'] as const)('%s rejeita nota inexistente/de outra task → NOTE_NOT_FOUND', async method => {
  const note = (await add('Outra', 'other')).body; const before = parent(); const events = history();
  for (const id of ['missing', note.id]) {
    const result = method === 'patch' ? await patch(id, { content: 'x' }) : await remove(id);
    expect(result.status).toBe(404); expect(result.body.error.code).toBe('NOTE_NOT_FOUND');
  }
  expect(rows()).toEqual([note]); expect(parent()).toEqual(before); expect(history()).toEqual(events);
});
it('DELETE físico 200 remove apenas a nota, preserva tarefa e outras notas', async () => {
  const a = (await add('A')).body; const b = (await add('B')).body; const other = (await add('C', 'other')).body;
  const before = parent(); const result = await remove(a.id);
  expect(result.status).toBe(200); expect(result.body).toEqual({ id: a.id, taskId: 't', updatedAt: expect.any(String) });
  expect((await list()).body).toEqual([b]); expect(rows()).toHaveLength(2); expect(rows()).toContainEqual(other);
  expect(parent()).toEqual({ ...before, updatedAt: result.body.updatedAt }); expect(result.body.updatedAt > before.updatedAt).toBe(true);
});
it('múltiplas notas são isoladas e ordenadas por createdAt crescente, desempate ID', async () => {
  const a = (await add('Primeira')).body; const b = (await add('Segunda')).body; const c = (await add('Outra', 'other')).body;
  expect((await list()).body).toEqual([a, b]); expect((await list('other')).body).toEqual([c]);
  connection.db.update(notes).set({ createdAt: a.createdAt }).where(eq(notes.id, b.id)).run();
  expect((await list()).body.map((n: { id: string }) => n.id)).toEqual([a.id, b.id].sort());
});
it.each(['post', 'patch', 'delete'] as const)('rollback de %s se atualização do pai falha', async method => {
  const note = (await add()).body; const before = parent(); const events = history();
  vi.spyOn(TasksRepository.prototype, 'updateById').mockImplementation(() => { throw new Error('parent failed'); });
  const result = method === 'post' ? await add() : method === 'patch' ? await patch(note.id, { content: 'x' }) : await remove(note.id);
  expect(result.status).toBe(500); expect(rows()).toEqual([note]); expect(parent()).toEqual(before); expect(history()).toEqual(events);
});
it.each(['post', 'patch', 'delete'] as const)('rollback de %s se histórico falha', async method => {
  const note = (await add()).body; const before = parent(); const events = history();
  vi.spyOn(TasksRepository.prototype, 'createHistoryEvent').mockImplementation(() => { throw new Error('history failed'); });
  const result = method === 'post' ? await add() : method === 'patch' ? await patch(note.id, { content: 'x' }) : await remove(note.id);
  expect(result.status).toBe(500); expect(rows()).toEqual([note]); expect(parent()).toEqual(before); expect(history()).toEqual(events);
});
it('Tasks/Subtasks/History/health continuam funcionando e notes não entram no payload de Tasks', async () => {
  expect((await request(app).get('/health')).status).toBe(200);
  await add(); expect((await request(app).get('/tasks')).status).toBe(200);
  expect((await request(app).get('/tasks/t')).body).not.toHaveProperty('notes');
  expect((await request(app).patch('/tasks/t').send({ title: 'Atualizada' })).status).toBe(200);
  expect((await request(app).post('/tasks/t/subtasks').send({ title: 'Filha' })).status).toBe(201);
  expect((await request(app).get('/tasks/t/history')).body.some((event: { metadata: { fields?: string[] } }) => event.metadata.fields?.includes('notes'))).toBe(true);
  expect((await request(app).post('/tasks').send({ title: 'Nova', projectId: 'p', priority: 'LOW', startDate: '2026-10-04', dueDate: '2026-10-05' })).status).toBe(201);
});
