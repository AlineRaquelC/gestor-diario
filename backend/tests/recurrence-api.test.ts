import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';
import { projects, tasks, taskReminders, subtasks, notes, taskHistory, recurrenceSeries } from '../src/database/schema/index.js';

let connection: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
const template = { title: 'Rotina', description: 'Base', projectId: 'p', priority: 'MEDIUM', time: '10:30',
  startOffsetDays: 0, subtasks: [{ title: 'Passo' }], reminders: [{ offsetMinutes: 0 }] };
const draft = { clientId: 'series-request', frequency: 'DAILY', timeZone: 'America/Sao_Paulo', anchorDate: '2026-10-29', template };
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-29T13:20:00Z'));
  connection = openDatabase(':memory:'); migrate(connection.db, { migrationsFolder });
  connection.db.insert(projects).values({ id: 'p', name: 'Projeto', color: '#fff', icon: 'P' }).run();
  app = createApp(connection.db, () => Date.now());
});
afterEach(() => {connection.sqlite.close(); vi.restoreAllMocks(); vi.useRealTimers();});
const create = async (body: object = draft) => {
  const response = await request(app).post('/recurrence-series').send(body);
  expect(response.status, JSON.stringify(response.body)).toBe(201); return response.body;
};
const generate = (id: string, body: object = {}) => request(app).post(`/recurrence-series/${id}/materialize`).send(body);
const rows = () => connection.db.select().from(tasks).all();
const snapshot = () => ({ tasks: rows(), series: connection.db.select().from(recurrenceSeries).all(),
  reminders: connection.db.select().from(taskReminders).all(), subtasks: connection.db.select().from(subtasks).all(),
  history: connection.db.select().from(taskHistory).all() });
const edit = async (id: string, taskId: string, changes: object) => {
  const current = (await request(app).get(`/recurrence-series/${id}`)).body;
  return request(app).patch(`/recurrence-series/${id}`).send({ expectedUpdatedAt: current.updatedAt, taskId, ...changes });
};

