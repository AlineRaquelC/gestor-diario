import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import request from 'supertest';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';

let connection: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
const project = { name: 'Mesmo nome', color: '#fff', icon: 'P', clientId: 'device-project-A' };
const task = { title: 'Legado', startDate: '2020-01-01', dueDate: '2020-01-02', priority: 'HIGH', clientId: 'device-task-A' };
beforeEach(() => {
  connection = openDatabase(':memory:'); migrate(connection.db, { migrationsFolder }); app = createApp(connection.db);
});
afterEach(() => connection.sqlite.close());

it('POST de projeto repetido recupera ID, sem fundir homônimos nem sobrescrever dados', async () => {
  const first = await request(app).post('/projects').send(project);
  const retry = await request(app).post('/projects').send({ ...project, name: 'Resposta perdida' });
  const other = await request(app).post('/projects').send({ ...project, clientId: 'device-project-B' });
  expect(first.status).toBe(201); expect(retry.body).toEqual(first.body);
  expect(other.body.id).not.toBe(first.body.id);
  expect((await request(app).get('/projects')).body).toHaveLength(2);
});
it('projeto excluído conserva identidade de importação sem recriar nem ressuscitar', async () => {
  const first = await request(app).post('/projects').send(project);
  expect((await request(app).delete(`/projects/${first.body.id}`)).status).toBe(204);
  const retry = await request(app).post('/projects').send(project);
  expect(retry.body.id).toBe(first.body.id); expect(retry.body.deletedAt).toBeTruthy();
  expect((await request(app).get('/projects')).body).toEqual([]);
});
it('importa datas históricas válidas e retry não duplica tarefa, filhos ou histórico', async () => {
  const p = (await request(app).post('/projects').send(project)).body;
  const input = { ...task, projectId: p.id, subtasks: [{ title: 'Filho' }] };
  const first = await request(app).post('/tasks').send(input);
  expect(first.status).toBe(201);
  const retry = await request(app).post('/tasks').send(input);
  expect(retry.body.id).toBe(first.body.id); expect(retry.body.subtasks).toEqual(first.body.subtasks);
  expect((await request(app).get('/tasks')).body).toHaveLength(1);
  expect((await request(app).get(`/tasks/${first.body.id}/history`)).body).toHaveLength(1);
  expect((await request(app).post('/tasks').send({ ...input, clientId: undefined })).status).toBe(400);
});
it('sync lê tombstones enquanto consultas operacionais continuam ocultando excluídas', async () => {
  const p = (await request(app).post('/projects').send(project)).body;
  const input = { ...task, projectId: p.id };
  const first = (await request(app).post('/tasks').send(input)).body;
  await request(app).delete(`/tasks/${first.id}`);
  expect((await request(app).get('/tasks')).body).toEqual([]);
  expect((await request(app).get(`/tasks/${first.id}`)).status).toBe(404);
  const tombstones = (await request(app).get('/tasks?includeDeleted=true')).body;
  expect(tombstones).toHaveLength(1); expect(tombstones[0]).toMatchObject({ id: first.id, clientId: task.clientId });
  expect(tombstones[0].deletedAt).toBeTruthy();
  const retry = await request(app).post('/tasks').send(input);
  expect(retry.body.id).toBe(first.id); expect(retry.body.deletedAt).toBeTruthy();
  expect(connection.sqlite.prepare('SELECT count(*) n FROM task_history').get()).toEqual({ n: 2 });
});
it.each([{ startDate: '2020-02-30' }, { dueDate: '2019-01-01' }, { projectId: 'missing' }])('importação continua validando integridade %j', async changes => {
  const p = (await request(app).post('/projects').send(project)).body;
  const result = await request(app).post('/tasks').send({ ...task, projectId: p.id, ...changes });
  expect(result.status).toBe(changes.projectId ? 404 : 400);
  expect((await request(app).get('/tasks')).body).toEqual([]);
});
it('PATCH não permite mudar clientId de tarefa ou projeto', async () => {
  const p = (await request(app).post('/projects').send(project)).body;
  const t = (await request(app).post('/tasks').send({ ...task, projectId: p.id })).body;
  expect((await request(app).patch(`/projects/${p.id}`).send({ clientId: 'other' })).status).toBe(400);
  expect((await request(app).patch(`/tasks/${t.id}`).send({ clientId: 'other' })).status).toBe(400);
});
it('chaves e vínculos permanecem após fechar/reabrir SQLite e reiniciar API', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'gestor-sync-'));
  const path = join(directory, 'test.db');
  let disk = openDatabase(path);
  try {
    migrate(disk.db, { migrationsFolder }); let server = createApp(disk.db);
    const p = (await request(server).post('/projects').send(project)).body;
    const t = (await request(server).post('/tasks').send({ ...task, projectId: p.id })).body;
    disk.sqlite.close(); disk = openDatabase(path); server = createApp(disk.db);
    expect((await request(server).post('/projects').send(project)).body.id).toBe(p.id);
    expect((await request(server).post('/tasks').send({ ...task, projectId: p.id })).body.id).toBe(t.id);
    expect((await request(server).get('/tasks')).body).toHaveLength(1);
    expect(disk.sqlite.pragma('foreign_key_check')).toEqual([]);
  } finally {disk.sqlite.close(); rmSync(directory, { recursive: true, force: true });}
});
it('PATCH condicional evita sobrescrever projeto alterado entre leitura e gravação', async () => {
  const p = (await request(app).post('/projects').send(project)).body;
  const updated = await request(app).patch(`/projects/${p.id}`).send({ name: 'Alterado', expectedUpdatedAt: p.updatedAt });
  expect(updated.status).toBe(200); expect(updated.body.updatedAt > p.updatedAt).toBe(true);
  const stale = await request(app).patch(`/projects/${p.id}`).send({ name: 'Versão antiga', expectedUpdatedAt: p.updatedAt });
  expect(stale.status).toBe(409); expect(stale.body.error.code).toBe('PROJECT_CONFLICT');
  expect((await request(app).get(`/projects/${p.id}`)).body.name).toBe('Alterado');
});
