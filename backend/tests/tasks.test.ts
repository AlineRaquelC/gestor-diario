import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import request from 'supertest';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';
import { projects, tasks, taskHistory } from '../src/database/schema/index.js';
import { localToday, TasksService } from '../src/services/tasks.js';
import { TasksRepository } from '../src/repositories/tasks.js';
import { ProjectsRepository } from '../src/repositories/projects.js';

let connection: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
const valid = { title: 'Tarefa', projectId: 'p', startDate: '2026-10-02', dueDate: '2026-10-03', priority: 'HIGH' };

describe('POST /tasks', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T01:00:00.000Z')); // Still Oct 2 in Sao Paulo.
    connection = openDatabase(':memory:');
    migrate(connection.db, { migrationsFolder });
    connection.db.insert(projects).values({ id: 'p', name: 'Projeto', color: '#fff', icon: 'P' }).run();
    app = createApp(connection.db);
  });
  afterEach(() => { connection.sqlite.close(); vi.useRealTimers(); });

  it('cria com defaults, UUID, timestamps e persistência, sem histórico', async () => {
    const response = await request(app).post('/tasks').send(valid);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ ...valid, status: 'PENDING', done: false, progress: 0, favorite: false, deletedAt: null, undoUntil: null, description: null, time: null });
    expect(response.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(response.body.createdAt).toBe('2026-10-03T01:00:00.000Z');
    expect(response.body.updatedAt).toBe(response.body.createdAt);
    expect(connection.db.select().from(tasks).get()).toEqual(response.body);
    expect(connection.db.select().from(taskHistory).all()).toEqual([]);
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

  it.each(['get', 'patch', 'delete'] as const)('não implementa %s /tasks', async method => {
    expect((await request(app)[method]('/tasks')).status).toBe(404);
  });
});
