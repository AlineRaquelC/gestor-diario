jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../specs/NativeTaskReminders', () => ({ __esModule: true, default: null }));
import { ReminderScheduler, REMINDER_JOURNAL_KEY, notificationId } from '../src/services/reminderScheduler';
import type { ReminderNative } from '../src/services/reminderScheduler';
import type { Task } from '../src/context/TaskContext';

let stored: Map<string, string>;
let records: Map<string, number>;
let now: number;
let usable: boolean;
let bridge: jest.Mocked<ReminderNative>;
let scheduler: ReminderScheduler;
let storage: { getItem: jest.Mock; setItem: jest.Mock };
const task: Task = { id: 'task', remoteId: 'task', remindersConfirmed: true, title: 'Privada', project: 'P', priority: 'high',
  status: 'todo', done: false, dueDate: '2026-10-27', dueDateKey: '2026-10-27', time: '10:00', reminderTimeZone: 'America/Sao_Paulo',
  reminders: [{ id: 'reminder', taskId: 'task', offsetMinutes: 15, createdAt: '2026-10-26T12:00:00Z', updatedAt: '2026-10-26T12:00:00Z', triggerAt: '2026-10-27T12:45:00Z' }] };
const id = notificationId(task.id, 'reminder');
beforeEach(() => {
  now = Date.parse('2026-10-26T12:00:00Z'); usable = true; stored = new Map(); records = new Map();
  const inspect = () => JSON.stringify({ usable, records: [...records].map(([key, triggerAt]) => ({ notificationId: key, triggerAt })) });
  storage = { getItem: jest.fn(async key => stored.get(key) ?? null), setItem: jest.fn(async (key, value) => { stored.set(key, value); }) };
  bridge = { schedule: jest.fn(async (key, at) => { records.set(key, at); return '{}'; }),
    cancel: jest.fn(async key => { records.delete(key); return inspect(); }), getScheduled: jest.fn(async () => inspect()) };
  scheduler = new ReminderScheduler(bridge, storage, () => now);
});
it('identidade determinística; intenção durável antes de schedule e confirmação por consulta', async () => {
  bridge.schedule.mockImplementationOnce(async (key, at) => {
    expect(JSON.parse(stored.get(REMINDER_JOURNAL_KEY)!).entries[key].state).toBe('pending');
    records.set(key, at); return '{}';
  });
  expect(await scheduler.reconcile([task])).toEqual({ state: 'scheduled' });
  expect(bridge.schedule).toHaveBeenCalledWith('task-reminder:task:reminder', Date.parse(task.reminders![0].triggerAt));
  expect(stored.get(REMINDER_JOURNAL_KEY)).not.toContain('Privada');
});
it('repetida e campos irrelevantes preservam agenda sem schedule/cancel', async () => {
  await scheduler.reconcile([task]);
  await scheduler.reconcile([{ ...task, title: 'Outro', description: 'Nova', project: 'Outro', priority: 'low' }]);
  expect(bridge.schedule).toHaveBeenCalledTimes(1); expect(bridge.cancel).not.toHaveBeenCalled();
});
it('reschedule cancela e confirma antes de substituir mesmo ID', async () => {
  await scheduler.reconcile([task]);
  const next = { ...task, time: '11:00', reminders: [{ ...task.reminders![0], triggerAt: '2026-10-27T13:45:00Z' }] };
  await scheduler.reconcile([next]);
  expect(bridge.cancel).toHaveBeenCalledWith(id); expect(bridge.schedule).toHaveBeenCalledTimes(2);
  expect(records.size).toBe(1); expect(records.get(id)).toBe(Date.parse(next.reminders[0].triggerAt));
});
it('cancelamento falho não agenda substituição; retry mantém intenção', async () => {
  await scheduler.reconcile([task]); bridge.cancel.mockRejectedValueOnce(new Error('native'));
  const next = { ...task, time: '11:00', reminders: [{ ...task.reminders![0], triggerAt: '2026-10-27T13:45:00Z' }] };
  expect((await scheduler.reconcile([next])).state).toBe('error');
  expect(bridge.schedule).toHaveBeenCalledTimes(1);
  expect((await scheduler.retry()).state).toBe('scheduled'); expect(bridge.schedule).toHaveBeenCalledTimes(2);
});
it('expirado é cancelado, nunca agendado retroativamente', async () => {
  await scheduler.reconcile([task]); now = Date.parse('2026-10-28T00:00:00Z');
  await scheduler.reconcile([task]); expect(records.size).toBe(0); expect(bridge.schedule).toHaveBeenCalledTimes(1);
});
it('sem permissão salva intenção unavailable e tenta localmente após concessão', async () => {
  usable = false; expect((await scheduler.reconcile([task])).state).toBe('unavailable');
  expect(bridge.schedule).not.toHaveBeenCalled(); usable = true;
  expect((await scheduler.retry()).state).toBe('scheduled');
});
it('falha nativa conserva journal e retry não precisa API', async () => {
  bridge.schedule.mockRejectedValueOnce(new Error('native'));
  expect((await scheduler.reconcile([task])).state).toBe('error');
  expect(JSON.parse(stored.get(REMINDER_JOURNAL_KEY)!).entries[id].state).toBe('error');
  expect((await scheduler.retry()).state).toBe('scheduled');
});
it('crash após native schedule antes da confirmação não duplica ao retomar', async () => {
  bridge.schedule.mockImplementationOnce(async (key, at) => { records.set(key, at); throw new Error('response lost'); });
  await scheduler.reconcile([task]);
  const restarted = new ReminderScheduler(bridge, storage, () => now);
  expect((await restarted.retry()).state).toBe('scheduled'); expect(bridge.schedule).toHaveBeenCalledTimes(1);
});
it('journal ilegível ou escrita falha bloqueia operações e preserva original', async () => {
  stored.set(REMINDER_JOURNAL_KEY, 'broken');
  expect((await scheduler.reconcile([task])).state).toBe('error'); expect(stored.get(REMINDER_JOURNAL_KEY)).toBe('broken');
  stored.clear(); storage.setItem.mockRejectedValue(new Error('disk'));
  expect((await scheduler.reconcile([task])).state).toBe('error'); expect(bridge.schedule).not.toHaveBeenCalled();
});
it('suspend é durável; offline retry não rearma e confirmação remota desfaz supressão', async () => {
  await scheduler.reconcile([task]); expect((await scheduler.suspend(task)).state).toBe('not_required');
  expect(records.size).toBe(0); await new ReminderScheduler(bridge, storage, () => now).retry();
  expect(records.size).toBe(0); await scheduler.reconcile([task]); expect(records.size).toBe(1);
});
it('snapshot parcial não cancela ausentes; completo e tombstone cancelam', async () => {
  await scheduler.reconcile([task]); await scheduler.reconcile([]); expect(records.size).toBe(1);
  await scheduler.reconcile([], true); expect(records.size).toBe(0);
  await scheduler.reconcile([task]); await scheduler.reconcile([{ ...task, deletedAt: 'now' }]); expect(records.size).toBe(0);
});
it('órfão nativo só é cancelado com escopo confirmado', async () => {
  records.set(id, now + 10000); await scheduler.reconcile([]); expect(records.size).toBe(1);
  await scheduler.reconcile([], true); expect(records.size).toBe(0);
});
it('cache legado e draft sem identidade confirmada nunca alimentam scheduler', async () => {
  await scheduler.reconcile([{ ...task, remoteId: undefined }, { ...task, remindersConfirmed: false }]);
  expect(bridge.schedule).not.toHaveBeenCalled();
});
it('revalida relógio imediatamente antes do native schedule', async () => {
  bridge.getScheduled.mockImplementationOnce(async () => {
    now = Date.parse(task.reminders![0].triggerAt); return JSON.stringify({ usable: true, records: [] });
  });
  await scheduler.reconcile([task]); expect(bridge.schedule).not.toHaveBeenCalled();
});
it('sem adaptador retorna unavailable sem impedir persistência canônica', async () => {
  expect((await new ReminderScheduler(null, storage, () => now).reconcile([task])).state).toBe('unavailable');
});
it('não anuncia scheduled se consulta não confirmou trigger', async () => {
  bridge.schedule.mockResolvedValueOnce('{}');
  expect((await scheduler.reconcile([task])).state).toBe('error');
});
it('remoção com outros reminders ativos retorna not_required para a Task removida', async () => {
  const other = { ...task, id: 'other', remoteId: 'other', reminders: [{ ...task.reminders![0], taskId: 'other', id: 'r2' }] };
  await scheduler.reconcile([task, other]);
  expect(await scheduler.reconcile([{ ...task, reminders: [] }])).toEqual({ state: 'not_required' });
  expect(records.size).toBe(1); expect(records.has(notificationId('other', 'r2'))).toBe(true);
});
it('revogação da permissão não apresenta falso estado scheduled', async () => {
  await scheduler.reconcile([task]); usable = false;
  expect((await scheduler.reconcile([task])).state).toBe('unavailable');
});
it('recheck acontece depois da gravação durável imediatamente anterior à chamada nativa', async () => {
  const save = storage.setItem.getMockImplementation()!;
  let writes = 0;
  storage.setItem.mockImplementation(async (...args) => {
    await save(...args); if (++writes === 3) {now = Date.parse(task.reminders![0].triggerAt);}
  });
  await scheduler.reconcile([task]); expect(bridge.schedule).not.toHaveBeenCalled();
});
it('fila serializa reconciliações concorrentes sem duplicar trigger', async () => {
  await Promise.all([scheduler.reconcile([task]), scheduler.reconcile([task]), scheduler.reconcile([task])]);
  expect(bridge.schedule).toHaveBeenCalledTimes(1); expect(records.size).toBe(1);
});
it('retorno nativo inválido não produz confirmação nem apaga journal', async () => {
  bridge.getScheduled.mockResolvedValueOnce('{"usable":true,"records":"bad"}');
  expect((await scheduler.reconcile([task])).state).toBe('error'); expect(bridge.schedule).not.toHaveBeenCalled();
  expect(stored.has(REMINDER_JOURNAL_KEY)).toBe(true);
});