it('cria série/primeira Task atomicamente com IDs próprios, filhos, reminders e CREATED', async () => {
  const { series, firstOccurrence: task } = await create();
  expect(series).toMatchObject({ ...draft, id: expect.any(String), firstOccurrenceKey: draft.anchorDate, materializedThrough: draft.anchorDate });
  expect(task).toMatchObject({ recurrenceSeriesId: series.id, occurrenceKey: draft.anchorDate, startDate: draft.anchorDate,
    dueDate: draft.anchorDate, status: 'PENDING', done: false, progress: 0, reminderTimeZone: draft.timeZone });
  expect(task.id).not.toBe(series.id); expect(task.subtasks[0]).toMatchObject({ title: 'Passo', done: false, taskId: task.id });
  expect(task.reminders[0]).toMatchObject({ id: expect.any(String), taskId: task.id, offsetMinutes: 0, triggerAt: '2026-10-29T13:30:00.000Z' });
  expect(task.recurrence).toMatchObject({ frequency: 'DAILY', timeZone: draft.timeZone }); expect(task.recurrence).not.toHaveProperty('template');
  expect(rows()).toHaveLength(1);
  expect(connection.db.select().from(taskHistory).all()).toEqual([expect.objectContaining({ taskId: task.id, action: 'CREATED', metadata: { seriesId: series.id, occurrenceKey: draft.anchorDate } })]);
});
it('retry de clientId preserva primeira Task mesmo após resposta perdida, âncora editada, vencimento e DELETE', async () => {
  const { series, firstOccurrence } = await create();
  await edit(series.id, firstOccurrence.id, { frequency: 'WEEKLY', anchorDate: '2026-11-01' });
  await request(app).delete(`/tasks/${firstOccurrence.id}`); vi.setSystemTime(new Date('2026-12-30T12:00:00Z'));
  const before = snapshot(); const retried = await create();
  expect(retried.series.id).toBe(series.id); expect(retried.series.anchorDate).toBe('2026-11-01');
  expect(retried.firstOccurrence.id).toBe(firstOccurrence.id); expect(retried.firstOccurrence.deletedAt).not.toBeNull();
  expect(retried.firstOccurrence.subtasks).toEqual(firstOccurrence.subtasks); expect(retried.firstOccurrence.reminders).toEqual(firstOccurrence.reminders);
  expect(snapshot()).toEqual(before);
});
it('DAILY inclui limite +31; segunda execução zero e avanço do dia só estende uma ocorrência', async () => {
  const { series, firstOccurrence } = await create();
  const first = await generate(series.id); expect(first.status).toBe(200); expect(first.body.created).toHaveLength(31);
  expect(first.body.series.materializedThrough).toBe('2026-11-29'); expect(rows()).toHaveLength(32);
  expect(rows().filter(task => task.occurrenceKey === draft.anchorDate).map(task => task.id)).toEqual([firstOccurrence.id]);
  expect(first.body.created.at(-1).occurrenceKey).toBe('2026-11-29');
  const before = snapshot(); expect((await generate(series.id)).body.created).toEqual([]); expect(snapshot()).toEqual(before);
  vi.setSystemTime(new Date('2026-10-30T13:20:00Z'));
  const next = await generate(series.id); expect(next.body.created.map((task: { occurrenceKey: string }) => task.occurrenceKey)).toEqual(['2026-11-30']);
});
it.each(['DAILY', 'WEEKLY', 'MONTHLY'])('retries concorrentes de criação/materialização %s não duplicam slots ou History', async frequency => {
  const responses = await Promise.all(Array.from({ length: 4 }, () => request(app).post('/recurrence-series').send({ ...draft, frequency })));
  for (const response of responses) {expect(response.status).toBe(201);}
  const id = responses[0].body.series.id; expect(new Set(responses.map(response => response.body.firstOccurrence.id)).size).toBe(1);
  const results = await Promise.all(Array.from({ length: 4 }, () => generate(id)));
  expect(results.every(result => result.status === 200)).toBe(true);
  expect(results.slice(1).every(result => result.body.created.length === 0)).toBe(true);
  expect(new Set(rows().map(task => `${task.recurrenceSeriesId}:${task.occurrenceKey}`)).size).toBe(rows().length);
  expect(connection.db.select().from(taskHistory).all()).toHaveLength(rows().length);
});
it('WEEKLY preserva dia da âncora', async () => {
  const { series } = await create({ ...draft, frequency: 'WEEKLY' }); await generate(series.id);
  expect(rows().map(task => task.occurrenceKey)).toEqual(['2026-10-29', '2026-11-05', '2026-11-12', '2026-11-19', '2026-11-26']);
});
it.each([[2027, '28'], [2028, '29']])('MONTHLY em %s limita fevereiro e retorna ao dia 31 em março', async (year, february) => {
  vi.setSystemTime(new Date(`${year}-01-31T12:00:00Z`));
  const { series } = await create({ ...draft, frequency: 'MONTHLY', anchorDate: `${year}-01-31` });
  await generate(series.id); vi.setSystemTime(new Date(`${year}-03-01T12:00:00Z`)); await generate(series.id);
  expect(rows().map(task => task.occurrenceKey)).toEqual([`${year}-01-31`, `${year}-02-${february}`, `${year}-03-31`]);
});
it('preserva duração civil original e novas subtarefas/reminders sem copiar conclusão ou Notes', async () => {
  const { series, firstOccurrence } = await create({ ...draft, anchorDate: '2026-10-31', template: { ...template, startOffsetDays: 2 } });
  connection.db.insert(notes).values({ id: 'note', taskId: firstOccurrence.id, content: 'Histórica' }).run();
  await request(app).patch(`/tasks/${firstOccurrence.id}`).send({ status: 'COMPLETED', title: 'Editada somente aqui' });
  await generate(series.id);
  const next = (await request(app).get('/tasks')).body.find((task: { occurrenceKey: string }) => task.occurrenceKey === '2026-11-01');
  expect(next).toMatchObject({ title: template.title, startDate: '2026-10-30', dueDate: '2026-11-01', status: 'PENDING', done: false, progress: 0 });
  expect(next.subtasks[0]).toMatchObject({ title: 'Passo', done: false }); expect(next.subtasks[0].id).not.toBe(firstOccurrence.subtasks[0].id);
  expect(next.reminders[0].id).not.toBe(firstOccurrence.reminders[0].id); expect(next.reminders[0].triggerAt).toBe('2026-11-01T13:30:00.000Z');
  expect(connection.db.select().from(notes).all()).toHaveLength(1);
});
it('não faz backfill após longo período offline', async () => {
  vi.setSystemTime(new Date('2020-01-01T12:00:00Z'));
  const { series } = await create({ ...draft, anchorDate: '2020-01-01' });
  vi.setSystemTime(new Date('2026-10-29T13:20:00Z')); const result = await generate(series.id);
  expect(result.body.created).toHaveLength(32); expect(result.body.created[0].occurrenceKey).toBe('2026-10-29');
  expect(rows().filter(task => task.dueDate < '2026-10-29')).toHaveLength(1);
});
it('tombstone ocupa slot mesmo em recuperação da cobertura; restore usa mesmos IDs', async () => {
  const { series } = await create(); const generated = (await generate(series.id)).body.created[0];
  await request(app).delete(`/tasks/${generated.id}`);
  connection.db.update(recurrenceSeries).set({ materializedThrough: draft.anchorDate }).where(eq(recurrenceSeries.id, series.id)).run();
  expect((await generate(series.id)).body.created).toEqual([]); expect(rows()).toHaveLength(32);
  const restored = await request(app).post(`/tasks/${generated.id}/restore`);
  expect(restored.body.id).toBe(generated.id); expect(restored.body.reminders).toEqual(generated.reminders);
  expect(restored.body.subtasks).toEqual(generated.subtasks); expect(restored.body.occurrenceKey).toBe(generated.occurrenceKey);
});
it('NONE interrompe geração sem apagar Tasks/History/reminders nem avançar cobertura', async () => {
  const { series, firstOccurrence } = await create(); await generate(series.id);
  const tasksBefore = rows(), remindersBefore = connection.db.select().from(taskReminders).all();
  const stopped = await edit(series.id, firstOccurrence.id, { frequency: 'NONE' }); expect(stopped.status).toBe(200);
  vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));
  const result = await generate(series.id); expect(result.body.created).toEqual([]); expect(result.body.series.materializedThrough).toBe('2026-11-29');
  expect(rows()).toEqual(tasksBefore); expect(connection.db.select().from(taskReminders).all()).toEqual(remindersBefore);
  expect(connection.db.select().from(taskHistory).all()).toHaveLength(33);
});
it('editar regra preserva cobertura/Tasks já persistidas; novas extensões seguem WEEKLY', async () => {
  const { series, firstOccurrence } = await create(); await generate(series.id); const before = snapshot();
  const changed = await edit(series.id, firstOccurrence.id, { frequency: 'WEEKLY', template: { ...template, title: 'Nova regra' } });
  expect(changed.body.materializedThrough).toBe('2026-11-29'); expect(rows()).toEqual(before.tasks);
  expect(connection.db.select().from(taskReminders).all()).toEqual(before.reminders);
  expect((await generate(series.id)).body.created).toEqual([]);
  vi.setSystemTime(new Date('2026-11-04T13:20:00Z'));
  const next = await generate(series.id); expect(next.body.created.map((task: { occurrenceKey: string }) => task.occurrenceKey)).toEqual(['2026-12-03']);
  expect(next.body.created[0].title).toBe('Nova regra');
  const history = connection.db.select().from(taskHistory).all().find(event => event.action === 'UPDATED');
  expect(history?.metadata).toMatchObject({ seriesId: series.id, scope: 'unmaterialized' });
});
it('cobertura sem slots também persiste e nova frequência não preenche lacunas antigas', async () => {
  const { series, firstOccurrence } = await create({ ...draft, frequency: 'MONTHLY' });
  await generate(series.id); // 29/11 exists, intervening days remain covered.
  await edit(series.id, firstOccurrence.id, { frequency: 'DAILY' });
  expect((await generate(series.id)).body.created).toEqual([]); expect(rows()).toHaveLength(2);
  vi.setSystemTime(new Date('2026-10-30T13:20:00Z'));
  expect((await generate(series.id)).body.created.map((task: { occurrenceKey: string }) => task.occurrenceKey)).toEqual(['2026-11-30']);
});
it('conflito de edição por updatedAt é explícito e não sobrescreve regra', async () => {
  const { series, firstOccurrence } = await create(); await generate(series.id); const before = snapshot();
  const response = await request(app).patch(`/recurrence-series/${series.id}`).send({ expectedUpdatedAt: series.updatedAt, taskId: firstOccurrence.id, frequency: 'NONE' });
  expect(response.status).toBe(409); expect(response.body.error.code).toBe('RECURRENCE_CONFLICT'); expect(snapshot()).toEqual(before);
});
it('materialização tardia mantém offsets expirados e futuros da mesma ocorrência', async () => {
  vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
  const { series } = await create({ ...draft, anchorDate: '2026-10-28', template: { ...template, reminders: [{ offsetMinutes: 30 }, { offsetMinutes: 0 }] } });
  vi.setSystemTime(new Date('2026-10-29T13:20:00Z'));
  const task = (await generate(series.id)).body.created[0]; expect(task.occurrenceKey).toBe('2026-10-29');
  expect(task.reminders.map((item: { offsetMinutes: number }) => item.offsetMinutes)).toEqual([0, 30]);
  expect(task.reminders.map((item: { triggerAt: string }) => item.triggerAt)).toEqual(['2026-10-29T13:30:00.000Z', '2026-10-29T13:00:00.000Z']);
  expect(task.reminders.every((item: { taskId: string }) => item.taskId === task.id)).toBe(true);
});
it('trigger igual a agora permanece configurado na ocorrência ainda futura', async () => {
  vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
  const { series } = await create({ ...draft, anchorDate: '2026-10-28', template: { ...template, reminders: [{ offsetMinutes: 10 }] } });
  vi.setSystemTime(new Date('2026-10-29T13:20:00Z'));
  expect((await generate(series.id)).body.created[0].reminders[0].triggerAt).toBe('2026-10-29T13:20:00.000Z');
});
it.each(['2026-10-29T13:30:00Z', '2026-10-29T14:00:00Z'])('Task de hoje temporalmente passada em %s não é gerada', async now => {
  vi.setSystemTime(new Date('2026-10-28T12:00:00Z')); const { series } = await create({ ...draft, anchorDate: '2026-10-28' });
  vi.setSystemTime(new Date(now)); const result = await generate(series.id);
  expect(result.body.created[0].occurrenceKey).toBe('2026-10-30'); expect(result.body.series.materializedThrough).toBe('2026-11-29');
});
it('sem horário, hoje continua elegível e timezone da série funciona sem reminders', async () => {
  vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
  const { series } = await create({ ...draft, anchorDate: '2026-10-28', template: { ...template, time: null, reminders: [] } });
  vi.setSystemTime(new Date('2026-10-30T01:00:00Z')); // still 29/10 in the series zone
  const result = await generate(series.id); expect(result.body.created[0]).toMatchObject({ occurrenceKey: '2026-10-29', time: null, reminderTimeZone: null });
  expect(result.body.series.materializedThrough).toBe('2026-11-29');
});
it('criação e edição manuais continuam rejeitando novo reminder vencido', async () => {
  const invalid = { ...draft, template: { ...template, reminders: [{ offsetMinutes: 30 }] } };
  expect((await request(app).post('/recurrence-series').send(invalid)).status).toBe(400);
  const { series, firstOccurrence } = await create();
  expect((await edit(series.id, firstOccurrence.id, { template: invalid.template })).status).toBe(400);
  expect((await request(app).patch(`/tasks/${firstOccurrence.id}`).send({ reminders: [{ offsetMinutes: 30 }] })).status).toBe(400);
  expect((await request(app).post('/tasks').send({ title: 'Manual', projectId: 'p', startDate: draft.anchorDate, dueDate: draft.anchorDate,
    time: template.time, priority: template.priority, reminderTimeZone: draft.timeZone, reminders: [{ offsetMinutes: 30 }] })).status).toBe(400);
});
it.each(['Invalid/Zone', '+03:00', ''])('timezone inválido %s não persiste série', async timeZone => {
  expect((await request(app).post('/recurrence-series').send({ ...draft, timeZone })).status).toBe(400);
  expect(connection.db.select().from(recurrenceSeries).all()).toEqual([]);
});
it.each([
  { frequency: 'YEARLY' }, { clientId: '' }, { anchorDate: '2026-02-30' }, { until: '2030-01-01' },
  { template: { ...template, time: null } }, { template: { ...template, projectId: 'missing' } },
  { template: { ...template, subtasks: [{ id: 'old', title: 'Base' }] } },
  { template: { ...template, notes: ['Histórico'] } }, { template: { ...template, startOffsetDays: -1 } },
  { template: { ...template, status: 'COMPLETED' } },
  { template: { ...template, reminders: [{ offsetMinutes: 0, id: 'old' }] } },
])('rejeita contrato inválido de série %j', async changes => {
  const result = await request(app).post('/recurrence-series').send({ ...draft, ...changes });
  expect([400, 404]).toContain(result.status); expect(rows()).toEqual([]);
});
it('GETs não geram Tasks; endpoint global é explícito e rejeita referências arbitrárias', async () => {
  const { series } = await create(); const before = snapshot();
  await request(app).get('/tasks'); await request(app).get('/recurrence-series'); await request(app).get(`/recurrence-series/${series.id}`);
  expect(snapshot()).toEqual(before);
  expect((await generate(series.id, { referenceDate: '2030-01-01' })).status).toBe(400);
  expect((await request(app).post('/recurrence-series/materialize').send({ until: '2030-01-01' })).status).toBe(400);
  const generated = await request(app).post('/recurrence-series/materialize').send({}); expect(generated.status).toBe(200); expect(generated.body.createdCount).toBe(31);
  expect((await request(app).post('/recurrence-series/materialize').send({})).body.createdCount).toBe(0);
});
it.each(['get', 'patch', 'post'] as const)('série inexistente retorna 404 no método %s', async method => {
  const path = method === 'post' ? '/recurrence-series/missing/materialize' : '/recurrence-series/missing';
  const body = method === 'patch' ? { taskId: 'missing', expectedUpdatedAt: '2026-10-29T13:20:00.000Z', frequency: 'NONE' } : {};
  expect((await request(app)[method](path).send(body)).status).toBe(404);
});
it('proíbe forjar vínculo em POST/PATCH de Task e não aceita Task de outra série no History', async () => {
  const { series, firstOccurrence } = await create();
  const other = await create({ ...draft, clientId: 'other' });
  expect((await edit(series.id, other.firstOccurrence.id, { frequency: 'NONE' })).status).toBe(404);
  expect((await request(app).patch(`/tasks/${firstOccurrence.id}`).send({ occurrenceKey: '2026-11-01' })).status).toBe(400);
  expect((await request(app).post('/tasks').send({ title: 'T', projectId: 'p', startDate: draft.anchorDate, dueDate: draft.anchorDate, priority: 'LOW', recurrenceSeriesId: series.id, occurrenceKey: draft.anchorDate })).status).toBe(400);
});
it('Task normal mantém POST/GET/PATCH/RESTORE e não cria série', async () => {
  const response = await request(app).post('/tasks').send({ title: 'Normal', projectId: 'p', startDate: draft.anchorDate, dueDate: draft.anchorDate, priority: 'LOW' });
  expect(response.status).toBe(201); expect(response.body).toMatchObject({ recurrenceSeriesId: null, occurrenceKey: null });
  expect(response.body).not.toHaveProperty('recurrence'); expect(connection.db.select().from(recurrenceSeries).all()).toEqual([]);
  await request(app).delete(`/tasks/${response.body.id}`);
  expect((await request(app).post(`/tasks/${response.body.id}/restore`)).body.id).toBe(response.body.id);
});
it.each(['subtasks', 'task_reminders', 'task_history'])('falha em %s reverte série, primeira Task e coleções inteiras', async table => {
  connection.sqlite.exec(`CREATE TRIGGER fail_creation BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT, 'test'); END`);
  expect((await request(app).post('/recurrence-series').send(draft)).status).toBe(500);
  const state = snapshot(); for (const value of Object.values(state)) {expect(value).toEqual([]);}
});
it.each(['occurrence', 'history', 'coverage'])('falha %s no lote reverte todas as inserções e cobertura', async failure => {
  const { series } = await create(); const before = snapshot();
  connection.sqlite.exec(failure === 'occurrence'
    ? "CREATE TRIGGER fail_batch BEFORE INSERT ON tasks WHEN NEW.occurrence_key = '2026-10-31' BEGIN SELECT RAISE(ABORT, 'test'); END"
    : failure === 'history' ? "CREATE TRIGGER fail_batch BEFORE INSERT ON task_history BEGIN SELECT RAISE(ABORT, 'test'); END"
    : "CREATE TRIGGER fail_batch BEFORE UPDATE ON recurrence_series BEGIN SELECT RAISE(ABORT, 'test'); END");
  expect((await generate(series.id)).status).toBe(500); expect(snapshot()).toEqual(before);
});
it('falha no History da regra desfaz regra sem alterar Tasks/filhos', async () => {
  const { series, firstOccurrence } = await create(); const before = snapshot();
  connection.sqlite.exec("CREATE TRIGGER fail_edit BEFORE INSERT ON task_history BEGIN SELECT RAISE(ABORT, 'test'); END");
  expect((await edit(series.id, firstOccurrence.id, { frequency: 'NONE' })).status).toBe(500); expect(snapshot()).toEqual(before);
});
it('gap DST futuro aborta materialização sem avançar cobertura ou corrigir hora silenciosamente', async () => {
  vi.setSystemTime(new Date('2027-03-01T00:00:00Z'));
  const { series } = await create({ ...draft, anchorDate: '2027-03-01', timeZone: 'America/New_York', template: { ...template, time: '02:30' } });
  const before = snapshot(); const response = await generate(series.id);
  expect(response.status).toBe(400); expect(response.body.error.message).toContain('inexistente ou ambíguo'); expect(snapshot()).toEqual(before);
});

