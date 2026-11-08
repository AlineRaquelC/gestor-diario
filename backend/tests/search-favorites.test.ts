import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';
import { projects, tasks, notes, recurrenceSeries, taskHistory } from '../src/database/schema/index.js';
import { createApp } from '../src/app.js';
let connection: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-07T12:00:00Z'));
  connection = openDatabase(':memory:'); migrate(connection.db, { migrationsFolder });
  connection.db.insert(projects).values({ id: 'p', name: 'Marketing', color: '#fff', icon: 'P' }).run();
  connection.db.insert(tasks).values([
    { id: 'a', title: 'Revisar proposta do Cliente', description: 'AÇÃO especial', favorite: null },
    { id: 'b', title: 'Revisar proposta do Cliente', description: 'Contato com cliente' },
    { id: 'c', title: 'Outra', description: null },
    { id: 'deleted', title: 'Cliente', description: 'secreto', deletedAt: '2026-11-07T11:00:00Z' },
  ].map(item => ({ ...item, projectId: 'p', priority: 'LOW' as const, startDate: '2026-11-07', dueDate: '2026-11-08' }))).run();
  connection.db.insert(notes).values([
    { id: 'n1', taskId: 'c', content: 'Conversar com CLIENTE amanhã' },
    { id: 'n2', taskId: 'c', content: 'cliente extra' },
    { id: 'n3', taskId: 'a', content: 'Cliente com 100%_literal' },
    { id: 'n4', taskId: 'deleted', content: 'somente tombstone' },
  ]).run();
  app = createApp(connection.db);
});
afterEach(() => { connection.sqlite.close(); vi.useRealTimers(); vi.restoreAllMocks(); });
const search = (q: string) => request(app).get('/tasks/search').query({ q });
it('busca real em título/descrição/Notes sem N+1, duplicação ou perda de homônimos', async () => {
  const trace = vi.spyOn(connection.sqlite, 'prepare');
  const result = await search('  clIENte  ');
  expect(result.status).toBe(200); expect(result.body.map((item: { id: string }) => item.id).sort()).toEqual(['a', 'b', 'c']);
  expect(trace.mock.calls.filter(([query]) => String(query).includes('SELECT 1 FROM "notes"'))).toHaveLength(1);
  expect(result.body.find((item: { id: string }) => item.id === 'a').favorite).toBe(false);
  expect(result.body).toEqual((await request(app).get('/tasks')).body);
});
it.each([['propost', ['a', 'b']], ['especial', ['a']], ['CONVERSAR', ['c']], ['ação', ['a']], ['AÇÃO', ['a']], ['100%_', ['a']], ['inexistente', []], ['tombstone', []], ['secreto', []], ['acao', []]])('substring/case/literal %s', async (q, ids) => {
  const result = await search(q); expect(result.status).toBe(200);
  expect(result.body.map((item: { id: string }) => item.id).sort()).toEqual(ids);
});
it('query vazia/ausente lista ativas e GET não modifica dados', async () => {
  const before = connection.sqlite.prepare('SELECT * FROM tasks').all();
  const normal = (await request(app).get('/tasks')).body;
  expect((await search('  ')).body).toEqual(normal);
  expect((await request(app).get('/tasks/search')).body).toEqual(normal);
  expect(connection.sqlite.prepare('SELECT * FROM tasks').all()).toEqual(before);
  expect(connection.db.select().from(taskHistory).all()).toEqual([]);
});
it.each(['q[x]=a', 'q=a&q=b'])('query não escalar rejeitada: %s', async query => {
  expect((await request(app).get(`/tasks/search?${query}`)).status).toBe(400);
});
it('favorite alterna, persiste e usa UPDATED; repetição não cria evento', async () => {
  for (const favorite of [true, false]) {
    const response = await request(app).patch('/tasks/a').send({ favorite });
    expect(response.status).toBe(200); expect(response.body.favorite).toBe(favorite);
    expect((await request(app).get('/tasks/a')).body.favorite).toBe(favorite);
    const count = connection.db.select().from(taskHistory).all().length;
    expect((await request(app).patch('/tasks/a').send({ favorite })).status).toBe(200);
    expect(connection.db.select().from(taskHistory).all()).toHaveLength(count);
  }
  expect(connection.db.select().from(taskHistory).all()).toEqual([
    expect.objectContaining({ action: 'UPDATED', metadata: { fields: ['favorite'] } }),
    expect.objectContaining({ action: 'UPDATED', metadata: { fields: ['favorite'] } }),
  ]);
});
it.each([null, 1, 'true', {}, []])('favorite exige boolean real: %j', async favorite => {
  expect((await request(app).patch('/tasks/a').send({ favorite })).status).toBe(400);
  expect((await request(app).get('/tasks/a')).body.favorite).toBe(false);
});
it('ocorrência favorita é isolada; tombstone não aceita PATCH', async () => {
  connection.db.insert(recurrenceSeries).values({ id: 's', clientId: 'sc', frequency: 'DAILY', timeZone: 'UTC', anchorDate: '2026-11-07', firstOccurrenceKey: '2026-11-07', title: 'Série', projectId: 'p', priority: 'LOW', startOffsetDays: 0, subtasks: [], reminders: [] }).run();
  connection.db.update(tasks).set({ recurrenceSeriesId: 's', occurrenceKey: '2026-11-07' }).where(eq(tasks.id, 'a')).run();
  connection.db.update(tasks).set({ recurrenceSeriesId: 's', occurrenceKey: '2026-11-08' }).where(eq(tasks.id, 'b')).run();
  const series = connection.db.select().from(recurrenceSeries).all();
  expect((await request(app).patch('/tasks/a').send({ favorite: true })).body.favorite).toBe(true);
  expect((await request(app).get('/tasks/b')).body.favorite).toBe(false);
  expect(connection.db.select().from(recurrenceSeries).all()).toEqual(series);
  expect((await request(app).patch('/tasks/deleted').send({ favorite: true })).status).toBe(404);
});
