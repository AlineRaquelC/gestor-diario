import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import request from 'supertest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database/index.js';
import { migrationsFolder } from '../src/database/config.js';
import { projects, tasks, subtasks, taskHistory, taskReminders } from '../src/database/schema/index.js';
import { TasksRepository } from '../src/repositories/tasks.js';

let connection: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
const offsets = (...values: number[]) => values.map(offsetMinutes => ({ offsetMinutes }));
const draft = { title: 'Lembretes', projectId: 'p', startDate: '2026-10-26', dueDate: '2026-10-27',
  time: '10:00', priority: 'MEDIUM', reminderTimeZone: 'America/Sao_Paulo', reminders: offsets(60, 15, 0) };
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  connection = openDatabase(':memory:'); migrate(connection.db, { migrationsFolder });
  connection.db.insert(projects).values({ id: 'p', name: 'Projeto', color: '#fff', icon: 'P' }).run();
  app = createApp(connection.db);
});
afterEach(() => { connection.sqlite.close(); vi.restoreAllMocks(); vi.useRealTimers(); });
const create = async (body: object = draft) => {
  const response = await request(app).post('/tasks').send(body);
  expect(response.status).toBe(201); return response.body;
};
const patch = (id: string, body: object) => request(app).patch(`/tasks/${id}`).send(body);