it('ativar uma Task existente preserva o próprio ID, estado, subtarefas, reminders, Notes e History', async () => {
  const manual = (await request(app).post('/tasks').send({ title: 'Existente', projectId: 'p', startDate: draft.anchorDate, dueDate: draft.anchorDate,
    time: '10:30', priority: 'HIGH', reminderTimeZone: draft.timeZone, reminders: [{ offsetMinutes: 0 }], subtasks: [{ title: 'Item' }] })).body;
  connection.db.insert(notes).values({ id: 'existing-note', taskId: manual.id, content: 'Preservar' }).run();
  await request(app).patch(`/tasks/${manual.id}`).send({ status: 'COMPLETED' });
  const before = snapshot(); vi.setSystemTime(new Date('2026-10-30T13:20:00Z'));
  const input = { clientId: 'activate', frequency: 'DAILY', timeZone: draft.timeZone };
  const activated = await request(app).post(`/recurrence-series/from-task/${manual.id}`).send(input);
  expect(activated.status).toBe(201); expect(activated.body.firstOccurrence).toMatchObject({ id: manual.id, status: 'COMPLETED', occurrenceKey: draft.anchorDate });
  expect(activated.body.firstOccurrence.subtasks).toEqual(before.subtasks); expect(activated.body.firstOccurrence.reminders).toEqual(manual.reminders);
  expect(rows()).toHaveLength(1); expect(connection.db.select().from(notes).all()).toHaveLength(1);
  const after = snapshot();
  expect((await request(app).post(`/recurrence-series/from-task/${manual.id}`).send(input)).body).toEqual(activated.body);
  expect(snapshot()).toEqual(after);
  const next = (await generate(activated.body.series.id)).body.created[0];
  expect(next.status).toBe('PENDING'); expect(next.subtasks[0].done).toBe(false); expect(next.subtasks[0].id).not.toBe(manual.subtasks[0].id);
});
it('ativação rejeita troca silenciosa de fuso e não cria segunda série para a mesma Task', async () => {
  const { firstOccurrence } = await create();
  expect((await request(app).post(`/recurrence-series/from-task/${firstOccurrence.id}`).send({ clientId: 'new', frequency: 'DAILY', timeZone: draft.timeZone })).status).toBe(409);
  const normal = (await request(app).post('/tasks').send({ title: 'Fuso', projectId: 'p', startDate: draft.anchorDate, dueDate: draft.anchorDate, time: '10:30', priority: 'LOW', reminderTimeZone: draft.timeZone, reminders: [{ offsetMinutes: 0 }] })).body;
  expect((await request(app).post(`/recurrence-series/from-task/${normal.id}`).send({ clientId: 'activate', frequency: 'DAILY', timeZone: 'UTC' })).status).toBe(400);
  expect(rows()).toHaveLength(2); expect(connection.db.select().from(recurrenceSeries).all()).toHaveLength(1);
});
it('falha de History da ativação reverte série e vínculo sem perder a Task original', async () => {
  const normal = (await request(app).post('/tasks').send({ title: 'Existente', projectId: 'p', startDate: draft.anchorDate, dueDate: draft.anchorDate, priority: 'LOW' })).body;
  const before = snapshot();
  connection.sqlite.exec("CREATE TRIGGER fail_activation BEFORE INSERT ON task_history BEGIN SELECT RAISE(ABORT, 'test'); END");
  expect((await request(app).post(`/recurrence-series/from-task/${normal.id}`).send({ clientId: 'activate', frequency: 'DAILY', timeZone: 'UTC' })).status).toBe(500);
  expect(snapshot()).toEqual(before);
});
it('extensão sem slots avança cobertura sem criar Tasks ou eventos', async () => {
  const { series } = await create({ ...draft, frequency: 'WEEKLY' }); await generate(series.id);
  const before = snapshot(); vi.setSystemTime(new Date('2026-10-30T13:20:00Z'));
  const result = await generate(series.id); expect(result.body.created).toEqual([]); expect(result.body.series.materializedThrough).toBe('2026-11-30');
  expect(rows()).toEqual(before.tasks); expect(connection.db.select().from(taskHistory).all()).toEqual(before.history);
});
it.each([
  [{ offsetMinutes: 0 }, { offsetMinutes: 0 }],
  [0, 1, 2, 3, 4, 5].map(offsetMinutes => ({ offsetMinutes })),
  [{ offsetMinutes: -1 }], [{ offsetMinutes: Number.MAX_SAFE_INTEGER }],
])('template rejeita offsets inválidos %j', async reminders => {
  expect((await request(app).post('/recurrence-series').send({ ...draft, template: { ...template, reminders } })).status).toBe(400);
  expect(rows()).toEqual([]);
});
it('o lote global também é atômico entre séries', async () => {
  await create(); await create({ ...draft, clientId: 'other' }); const before = snapshot();
  const lastId = before.series.map(series => series.id).sort().at(-1)!;
  // ID is generated by the service, not supplied by an external request.
  connection.sqlite.exec(`CREATE TRIGGER fail_global BEFORE INSERT ON tasks WHEN NEW.recurrence_series_id = '${lastId}' BEGIN SELECT RAISE(ABORT, 'test'); END`);
  expect((await request(app).post('/recurrence-series/materialize').send({})).status).toBe(500);
  expect(snapshot()).toEqual(before);
});

