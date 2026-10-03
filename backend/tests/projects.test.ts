import { and, eq, isNull } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';
import { projects, tasks } from '../src/database/schema/index.js';

let connection: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
const input = { name: 'Faculdade', description: 'Atividades acadêmicas', color: '#8B5CF6', icon: '🎓' };

async function createProject() {
  const response = await request(app).post('/projects').send(input);
  expect(response.status).toBe(201);
  return response.body as typeof projects.$inferSelect;
}

describe('API de projetos', () => {
  beforeEach(() => {
    connection = openDatabase(':memory:');
    migrate(connection.db, { migrationsFolder });
    app = createApp(connection.db);
  });
  afterEach(() => {
    vi.useRealTimers();
    connection.sqlite.close();
  });

  it('POST cria e persiste os campos com UUID e timestamps', async () => {
    const project = await createProject();
    expect(project).toMatchObject({ ...input, deletedAt: null });
    expect(project.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(project.createdAt).toBe(project.updatedAt);
    expect(new Date(project.createdAt).toISOString()).toBe(project.createdAt);
    expect(connection.db.select().from(projects).get()).toEqual(project);
  });

  it('POST permite omitir ou limpar description e normaliza campos obrigatórios', async () => {
    const response = await request(app).post('/projects').send({ name: ' Geral ', color: ' #fff ', icon: ' 📚 ' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Geral', color: '#fff', icon: '📚', description: null });
  });

  it.each([
    {}, { ...input, name: '' }, { ...input, name: '   ' },
    { ...input, color: '' }, { ...input, icon: '   ' },
    { ...input, name: null }, { ...input, color: 123 },
    { name: 'P', icon: 'P' }, { name: 'P', color: '#fff' },
    { ...input, description: 123 }, { ...input, id: 'client-id' },
    { ...input, deletedAt: '2026-10-02T12:00:00.000Z' },
  ])('POST rejeita payload inválido %j sem persistir', async body => {
    const response = await request(app).post('/projects').send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(connection.db.select().from(projects).all()).toEqual([]);
  });

  it('GET lista começa vazia e retorna projetos persistidos', async () => {
    const empty = await request(app).get('/projects');
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual([]);
    const project = await createProject();
    const response = await request(app).get('/projects');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([project]);
  });

  it('GET por ID retorna projeto', async () => {
    const project = await createProject();
    const response = await request(app).get(`/projects/${project.id}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(project);
  });

  it.each(['get', 'patch', 'delete'] as const)('%s de ID inexistente retorna 404 consistente', async method => {
    const response = await request(app)[method]('/projects/missing').send(method === 'patch' ? { name: 'Novo' } : undefined);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'PROJECT_NOT_FOUND', message: 'Projeto não encontrado.' } });
  });

  it.each(['get', 'patch', 'delete'] as const)('%s rejeita ID vazio em vez de exigir UUID', async method => {
    const response = await request(app)[method]('/projects/%20').send(method === 'patch' ? { name: 'Novo' } : undefined);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('aceita IDs string existentes do modelo', async () => {
    connection.db.insert(projects).values({ id: 'project-001', ...input }).run();
    expect((await request(app).get('/projects/project-001')).status).toBe(200);
  });

  it('PATCH altera somente campos enviados e atualiza updatedAt', async () => {
    const project = await createProject();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(Date.parse(project.createdAt) + 1000));
    const response = await request(app).patch(`/projects/${project.id}`).send({ name: 'Novo' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ...project, name: 'Novo', updatedAt: new Date().toISOString() });
    expect(response.body.updatedAt).not.toBe(project.updatedAt);
    expect(connection.db.select().from(projects).get()).toEqual(response.body);
  });

  it('PATCH permite description null e alterações de cor e ícone', async () => {
    const project = await createProject();
    const response = await request(app).patch(`/projects/${project.id}`).send({ description: null, color: '#fff', icon: '📚' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ description: null, color: '#fff', icon: '📚', name: input.name });
  });

  it.each([{}, { name: '' }, { name: '   ' }, { color: null }, { icon: 1 }, { unknown: 'value' }, { name: 'Novo', createdAt: 'bad' }])('PATCH rejeita payload inválido %j', async body => {
    const project = await createProject();
    const response = await request(app).patch(`/projects/${project.id}`).send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(connection.db.select().from(projects).get()).toEqual(project);
  });

  it('DELETE sem dependências usa exclusão lógica, oculta a linha e retorna 204', async () => {
    const project = await createProject();
    const response = await request(app).delete(`/projects/${project.id}`);
    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    const stored = connection.db.select().from(projects).get()!;
    expect(stored.deletedAt).not.toBeNull();
    expect(stored.updatedAt).toBe(stored.deletedAt);
    expect(stored.createdAt).toBe(project.createdAt);
    expect((await request(app).get('/projects')).body).toEqual([]);
    expect((await request(app).get(`/projects/${project.id}`)).status).toBe(404);
    expect((await request(app).patch(`/projects/${project.id}`).send({ name: 'Novo' })).status).toBe(404);
    expect((await request(app).delete(`/projects/${project.id}`)).status).toBe(404);
  });

  it.each([null, '2026-10-02T12:00:00.000Z'])('DELETE com tarefa vinculada (deletedAt=%s) retorna 409 e preserva os dados', async deletedAt => {
    const project = await createProject();
    connection.db.insert(tasks).values({ id: 'task-001', title: 'Tarefa', projectId: project.id, startDate: '2026-10-02', dueDate: '2026-10-04', priority: 'LOW', deletedAt }).run();
    const response = await request(app).delete(`/projects/${project.id}`);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PROJECT_HAS_TASKS');
    expect(connection.db.select().from(projects).get()).toEqual(project);
    expect(connection.db.select().from(tasks).get()!.projectId).toBe(project.id);
    expect(connection.sqlite.pragma('foreign_key_check')).toEqual([]);
  });

  it('não bloqueia exclusão por tarefas pertencentes a outro projeto', async () => {
    const project = await createProject();
    connection.db.insert(projects).values({ id: 'other', ...input }).run();
    connection.db.insert(tasks).values({ id: 'task', title: 'T', projectId: 'other', startDate: '2026-10-02', dueDate: '2026-10-04', priority: 'LOW' }).run();
    expect((await request(app).delete(`/projects/${project.id}`)).status).toBe(204);
    expect(connection.db.select().from(projects).where(and(eq(projects.id, 'other'), isNull(projects.deletedAt))).get()).toBeDefined();
  });

  it('retorna erro consistente para JSON malformado', async () => {
    const response = await request(app).post('/projects').set('Content-Type', 'application/json').send('{');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('continua respondendo ao health check', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