it('B01 agrega múltiplos reminders ordenados em POST e GET; legado recebe []', async () => {
  const task = await create();
  expect(task.reminders.map((item: { offsetMinutes: number }) => item.offsetMinutes)).toEqual([0, 15, 60]);
  for (const item of task.reminders) expect(item).toMatchObject({ id: expect.any(String), taskId: task.id,
    createdAt: task.createdAt, updatedAt: task.createdAt, triggerAt: expect.any(String) });
  expect((await request(app).get(`/tasks/${task.id}`)).body).toEqual(task);
  expect((await request(app).get('/tasks')).body).toEqual([task]);
  const { reminders: _r, reminderTimeZone: _z, ...legacy } = draft;
  expect(_r).toHaveLength(3); expect(_z).toBe(draft.reminderTimeZone);
  const empty = await create(legacy);
  expect(empty).toMatchObject({ reminders: [], reminderTimeZone: null });
});
it('B02 omitido preserva; diff conserva IDs/timestamps; repetido é idempotente; [] limpa fuso', async () => {
  const task = await create();
  expect((await patch(task.id, { title: 'Outra' })).body.reminders).toEqual(task.reminders);
  const changed = (await patch(task.id, { reminders: offsets(15, 1440) })).body;
  expect(changed.reminders[0]).toEqual(task.reminders[1]);
  expect(changed.reminders[1].id).not.toBe(task.reminders[2].id);
  const history = connection.db.select().from(taskHistory).all();
  expect((await patch(task.id, { reminders: offsets(1440, 15), dueDate: draft.dueDate, time: draft.time })).body).toEqual(changed);
  expect(connection.db.select().from(taskHistory).all()).toEqual(history);
  expect((await patch(task.id, { reminders: [] })).body).toMatchObject({ reminders: [], reminderTimeZone: null });
  expect(connection.db.select().from(taskReminders).all()).toEqual([]);
});
it.each([null, '15 min antes', [{}], [{ offsetMinutes: -1 }], [{ offsetMinutes: 1.5 }],
  offsets(15, 15), offsets(0, 1, 2, 3, 4, 5), [{ offsetMinutes: 15, id: 'foreign' }],
  [{ offsetMinutes: 15, taskId: 'foreign' }], offsets(Number.MAX_SAFE_INTEGER)])('B04 rejeita coleção inválida %j', async reminders => {
  expect((await request(app).post('/tasks').send({ ...draft, reminders })).status).toBe(400);
  expect(connection.db.select().from(tasks).all()).toEqual([]);
});
it.each([
  { reminderTimeZone: 'Invalid/Zone' }, { reminderTimeZone: '+03:00' }, { reminderTimeZone: null },
  { time: undefined }, { time: '25:00' },
  { dueDate: '2026-10-26', time: '08:45', reminders: offsets(0) },
  { dueDate: '2026-10-26', time: '09:10', reminders: offsets(15) },
  { dueDate: '2026-10-26', time: '09:00', reminders: offsets(0) },
  { dueDate: '2026-10-27', time: '09:00', reminders: offsets(1440) },
  { dueDate: '2027-03-14', time: '02:30', reminderTimeZone: 'America/New_York' },
  { dueDate: '2026-11-01', time: '01:30', reminderTimeZone: 'America/New_York' },
  { dueDate: '2026-10-04', time: '02:15', reminderTimeZone: 'Australia/Lord_Howe' },
])('B04 usa regras de T01 para estrutura/passado/DST %j', async changes => {
  expect((await request(app).post('/tasks').send({ ...draft, ...changes })).status).toBe(400);
});
it.each([
  ['America/Sao_Paulo', '2026-10-26T12:01:00.000Z'],
  ['Asia/Kathmandu', '2026-10-26T03:16:00.000Z'],
])('B04 offset zero e IANA %s derivam UTC sem fuso Node', async (reminderTimeZone, triggerAt) => {
  vi.setSystemTime(new Date('2026-10-26T00:00:00Z'));
  const task = await create({ ...draft, dueDate: '2026-10-26', time: '09:01', reminderTimeZone, reminders: offsets(0) });
  expect(task.reminders[0].triggerAt).toBe(triggerAt);
});
it('B04 24h absolutas em DST e antecedência de um dia futura', async () => {
  const task = await create({ ...draft, dueDate: '2026-11-01', time: '10:00', reminderTimeZone: 'America/New_York', reminders: offsets(1440) });
  expect(task.reminders[0].triggerAt).toBe('2026-10-31T15:00:00.000Z');
});
it('B04 histórico expirado permite GET, PATCH inalterado/remoção/conclusão; nova âncora ou offset exigem futuro', async () => {
  const task = await create(); vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
  expect((await request(app).get(`/tasks/${task.id}`)).status).toBe(200);
  expect((await patch(task.id, { ...draft, reminders: draft.reminders, status: 'COMPLETED' })).status).toBe(200);
  expect((await patch(task.id, { reminders: offsets(0, 30) })).status).toBe(400);
  expect((await patch(task.id, { time: '11:00' })).status).toBe(400);
  expect((await patch(task.id, { time: null })).status).toBe(400);
  expect((await patch(task.id, { reminders: offsets(15) })).status).toBe(200);
});
it('B03 protege FK/unique/check/limite e hard delete no SQLite', async () => {
  const task = await create();
  const insert = connection.sqlite.prepare('INSERT INTO task_reminders(id, task_id, offset_minutes) VALUES (?, ?, ?)');
  expect(() => insert.run('orphan', 'missing', 1)).toThrow(/FOREIGN KEY/);
  expect(() => insert.run('duplicate', task.id, 15)).toThrow(/UNIQUE/);
  for (const value of [-1, 0.5, 150119987580]) expect(() => insert.run('invalid', task.id, value)).toThrow(/CHECK/);
  insert.run('four', task.id, 1); insert.run('five', task.id, 2);
  expect(() => insert.run('six', task.id, 3)).toThrow(/five/);
  expect(() => connection.sqlite.prepare('DELETE FROM tasks WHERE id = ?').run(task.id)).toThrow(/FOREIGN KEY/);
  const other = await create({ ...draft, reminders: offsets(3) });
  expect(() => connection.sqlite.prepare('UPDATE task_reminders SET task_id = ? WHERE task_id = ?').run(task.id, other.id)).toThrow(/five/);
  expect(connection.sqlite.pragma('foreign_key_check')).toEqual([]);
});
it('B03 API rejeita IDs de outra Task e Task inexistente; diff não afeta outro pai', async () => {
  const first = await create(), other = await create();
  expect((await patch(first.id, { reminders: [{ ...other.reminders[0] }] })).status).toBe(400);
  expect((await patch('missing', { reminders: [] })).status).toBe(404);
  await patch(first.id, { reminders: [] });
  expect((await request(app).get(`/tasks/${other.id}`)).body.reminders).toEqual(other.reminders);
});
it.each(['reminder', 'history'])('B05 falha %s desfaz Task, filhos, reminders e History do POST', async failure => {
  connection.sqlite.exec(failure === 'reminder'
    ? "CREATE TRIGGER fail_reminder BEFORE INSERT ON task_reminders WHEN NEW.offset_minutes = 15 BEGIN SELECT RAISE(ABORT, 'test'); END"
    : "CREATE TRIGGER fail_history BEFORE INSERT ON task_history BEGIN SELECT RAISE(ABORT, 'test'); END");
  expect((await request(app).post('/tasks').send({ ...draft, subtasks: [{ title: 'Filho' }] })).status).toBe(500);
  for (const table of [tasks, subtasks, taskReminders, taskHistory]) expect(connection.db.select().from(table).all()).toEqual([]);
});
it('B05 falha do History no PATCH restaura diff, fuso e Task', async () => {
  const task = await create(); const history = connection.db.select().from(taskHistory).all();
  vi.spyOn(TasksRepository.prototype, 'recordUpdate').mockImplementation(() => { throw new Error('history'); });
  expect((await patch(task.id, { title: 'Editada', reminders: offsets(30), reminderTimeZone: 'Asia/Kathmandu' })).status).toBe(500);
  expect((await request(app).get(`/tasks/${task.id}`)).body).toEqual(task);
  expect(connection.db.select().from(taskHistory).all()).toEqual(history);
});
it('B06 soft delete conserva linhas; restore recupera IDs expirados sem reagendar', async () => {
  const task = await create(); await request(app).delete(`/tasks/${task.id}`);
  expect(connection.db.select().from(taskReminders).all()).toHaveLength(3);
  vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
  const restored = await request(app).post(`/tasks/${task.id}/restore`);
  expect(restored.status).toBe(200); expect(restored.body.reminders).toEqual(task.reminders);
});
it('B07 clientId retry após vencimento e soft delete mantém Task, reminders e History', async () => {
  const task = await create({ ...draft, clientId: 'retry' });
  vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
  expect((await create({ ...draft, clientId: 'retry' })).reminders).toEqual(task.reminders);
  expect(connection.db.select().from(taskHistory).all()).toHaveLength(1);
  await request(app).delete(`/tasks/${task.id}`);
  expect((await create({ ...draft, clientId: 'retry' })).reminders).toEqual(task.reminders);
  expect(connection.db.select().from(tasks).all()).toHaveLength(1);
  expect(connection.db.select().from(taskReminders).all()).toHaveLength(3);
  expect(connection.db.select().from(taskHistory).all()).toHaveLength(2);
});
it('B01 cinco offsets válidos; primeira configuração exige fuso explícito e permite recaptura após []', async () => {
  const task = await create({ ...draft, dueDate: '2026-10-28', reminders: [] });
  expect((await patch(task.id, { reminders: offsets(0) })).status).toBe(400);
  const configured = await patch(task.id, { reminders: offsets(0, 15, 30, 60, 1440), reminderTimeZone: 'Asia/Kathmandu' });
  expect(configured.status).toBe(200); expect(configured.body.reminders).toHaveLength(5);
  expect((await patch(task.id, { reminderTimeZone: 'Invalid/Zone' })).status).toBe(400);
  await patch(task.id, { reminders: [] });
  const recaptured = await patch(task.id, { reminders: offsets(0), reminderTimeZone: 'America/Sao_Paulo' });
  expect(recaptured.status).toBe(200); expect(recaptured.body.reminderTimeZone).toBe('America/Sao_Paulo');
  expect(recaptured.body.reminders[0].id).not.toBe(configured.body.reminders[0].id);
});
it('B05 falha de insert no PATCH reverte remoções já aplicadas e mantém History', async () => {
  const task = await create(); const history = connection.db.select().from(taskHistory).all();
  connection.sqlite.exec("CREATE TRIGGER fail_patch BEFORE INSERT ON task_reminders BEGIN SELECT RAISE(ABORT, 'test'); END");
  expect((await patch(task.id, { reminders: offsets(30) })).status).toBe(500);
  expect((await request(app).get(`/tasks/${task.id}`)).body).toEqual(task);
  expect(connection.db.select().from(taskHistory).all()).toEqual(history);
});
