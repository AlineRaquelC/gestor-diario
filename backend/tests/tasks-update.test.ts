import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import request from 'supertest';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';
import { projects, tasks, taskHistory, subtasks } from '../src/database/schema/index.js';
import { TasksRepository } from '../src/repositories/tasks.js';

let connection: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
let original: typeof tasks.$inferSelect;
const valid = { title: 'Tarefa', description: 'Original', projectId: 'p', startDate: '2026-10-03', dueDate: '2026-10-05', time: '10:00', priority: 'HIGH', status: 'PARTIAL' };

describe('PATCH /tasks/:id', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T12:00:00Z'));
    connection = openDatabase(':memory:');
    migrate(connection.db, { migrationsFolder });
    connection.db.insert(projects).values([
      { id: 'p', name: 'Projeto', color: '#fff', icon: 'P' },
      { id: 'p2', name: 'Outro', color: '#000', icon: 'O' },
      { id: 'deleted', name: 'Excluído', color: '#fff', icon: 'P', deletedAt: '2026-10-01T12:00:00Z' },
    ]).run();
    app = createApp(connection.db);
    const created = await request(app).post('/tasks').send(valid);
    expect(created.status).toBe(201);
    original = created.body;
  });
  afterEach(() => { connection.sqlite.close(); vi.useRealTimers(); vi.restoreAllMocks(); });
  const patch = (body: object, id = original.id) => request(app).patch(`/tasks/${id}`).send(body);
  const history = () => connection.db.select().from(taskHistory).all();

  it('POST → PATCH → GET preserva SQLite e atualiza todos os campos editáveis', async () => {
    const input = { title: 'Nova', description: 'Atualizada', projectId: 'p2', startDate: '2026-10-04', dueDate: '2026-10-06', time: '18:30', priority: 'LOW', status: 'COMPLETED' };
    const response = await patch(input);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ...input, id: original.id, done: true, progress: 100, createdAt: original.createdAt });
    expect(response.body.updatedAt > original.updatedAt).toBe(true);
    expect(response.body.project).toMatchObject({ id: 'p2', name: 'Outro' });
    const { project, subtasks: children, ...row } = response.body;
    expect(project.id).toBe(response.body.projectId);
    expect(children).toEqual([]);
    expect(connection.db.select().from(tasks).get()).toEqual(row);
    expect((await request(app).get(`/tasks/${original.id}`)).body).toEqual(response.body);
    expect((await request(app).get('/tasks')).body).toEqual([response.body]);
    expect((await request(app).get('/health')).status).toBe(200);
    expect(history()).toEqual([expect.objectContaining({ taskId: original.id, action: 'UPDATED', createdAt: response.body.updatedAt, metadata: { fields: expect.arrayContaining(Object.keys(input)) } })]);
  });

  it('PATCH parcial preserva campos omitidos e não aplica default de status', async () => {
    const response = await patch({ title: ' Outra ' });
    expect(response.status).toBe(200);
    const { updatedAt, project: _project, subtasks: _subtasks, ...row } = response.body;
    const { updatedAt: _originalUpdated, ...unchanged } = original;
    expect(row).toEqual({ ...unchanged, title: 'Outra' });
    expect(updatedAt > original.updatedAt).toBe(true);
    expect(history()[0].metadata).toEqual({ fields: ['title'] });
  });

  it.each([
    {}, { title: '' }, { title: '  ' }, { projectId: '' }, { projectId: '  ' },
    { priority: 'URGENT' }, { status: 'INVALID' }, { time: '25:00' }, { time: '10:70' },
    { startDate: '2026-02-30' }, { dueDate: '2026-13-01' }, { startDate: '2026-10-03T12:00:00Z' },
    { title: null }, { projectId: null }, { description: 42 }, { time: 42 },
    { id: 'other' }, { done: true }, { progress: 100 }, { favorite: true },
    { createdAt: 'now' }, { updatedAt: 'now' }, { subtasks: [] }, { unknown: 'x', title: 'Outra' },
  ])('payload inválido %j retorna 400 sem alterar tarefa/histórico', async body => {
    const response = await patch(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(connection.db.select().from(tasks).get()).toEqual(original);
    expect(history()).toEqual([]);
  });

  it.each(['missing', 'soft-deleted'])('tarefa %s retorna 404 TASK_NOT_FOUND', async id => {
    if (id === 'soft-deleted') {
      connection.db.update(tasks).set({ deletedAt: '2026-10-03T12:00:00Z' }).where(eq(tasks.id, original.id)).run();
      id = original.id;
    }
    const response = await patch({ title: 'Outra' }, id);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'TASK_NOT_FOUND', message: 'Tarefa não encontrada.' } });
    expect(history()).toEqual([]);
  });

  it.each(['missing', 'deleted'])('projeto %s retorna 404 sem alterar vínculo', async projectId => {
    const response = await patch({ projectId });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    expect(connection.db.select().from(tasks).get()).toEqual(original);
    expect(history()).toEqual([]);
  });

  it.each([{ dueDate: '2026-10-02' }, { startDate: '2026-10-06' }, { startDate: '2026-10-02' }])('valida as datas mescladas %j', async body => {
    expect((await patch(body)).status).toBe(400);
    expect(connection.db.select().from(tasks).get()).toEqual(original);
    expect(history()).toEqual([]);
  });

  it.each([false, true])('preserva início e prazo antigos, incluindo início reenviado (%s)', async resendStart => {
    connection.db.update(tasks).set({ startDate: '2026-09-01', dueDate: '2026-09-10' }).where(eq(tasks.id, original.id)).run();
    const response = await patch({ title: 'Antiga editada', ...(resendStart ? { startDate: '2026-09-01' } : {}) });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ startDate: '2026-09-01', dueDate: '2026-09-10', title: 'Antiga editada' });
    expect((await patch({ startDate: '2026-09-02' })).status).toBe(400);
    expect((await patch({ startDate: '2026-10-03', dueDate: '2026-10-05' })).status).toBe(200);
  });

  it('permite limpar descrição/horário explicitamente com null', async () => {
    const response = await patch({ description: null, time: null });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ description: null, time: null });
  });

  it.each(['LOW', 'MEDIUM', 'HIGH'])('aceita prioridade %s', async priority => {
    expect((await patch({ priority })).body.priority).toBe(priority);
  });

  it.each(['PENDING', 'PARTIAL', 'COMPLETED'])('preserva a compatibilidade existente do status %s', async status => {
    const response = await patch({ status });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status, done: status === 'COMPLETED', progress: status === 'COMPLETED' ? 100 : 0 });
    expect(history().map(event => event.action)).toEqual(['UPDATED']);
  });

  it('não recalcula progress nem altera subtarefas durante edição de outros campos', async () => {
    connection.db.update(tasks).set({ progress: 37 }).where(eq(tasks.id, original.id)).run();
    connection.db.insert(subtasks).values({ id: 's', taskId: original.id, title: 'Filha' }).run();
    const response = await patch({ title: 'Nova', status: 'PARTIAL' });
    expect(response.body.progress).toBe(37);
    expect(response.body.subtasks).toHaveLength(1);
    expect(connection.db.select().from(subtasks).get()?.title).toBe('Filha');
  });

  it('duas edições no mesmo milissegundo atualizam updatedAt e preservam createdAt', async () => {
    const first = await patch({ title: 'Primeira' });
    const second = await patch({ title: 'Segunda' });
    expect(second.body.updatedAt > first.body.updatedAt).toBe(true);
    expect(second.body.createdAt).toBe(original.createdAt);
    expect(history().map(event => event.action)).toEqual(['UPDATED', 'UPDATED']);
  });

  it('falha no registro UPDATED desfaz a edição na mesma transação', async () => {
    vi.spyOn(TasksRepository.prototype, 'recordUpdate').mockImplementation(() => { throw new Error('history failure'); });
    const response = await patch({ title: 'Não persistida' });
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(connection.db.select().from(tasks).get()).toEqual(original);
    expect(history()).toEqual([]);
  });
});
