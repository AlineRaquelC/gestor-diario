import { mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import request from 'supertest';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';
import { projects, tasks, taskHistory, subtasks, notes } from '../src/database/schema/index.js';
import { TasksRepository } from '../src/repositories/tasks.js';

let connection: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
let directory: string;
let filename: string;
let task: typeof tasks.$inferSelect;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'task-delete-'));
  filename = join(directory, 'test.db');
  connection = openDatabase(filename);
  migrate(connection.db, { migrationsFolder });
  connection.db.insert(projects).values({ id: 'p', name: 'Projeto', color: '#fff', icon: 'P' }).run();
  app = createApp(connection.db);
  task = connection.db.insert(tasks).values({ id: 't', title: 'Preservar', description: 'Descrição', projectId: 'p', startDate: '2026-10-01', dueDate: '2026-10-02', time: '09:00', priority: 'HIGH', status: 'PARTIAL', progress: 50 }).returning().get();
  connection.db.insert(subtasks).values([{ id: 's1', taskId: 't', title: 'Primeira', done: true }, { id: 's2', taskId: 't', title: 'Segunda' }]).run();
  connection.db.insert(notes).values({ id: 'n', taskId: 't', content: 'Observação' }).run();
  connection.db.insert(taskHistory).values({ id: 'h', taskId: 't', action: 'CREATED', metadata: {} }).run();
});
afterEach(() => { vi.restoreAllMocks(); connection.sqlite.close(); rmSync(directory, { recursive: true, force: true }); });
const stored = () => connection.db.select().from(tasks).where(eq(tasks.id, 't')).get()!;
const events = () => connection.db.select().from(taskHistory).all();
const remove = (id = 't') => request(app).delete(`/tasks/${id}`);
const restore = (id = 't') => request(app).post(`/tasks/${id}/restore`);

