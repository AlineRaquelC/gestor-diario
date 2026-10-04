import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import request from 'supertest';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';
import { projects, tasks, taskHistory, subtasks } from '../src/database/schema/index.js';
import { localToday, TasksService } from '../src/services/tasks.js';
import { TasksRepository } from '../src/repositories/tasks.js';
import { ProjectsRepository } from '../src/repositories/projects.js';

let connection: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
const valid = { title: 'Tarefa', projectId: 'p', startDate: '2026-10-02', dueDate: '2026-10-03', priority: 'HIGH' };

describe('API de tarefas — criação e consulta', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T01:00:00.000Z')); // Still Oct 2 in Sao Paulo.
    connection = openDatabase(':memory:');
    migrate(connection.db, { migrationsFolder });
    connection.db.insert(projects).values({ id: 'p', name: 'Projeto', color: '#fff', icon: 'P' }).run();
    app = createApp(connection.db);
  });
  afterEach(() => { connection.sqlite.close(); vi.useRealTimers(); });

  it('cria com defaults, UUID, timestamps e persistência e CREATED', async () => {
    const response = await request(app).post('/tasks').send(valid);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ ...valid, status: 'PENDING', done: false, progress: 0, favorite: false, deletedAt: null, undoUntil: null, description: null, time: null });
    expect(response.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(response.body.createdAt).toBe('2026-10-03T01:00:00.000Z');
    expect(response.body.updatedAt).toBe(response.body.createdAt);
    expect(connection.db.select().from(tasks).get()).toEqual(response.body);
    expect(connection.db.select().from(taskHistory).all()).toEqual([expect.objectContaining({ taskId: response.body.id, action: 'CREATED', createdAt: response.body.createdAt, metadata: {} })]);
  });

  it.each(['title', 'projectId', 'startDate', 'dueDate', 'priority'])('rejeita ausência de %s', async field => {
    const body: Record<string, unknown> = { ...valid }; delete body[field];
    const response = await request(app).post('/tasks').send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(connection.db.select().from(tasks).all()).toEqual([]);
  });

  it.each([
    ['title', ''], ['title', '   '], ['projectId', ' '],
    ['startDate', '2026-10-01'], ['dueDate', '2026-10-01'],
    ['startDate', '2026-02-30'], ['dueDate', '2026-13-01'],
    ['startDate', '2026-10-02T12:00:00Z'], ['startDate', '2026-1-2'],
    ['priority', 'URGENT'], ['status', 'INVALID'], ['time', '25:00'],
    ['time', '10:70'], ['description', 42], ['done', true], ['id', 'client-id'],
  ])('rejeita %s inválido (%s)', async (field, value) => {
    const response = await request(app).post('/tasks').send({ ...valid, [field]: value });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(connection.db.select().from(tasks).all()).toEqual([]);
  });

  it.each(['missing', 'deleted'])('rejeita projeto %s com 404', async projectId => {
    if (projectId === 'deleted') connection.db.insert(projects).values({ id: projectId, name: 'Excluído', color: '#fff', icon: 'P', deletedAt: new Date().toISOString() }).run();
    const response = await request(app).post('/tasks').send({ ...valid, projectId });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    expect(connection.db.select().from(tasks).all()).toEqual([]);
  });

  it('aceita description e time opcionais quando enviados', async () => {
    const response = await request(app).post('/tasks').send({ ...valid, description: 'Descrição', time: '18:30' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ description: 'Descrição', time: '18:30' });
  });

  it.each(['LOW', 'MEDIUM', 'HIGH'])('aceita prioridade %s', async priority => {
    expect((await request(app).post('/tasks').send({ ...valid, priority })).status).toBe(201);
  });

  it.each(['PENDING', 'PARTIAL', 'COMPLETED'])('mantém status %s coerente com done/progress', async status => {
    const response = await request(app).post('/tasks').send({ ...valid, status });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ status, done: status === 'COMPLETED', progress: status === 'COMPLETED' ? 100 : 0 });
  });

  it('valida datas também ao chamar o Service diretamente', () => {
    const service = new TasksService(new TasksRepository(connection.db), new ProjectsRepository(connection.db));
    expect(() => service.create({ ...valid, priority: 'HIGH', status: 'PENDING', startDate: 'invalid' })).toThrow(/datas válidas/);
    expect(() => service.create({ ...valid, priority: 'HIGH', status: 'PENDING', dueDate: '2026-10-01' })).toThrow(/prazo/);
  });

  it('usa dia local, incluindo virada UTC e ano bissexto', async () => {
    expect(localToday(new Date('2026-10-03T01:00:00Z'), 'America/Sao_Paulo')).toBe('2026-10-02');
    expect(localToday(new Date('2026-10-03T03:00:00Z'), 'America/Sao_Paulo')).toBe('2026-10-03');
    vi.setSystemTime(new Date('2028-02-29T12:00:00Z'));
    expect((await request(app).post('/tasks').send({ ...valid, startDate: '2028-02-29', dueDate: '2028-02-29' })).status).toBe(201);
  });

  it('preserva POST /projects e /health', async () => {
    expect((await request(app).post('/projects').send({ name: 'Outro', color: '#fff', icon: 'P' })).status).toBe(201);
    const response = await request(app).get('/health');
    expect(response.status).toBe(200); expect(response.body).toEqual({ status: 'ok' });
  });

  it('consulta banco vazio com 200 []', async () => {
    const response = await request(app).get('/tasks');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('POST/GET preservam todos os campos SQLite, projeto e progresso persistido', async () => {
    const created = await request(app).post('/tasks').send({ ...valid, description: 'Persistida', time: '09:30' });
    expect(created.status).toBe(201);
    const id = created.body.id;
    connection.db.update(tasks).set({ progress: 37, status: 'PARTIAL' }).where(eq(tasks.id, id)).run();
    connection.db.insert(subtasks).values({ id: 's', taskId: id, title: 'Persistida', done: true }).run();
    const expected = connection.db.select().from(tasks).where(eq(tasks.id, id)).get();
    const children = connection.db.select().from(subtasks).all();
    const project = connection.db.select().from(projects).get();
    const list = await request(app).get('/tasks');
    const detail = await request(app).get(`/tasks/${id}`);
    expect(list.status).toBe(200);
    expect(detail.status).toBe(200);
    expect(detail.body).toEqual({ ...expected, project, subtasks: children });
    expect(list.body).toEqual([detail.body]);
    expect(detail.body.projectId).toBe('p');
    expect(detail.body.progress).toBe(37);
    expect((await request(app).get('/health')).status).toBe(200);
  });

  it('lista só tarefas ativas e não mistura subtarefas entre pais', async () => {
    const first = (await request(app).post('/tasks').send(valid)).body;
    const second = (await request(app).post('/tasks').send({ ...valid, title: 'Outra' })).body;
    const deleted = (await request(app).post('/tasks').send(valid)).body;
    connection.db.update(tasks).set({ deletedAt: new Date().toISOString() }).where(eq(tasks.id, deleted.id)).run();
    connection.db.insert(subtasks).values({ id: 's', taskId: first.id, title: 'Filha' }).run();
    const response = await request(app).get('/tasks');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.find((task: { id: string }) => task.id === first.id).subtasks).toHaveLength(1);
    expect(response.body.find((task: { id: string }) => task.id === second.id).subtasks).toEqual([]);
    expect(response.body.some((task: { id: string }) => task.id === deleted.id)).toBe(false);
  });

  it.each(['missing', 'deleted'])('retorna 404 TASK_NOT_FOUND para %s', async id => {
    if (id === 'deleted') {
      connection.db.insert(tasks).values({ ...valid, priority: 'HIGH', id, deletedAt: new Date().toISOString() }).run();
    }
    const response = await request(app).get(`/tasks/${id}`);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'TASK_NOT_FOUND', message: 'Tarefa não encontrada.' } });
  });

  it('falha de consulta usa o padrão 500 sem expor detalhes internos', async () => {
    const spy = vi.spyOn(connection.db, 'select').mockImplementation(() => { throw new Error('private database path'); });
    try {
      const response = await request(app).get('/tasks');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } });
    } finally { spy.mockRestore(); }
  });

  it.each(['patch', 'delete'] as const)('não implementa %s /tasks', async method => {
    expect((await request(app)[method]('/tasks')).status).toBe(404);
  });
});
