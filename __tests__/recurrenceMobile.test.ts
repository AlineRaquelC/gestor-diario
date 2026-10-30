import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, ApiError } from '../src/services/api';
import {
  fromApiTask,
  createTask,
  toApiTaskUpdate,
  validateNewRecurrence,
} from '../src/services/taskService';
import type { ApiTask, NewTask } from '../src/services/taskService';
import {
  normalizeRecurrenceCache,
  preserveRecurrence,
  recurrenceFields,
} from '../src/models/recurrence';
import {
  RECURRENCE_REQUESTS_KEY,
  durableRecurrenceRequest,
  materializeRecurrences,
  updateRecurrenceSeries,
} from '../src/services/recurrenceService';
import { preserveTask } from '../src/services/syncService';
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('../src/services/api', () => ({
  ...jest.requireActual('../src/services/api'),
  apiRequest: jest.fn(),
}));
const storage = new Map<string, string>();
const summary = {
  frequency: 'DAILY' as const,
  timeZone: 'America/Sao_Paulo',
  anchorDate: '2026-10-30',
  materializedThrough: '2026-11-29',
  updatedAt: '2026-10-29T13:00:00Z',
};
const template = {
  title: 'Série',
  description: null,
  projectId: 'p',
  priority: 'MEDIUM' as const,
  time: '15:00',
  startOffsetDays: 1,
  subtasks: [{ title: 'Filho' }],
  reminders: [],
};
const series = {
  ...summary,
  id: 'series',
  clientId: 'intent',
  firstOccurrenceKey: summary.anchorDate,
  template,
  createdAt: summary.updatedAt,
};
const remote: ApiTask = {
  id: 't',
  title: template.title,
  description: null,
  projectId: 'p',
  priority: 'MEDIUM',
  status: 'PENDING',
  done: false,
  progress: 0,
  favorite: false,
  time: '15:00',
  startDate: '2026-10-29',
  dueDate: '2026-10-30',
  createdAt: summary.updatedAt,
  updatedAt: summary.updatedAt,
  deletedAt: null,
  undoUntil: null,
  reminders: [],
  recurrenceSeriesId: series.id,
  occurrenceKey: summary.anchorDate,
  recurrence: summary,
};
const draft: NewTask = {
  title: template.title,
  projectId: 'p',
  project: 'P',
  priority: 'medium',
  status: 'todo',
  done: false,
  time: '15:00',
  startDate: '2026-10-29',
  dueDate: '2026-10-30',
  recurrenceInput: { frequency: 'DAILY', timeZone: summary.timeZone },
  recurrenceRequestId: 'intent',
  reminders: [],
  subtasks: [{ id: 'local', title: 'Filho', done: false }],
};
beforeEach(() => {
  jest.resetAllMocks();
  storage.clear();
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-29T13:00:00Z'));
  jest
    .mocked(AsyncStorage.getItem)
    .mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
    storage.set(key, value);
  });
});
afterEach(() => jest.restoreAllMocks());
it('mapeia ocorrência sem copiar template e preserva cache e identidade', () => {
  const task = fromApiTask(remote);
  expect(task).toMatchObject({
    recurrenceSeriesId: 'series',
    occurrenceKey: summary.anchorDate,
    recurrence: summary,
  });
  expect(task.recurrence).not.toHaveProperty('template');
  expect(normalizeRecurrenceCache(JSON.parse(JSON.stringify(task)))).toEqual(
    task,
  );
  expect(preserveRecurrence({ ...task }, task)).toEqual(task);
});
it('legado e Task comum não viram série', () => {
  const legacy = { id: 'old' };
  expect(normalizeRecurrenceCache(legacy)).toEqual(legacy);
  expect(recurrenceFields({})).toEqual({
    recurrenceSeriesId: null,
    occurrenceKey: null,
    recurrence: null,
  });
});
it.each([
  { recurrenceSeriesId: 's' },
  { occurrenceKey: '2026-10-30' },
  { recurrenceSeriesId: 's', occurrenceKey: 'invalid', recurrence: summary },
])('rejeita cache de ocorrência incompleto: %j', value => {
  expect(() => recurrenceFields(value)).toThrow();
});
it('não troca identidade imutável e não rebaixa revisão confirmada', () => {
  const task = fromApiTask(remote);
  expect(() =>
    preserveRecurrence({ ...task, occurrenceKey: '2026-10-31' }, task),
  ).toThrow(/identidade/);
  const older = {
    ...task,
    recurrence: {
      ...summary,
      frequency: 'WEEKLY' as const,
      updatedAt: '2026-10-28T13:00:00Z',
    },
  };
  expect(preserveRecurrence(older, task).recurrence).toEqual(summary);
});
it('cobertura e timestamps não criam conflito artificial de domínio', () => {
  const local = fromApiTask(remote);
  const next = fromApiTask({
    ...remote,
    recurrence: {
      ...summary,
      materializedThrough: '2026-11-30',
      updatedAt: '2026-10-30T13:00:00Z',
    },
  });
  expect(preserveTask(next, local).syncSnapshots).toBeUndefined();
  expect(preserveTask(next, local).recurrence).toEqual(next.recurrence);
});
it.each(['DAILY', 'WEEKLY', 'MONTHLY'] as const)(
  'cria %s atomicamente e grava intenção antes do POST',
  async frequency => {
    jest.mocked(apiRequest).mockImplementation(async () => {
      expect(storage.get(RECURRENCE_REQUESTS_KEY)).toContain('intent');
      return {
        series: { ...series, frequency },
        firstOccurrence: { ...remote, recurrence: { ...summary, frequency } },
      } as never;
    });
    expect(
      (
        await createTask(
          {
            ...draft,
            recurrenceInput: { ...draft.recurrenceInput!, frequency },
          },
          'p',
        )
      ).id,
    ).toBe('t');
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(
      '/recurrence-series',
      'POST',
      expect.objectContaining({
        clientId: 'intent',
        frequency,
        timeZone: summary.timeZone,
        template,
      }),
    );
  },
);
it('NONE segue POST normal sem criar intenção/série', async () => {
  jest
    .mocked(apiRequest)
    .mockResolvedValue({
      ...remote,
      recurrenceSeriesId: null,
      occurrenceKey: null,
      recurrence: null,
    });
  await createTask(
    { ...draft, recurrenceInput: { frequency: 'NONE', timeZone: '' } },
    'p',
  );
  expect(apiRequest).toHaveBeenCalledWith(
    '/tasks',
    'POST',
    expect.not.objectContaining({ recurrence: expect.anything() }),
  );
  expect(storage.size).toBe(0);
});
it('resposta perdida preserva clientId em retry e na reabertura do formulário', async () => {
  jest
    .mocked(apiRequest)
    .mockRejectedValueOnce(new ApiError('resposta perdida'))
    .mockResolvedValue({ series, firstOccurrence: remote });
  await expect(createTask(draft, 'p')).rejects.toThrow('resposta perdida');
  await createTask({ ...draft, recurrenceRequestId: 'new-screen' }, 'p');
  expect(
    jest
      .mocked(apiRequest)
      .mock.calls.map(call => (call[2] as { clientId: string }).clientId),
  ).toEqual(['intent', 'intent']);
});
it('não envia requisição sem persistir intenção e não altera payload incerto', async () => {
  jest
    .mocked(AsyncStorage.setItem)
    .mockRejectedValueOnce(new Error('cache indisponível'));
  await expect(createTask(draft, 'p')).rejects.toThrow('cache indisponível');
  expect(apiRequest).not.toHaveBeenCalled();
  jest.mocked(apiRequest).mockRejectedValue(new ApiError('offline'));
  await expect(createTask(draft, 'p')).rejects.toThrow('offline');
  await expect(
    createTask({ ...draft, title: 'Outro título' }, 'p'),
  ).rejects.toThrow(/mesmos dados/);
  expect(apiRequest).toHaveBeenCalledTimes(1);
});
it('erro explícito de validação permite corrigir a tentativa sem duplicar série', async () => {
  const send = jest
    .fn()
    .mockRejectedValueOnce(new ApiError('inválido', 400))
    .mockResolvedValue('ok');
  await expect(
    durableRecurrenceRequest('id', { title: 'a' }, send),
  ).rejects.toThrow();
  await expect(
    durableRecurrenceRequest('id', { title: 'b' }, send),
  ).resolves.toBe('ok');
});
it('confirmação da API não vira falha se gravação posterior do journal falhar', async () => {
  let writes = 0;
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
    if (++writes > 1) {
      throw new Error('cache');
    }
    storage.set(key, value);
  });
  await expect(
    durableRecurrenceRequest('id', {}, async () => 'salvo'),
  ).resolves.toBe('salvo');
});
it.each([
  { recurrenceInput: { frequency: 'DAILY', timeZone: 'Inválido' } },
  { startDate: '2026-10-31' },
  { time: '25:00' },
  { dueDate: '2026-10-29', time: '09:00' },
])('valida calendário e zona antes do POST: %j', changes => {
  expect(() =>
    validateNewRecurrence({ ...draft, ...changes } as NewTask, 'p'),
  ).toThrow();
});
it('lembretes e recorrência usam configuração canônica com o mesmo fuso', async () => {
  const reminders = [{ offsetMinutes: 60 }];
  jest
    .mocked(apiRequest)
    .mockResolvedValue({ series, firstOccurrence: remote });
  await createTask(
    { ...draft, reminders, reminderTimeZone: summary.timeZone },
    'p',
  );
  expect(apiRequest).toHaveBeenCalledWith(
    '/recurrence-series',
    'POST',
    expect.objectContaining({ template: { ...template, reminders } }),
  );
  expect(() =>
    validateNewRecurrence(
      { ...draft, reminders, reminderTimeZone: 'UTC' },
      'p',
    ),
  ).toThrow(/mesmo fuso/);
});
it('PATCH da ocorrência omite frequência, vínculo e template', () => {
  expect(toApiTaskUpdate({ title: 'Só esta' })).toEqual({ title: 'Só esta' });
});
it('edição da regra envia revisão e conflito não repete PATCH', async () => {
  jest
    .mocked(apiRequest)
    .mockRejectedValue(
      new ApiError(
        'A regra foi alterada. Recarregue.',
        409,
        'RECURRENCE_CONFLICT',
      ),
    );
  await expect(
    updateRecurrenceSeries('series', {
      taskId: 't',
      expectedUpdatedAt: summary.updatedAt,
      frequency: 'NONE',
    }),
  ).rejects.toThrow(/Recarregue/);
  expect(apiRequest).toHaveBeenCalledTimes(1);
});
it('materialização concorrente compartilha a operação e falha permite nova tentativa', async () => {
  let reject!: (error: Error) => void;
  jest.mocked(apiRequest).mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  const a = materializeRecurrences(),
    b = materializeRecurrences();
  expect(a).toBe(b);
  expect(apiRequest).toHaveBeenCalledTimes(1);
  reject(new Error('offline'));
  await expect(a).rejects.toThrow('offline');
  jest.mocked(apiRequest).mockResolvedValue({ createdCount: 0 });
  await materializeRecurrences();
  expect(apiRequest).toHaveBeenCalledTimes(2);
});