it('DELETE persiste timestamp, mantém Task e oculta consultas operacionais', async () => {
  const response = await remove();
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ id: 't', deletedAt: expect.any(String), updatedAt: expect.any(String) });
  expect(Number.isNaN(Date.parse(response.body.deletedAt))).toBe(false);
  expect(stored()).toEqual({ ...task, deletedAt: response.body.deletedAt, updatedAt: response.body.updatedAt });
  expect((await request(app).get('/tasks')).body).toEqual([]);
  for (const path of ['/tasks/t', '/tasks/t/history', '/tasks/t/notes']) {
    expect((await request(app).get(path)).status).toBe(404);
  }
  expect(events()).toEqual([expect.objectContaining({ id: 'h', action: 'CREATED' }), expect.objectContaining({ taskId: 't', action: 'DELETE', createdAt: response.body.updatedAt, metadata: { deletedAt: response.body.deletedAt } })]);
});
it('DELETE inexistente e repetido retornam 404 sem outro evento', async () => {
  expect((await remove('missing')).status).toBe(404);
  await remove();
  const before = stored();
  expect((await remove()).status).toBe(404);
  expect(stored()).toEqual(before);
  expect(events()).toHaveLength(2);
});
it('RESTORE retorna mesmo ID, campos, projeto, progresso, filhos, notas e histórico intactos', async () => {
  const children = connection.db.select().from(subtasks).all();
  const originalNotes = connection.db.select().from(notes).all();
  await remove();
  expect(connection.db.select().from(subtasks).all()).toEqual(children);
  expect(connection.db.select().from(notes).all()).toEqual(originalNotes);
  const response = await restore();
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ ...task, deletedAt: null, updatedAt: expect.any(String), subtasks: children, project: { id: 'p' } });
  expect(stored().deletedAt).toBeNull();
  expect((await request(app).get('/tasks')).body.map((item: { id: string }) => item.id)).toEqual(['t']);
  expect((await request(app).get('/tasks/t')).body).toEqual(response.body);
  expect(connection.db.select().from(notes).all()).toEqual(originalNotes);
  expect((await request(app).get('/tasks/t/history')).body.map((event: { action: string }) => event.action)).toEqual(['CREATED', 'DELETE', 'RESTORE']);
});
it('RESTORE inexistente retorna 404 e ativa/repetida retorna 409, sem eventos falsos', async () => {
  expect((await restore('missing')).status).toBe(404);
  expect((await restore()).status).toBe(409);
  await remove(); await restore();
  expect((await restore()).status).toBe(409);
  expect(events()).toHaveLength(3);
});
it.each(['DELETE', 'RESTORE'])('falha no histórico %s faz rollback integral', async action => {
  if (action === 'RESTORE') await remove();
  const before = stored(); const history = events();
  vi.spyOn(TasksRepository.prototype, 'createHistoryEvent').mockImplementation(() => { throw new Error('history failure'); });
  expect((await (action === 'DELETE' ? remove() : restore())).status).toBe(500);
  expect(stored()).toEqual(before); expect(events()).toEqual(history);
  expect(connection.db.select().from(subtasks).all()).toHaveLength(2);
  expect(connection.db.select().from(notes).all()).toHaveLength(1);
});
it('RESTORE com projeto indisponível mantém exclusão e vínculo', async () => {
  await remove();
  connection.db.update(projects).set({ deletedAt: new Date().toISOString() }).where(eq(projects.id, 'p')).run();
  const before = stored();
  expect((await restore()).status).toBe(404);
  expect(stored()).toEqual(before); expect(events()).toHaveLength(2);
});
it('SQLite real preserva exclusão/relações ao reabrir e permite restauração após janela UX', async () => {
  await remove();
  connection.sqlite.close(); connection = openDatabase(filename); app = createApp(connection.db);
  expect((await request(app).get('/tasks')).body).toEqual([]);
  connection.db.update(tasks).set({ deletedAt: '2020-01-01T00:00:00Z' }).where(eq(tasks.id, 't')).run();
  expect((await restore()).status).toBe(200);
  connection.sqlite.close(); connection = openDatabase(filename); app = createApp(connection.db);
  expect((await request(app).get('/tasks/t')).body.id).toBe('t');
  expect(connection.db.select().from(subtasks).all()).toHaveLength(2);
  expect(connection.db.select().from(notes).all()).toHaveLength(1);
  expect(events().map(event => event.action)).toEqual(['CREATED', 'DELETE', 'RESTORE']);
  expect(connection.sqlite.pragma('foreign_key_check')).toEqual([]);
});
it('schema aceita histórico legado DELETED/RESTORED sem perder vínculos', () => {
  connection.db.insert(taskHistory).values([{ id: 'old-delete', taskId: 't', action: 'DELETED' }, { id: 'old-restore', taskId: 't', action: 'RESTORED' }]).run();
  expect(events().map(event => event.action)).toEqual(['CREATED', 'DELETED', 'RESTORED']);
  expect(connection.sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
});

it('upgrade 0000 → 0001 preserva eventos antigos, Task, Notes e Subtasks em SQLite real', () => {
  const folder = join(directory, 'old-migrations');
  mkdirSync(join(folder, 'meta'), { recursive: true });
  const journal = JSON.parse(readFileSync(join(migrationsFolder, 'meta/_journal.json'), 'utf8'));
  journal.entries = journal.entries.slice(0, 1);
  writeFileSync(join(folder, 'meta/_journal.json'), JSON.stringify(journal));
  const tag = journal.entries[0].tag as string;
  writeFileSync(join(folder, tag + '.sql'), readFileSync(join(migrationsFolder, tag + '.sql')));
  const old = openDatabase(join(directory, 'upgrade.db'));
  try {
    migrate(old.db, { migrationsFolder: folder });
    old.db.insert(projects).values({ id: 'p', name: 'Projeto', color: '#fff', icon: 'P' }).run();
    old.db.insert(tasks).values(task).run();
    old.db.insert(notes).values({ id: 'n', taskId: 't', content: 'Original' }).run();
    old.db.insert(subtasks).values({ id: 's', taskId: 't', title: 'Original' }).run();
    old.db.insert(taskHistory).values({ id: 'h', taskId: 't', action: 'DELETED', metadata: { original: true } }).run();
    const previous = old.db.select().from(taskHistory).all();
    migrate(old.db, { migrationsFolder });
    expect(old.db.select().from(taskHistory).all()).toEqual(previous);
    expect(old.db.select().from(tasks).get()).toEqual(task);
    expect(old.db.select().from(notes).all()).toHaveLength(1);
    expect(old.db.select().from(subtasks).all()).toHaveLength(1);
    old.db.insert(taskHistory).values({ id: 'new', taskId: 't', action: 'RESTORE' }).run();
    expect(old.sqlite.pragma('foreign_key_check')).toEqual([]);
    expect(old.sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
  } finally { old.sqlite.close(); }
});