it('regressão MONTHLY persiste janeiro a maio usando sempre a âncora original', async () => {
  vi.setSystemTime(new Date('2027-01-31T12:00:00Z'));
  const { series } = await create({ ...draft, frequency: 'MONTHLY', anchorDate: '2027-01-31' });
  for (const day of ['2027-01-31', '2027-03-01', '2027-04-01', '2027-05-01']) {
    vi.setSystemTime(new Date(`${day}T12:00:00Z`));
    expect((await generate(series.id)).status).toBe(200);
  }
  expect(rows().map(task => task.occurrenceKey)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31']);
});
it('excluir ocorrência e materializar novamente mantém tombstone, cobertura e filhos', async () => {
  const { series } = await create(); const generated = (await generate(series.id)).body.created[0];
  expect((await request(app).delete(`/tasks/${generated.id}`)).status).toBe(200);
  const before = snapshot();
  const result = await generate(series.id);
  expect(result.status).toBe(200); expect(result.body.created).toEqual([]); expect(snapshot()).toEqual(before);
  expect(rows().filter(task => task.recurrenceSeriesId === series.id && task.occurrenceKey === generated.occurrenceKey))
    .toEqual([expect.objectContaining({ id: generated.id, deletedAt: expect.any(String) })]);
  expect((await request(app).get('/tasks')).body.some((task: { id: string }) => task.id === generated.id)).toBe(false);
});
it('editar todos os campos de uma ocorrência não muda template, vizinhas nem chave nominal', async () => {
  connection.db.insert(projects).values({ id: 'p2', name: 'Projeto', color: '#000', icon: 'P' }).run();
  const { series } = await create(); const generated = (await generate(series.id)).body.created[0];
  const before = snapshot();
  const response = await request(app).patch(`/tasks/${generated.id}`).send({ title: 'Só esta', description: 'Isolada', projectId: 'p2',
    priority: 'HIGH', startDate: '2026-10-31', dueDate: '2026-11-01', time: '15:00',
    reminderTimeZone: draft.timeZone, reminders: [{ offsetMinutes: 60 }] });
  expect(response.status, JSON.stringify(response.body)).toBe(200);
  expect(response.body).toMatchObject({ title: 'Só esta', description: 'Isolada', projectId: 'p2', priority: 'HIGH', dueDate: '2026-11-01',
    occurrenceKey: generated.occurrenceKey, recurrenceSeriesId: series.id });
  expect(response.body.reminders.map((item: { offsetMinutes: number }) => item.offsetMinutes)).toEqual([60]);
  expect(rows().filter(task => task.id !== generated.id)).toEqual(before.tasks.filter(task => task.id !== generated.id));
  expect(connection.db.select().from(recurrenceSeries).all()).toEqual(before.series);
  expect(connection.db.select().from(taskReminders).all().filter(item => item.taskId !== generated.id))
    .toEqual(before.reminders.filter(item => item.taskId !== generated.id));
  expect((await generate(series.id)).body.created).toEqual([]);
});
it.each([
  ['DAILY', 'WEEKLY', ['2026-12-03', '2026-12-10', '2026-12-17', '2026-12-24', '2026-12-31']],
  ['WEEKLY', 'MONTHLY', ['2026-12-29']],
  ['MONTHLY', 'DAILY', null],
])('regressão %s → %s só gera depois da cobertura, sem reescrever Tasks', async (from, to, keys) => {
  const { series, firstOccurrence } = await create({ ...draft, frequency: from }); await generate(series.id);
  const before = snapshot();
  const changed = await edit(series.id, firstOccurrence.id, { frequency: to });
  expect(changed.status).toBe(200); expect(changed.body.materializedThrough).toBe('2026-11-29');
  expect(rows()).toEqual(before.tasks); expect(connection.db.select().from(taskReminders).all()).toEqual(before.reminders);
  expect((await generate(series.id)).body.created).toEqual([]);
  vi.setSystemTime(new Date('2026-12-01T13:20:00Z'));
  const result = await generate(series.id); expect(result.status).toBe(200);
  const actual = result.body.created.map((task: { occurrenceKey: string }) => task.occurrenceKey);
  if (keys) {expect(actual).toEqual(keys);} else {expect(actual).toHaveLength(32); expect(actual[0]).toBe('2026-12-01'); expect(actual.at(-1)).toBe('2027-01-01');}
  expect(rows().filter(task => before.tasks.some(old => old.id === task.id))).toEqual(before.tasks);
  const confirmed = snapshot(); expect((await generate(series.id)).body.created).toEqual([]); expect(snapshot()).toEqual(confirmed);
});
it.each(['WEEKLY', 'MONTHLY'])('%s → NONE preserva todas as Tasks, filhos, reminders e History anteriores', async frequency => {
  const { series, firstOccurrence } = await create({ ...draft, frequency }); await generate(series.id); const before = snapshot();
  expect((await edit(series.id, firstOccurrence.id, { frequency: 'NONE' })).status).toBe(200);
  vi.setSystemTime(new Date('2027-01-01T13:20:00Z'));
  const result = await generate(series.id); expect(result.body.created).toEqual([]);
  expect(result.body.series.materializedThrough).toBe('2026-11-29');
  const after = snapshot(); expect(after.tasks).toEqual(before.tasks); expect(after.reminders).toEqual(before.reminders); expect(after.subtasks).toEqual(before.subtasks);
  expect(after.history.filter(event => before.history.some(old => old.id === event.id))).toEqual(before.history);
});
it('dois comandos globais seguidos e seus GETs mantêm IDs, filhos, History e séries exatamente iguais', async () => {
  await create(); await create({ ...draft, clientId: 'weekly', frequency: 'WEEKLY' });
  const first = await request(app).post('/recurrence-series/materialize').send({}); expect(first.status).toBe(200);
  const confirmed = snapshot(), firstRead = (await request(app).get('/tasks?includeDeleted=true')).body;
  const second = await request(app).post('/recurrence-series/materialize').send({});
  expect(second.status).toBe(200); expect(second.body.createdCount).toBe(0);
  expect((await request(app).get('/tasks?includeDeleted=true')).body).toEqual(firstRead); expect(snapshot()).toEqual(confirmed);
});