it('retry com resposta perdida continua consultando a mesma criação após vencer o horário', async () => {
  jest.mocked(apiRequest).mockRejectedValueOnce(new ApiError('resposta perdida')).mockResolvedValue({ series, firstOccurrence: remote });
  await expect(createTask(draft, 'p')).rejects.toThrow();
  jest.mocked(Date.now).mockReturnValue(Date.parse('2026-11-02T13:00:00Z'));
  await expect(createTask(draft, 'p')).resolves.toMatchObject({ id: 't', recurrenceSeriesId: 'series' });
  expect(jest.mocked(apiRequest).mock.calls.map(call => (call[2] as { clientId: string }).clientId)).toEqual(['intent', 'intent']);
});
it('novo reminder manual vencido na primeira ocorrência é rejeitado e pode ser corrigido', async () => {
  const input = { ...draft, startDate: '2026-10-29', dueDate: '2026-10-29', time: '10:30', reminders: [{ offsetMinutes: 60 }], reminderTimeZone: summary.timeZone };
  await expect(createTask(input, 'p')).rejects.toThrow(/Reduza a antecedência/);
  expect(apiRequest).not.toHaveBeenCalled();
  jest.mocked(apiRequest).mockResolvedValue({ series, firstOccurrence: remote });
  await expect(createTask({ ...input, time: '15:00' }, 'p')).resolves.toMatchObject({ id: 't' });
});
it('snapshot materializado com offset expirado mantém configuração e IDs canônicos', () => {
  const reminder = { id: 'reminder-own', taskId: 't', offsetMinutes: 1440, createdAt: summary.updatedAt, updatedAt: summary.updatedAt, triggerAt: '2026-10-29T09:00:00Z' };
  expect(fromApiTask({ ...remote, reminders: [reminder], reminderTimeZone: summary.timeZone }).reminders).toEqual([reminder]);
});
