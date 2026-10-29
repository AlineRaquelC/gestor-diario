import React from 'react';
import { Alert, Modal, Text, TextInput } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import NewTaskScreen from '../src/screens/NewTaskScreen';
import { useTasks } from '../src/context/TaskContext';
import { useProjects } from '../src/context/ProjectContext';

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('@react-native-community/datetimepicker', () => () => null);
jest.mock('../src/context/TaskContext', () => ({ useTasks: jest.fn() }));
jest.mock('../src/context/ProjectContext', () => ({ useProjects: jest.fn() }));
const projects = [
  {
    id: 'a',
    remoteId: 'remote-a',
    name: 'Mesmo nome',
    icon: '💻',
    color: '#5C4DFF',
  },
  {
    id: 'b',
    remoteId: 'remote-b',
    name: 'Mesmo nome',
    icon: '📦',
    color: '#5C4DFF',
  },
];
const create = jest.fn();
let renderer: TestRenderer.ReactTestRenderer;
let alert: jest.SpyInstance;
const controls = (label: string) =>
  renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      (node.props.accessibilityLabel === label ||
        node.findAllByType(Text).some(text => text.props.children === label)),
  );
const press = async (label: string) => {
  expect(controls(label).length).toBeGreaterThan(0);
  await act(async () => controls(label)[0].props.onPress());
};
const type = async (label: string, value: string) => {
  const input = renderer.root
    .findAllByType(TextInput)
    .find(node => node.props.accessibilityLabel === label)!;
  await act(async () => input.props.onChangeText(value));
};
beforeEach(async () => {
  create
    .mockReset()
    .mockResolvedValue({
      cacheSaved: true,
      scheduling: { state: 'not_required' },
    });
  jest
    .mocked(useTasks)
    .mockReturnValue({ addTask: create } as unknown as ReturnType<
      typeof useTasks
    >);
  jest
    .mocked(useProjects)
    .mockReturnValue({ projects } as ReturnType<typeof useProjects>);
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await act(async () => {
    renderer = TestRenderer.create(<NewTaskScreen />);
  });
});
afterEach(async () => {
  await act(async () => renderer.unmount());
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test('mostra somente projeto selecionado; lista distingue homônimos e criação envia o ID escolhido', async () => {
  expect(controls('Projeto: Mesmo nome')).toHaveLength(0);
  expect(controls('Selecionar projeto: Mesmo nome')).toHaveLength(1);
  await press('Selecionar projeto: Mesmo nome');
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  const choices = controls('Projeto: Mesmo nome');
  expect(choices).toHaveLength(2);
  expect(choices[0].props.accessibilityState.selected).toBe(true);
  await act(async () => choices[1].props.onPress());
  expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  expect(controls('Projeto: Mesmo nome')).toHaveLength(0);
  expect(
    renderer.root.findAllByType(Text).map(node => node.props.children),
  ).toContain('📦');
  await type('Título', 'Tarefa pelo seletor');
  await press('Criar tarefa');
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Tarefa pelo seletor',
      projectId: 'b',
      project: 'Mesmo nome',
    }),
  );
  expect(mockNavigation.navigate).not.toHaveBeenCalled();
  await act(async () => alert.mock.calls[0][2][0].onPress());
  expect(mockNavigation.navigate).toHaveBeenCalledWith('Home');
});
test('voltar do seletor não altera projeto padrão ou habilitação de criação', async () => {
  expect(controls('Criar tarefa')[0].props.disabled).toBe(true);
  await press('Selecionar projeto: Mesmo nome');
  await act(async () => renderer.root.findByType(Modal).props.onRequestClose());
  await type('Título', 'Padrão');
  await press('Criar tarefa');
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({ projectId: 'a' }),
  );
});
test('sem projetos mantém cadastro obrigatório e o caminho existente de criar projeto', async () => {
  await act(async () => renderer.unmount());
  jest
    .mocked(useProjects)
    .mockReturnValue({ projects: [] } as unknown as ReturnType<
      typeof useProjects
    >);
  await act(async () => {
    renderer = TestRenderer.create(<NewTaskScreen />);
  });
  await type('Título', 'Sem vínculo');
  expect(controls('Criar tarefa')[0].props.disabled).toBe(true);
  expect(controls('Selecionar projeto: Selecionar projeto')).toHaveLength(0);
  await press('+ Criar projeto');
  expect(mockNavigation.navigate).toHaveBeenCalledWith('CriarProjeto');
  expect(create).not.toHaveBeenCalled();
});
test('prioridade, status, subtarefa e lembrete preservam valores do draft', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(new Date(2020, 0, 1).getTime());
  await type('Título', 'Com detalhes');
  await press('Alta');
  await press('Em andamento');
  expect(controls('Alta')[0].props.accessibilityState.selected).toBe(true);
  expect(controls('Em andamento')[0].props.accessibilityState.selected).toBe(
    true,
  );
  await press('Adicionar subtarefa');
  await type('Nome da subtarefa', 'Filha');
  const input = renderer.root
    .findAllByType(TextInput)
    .find(node => node.props.accessibilityLabel === 'Nome da subtarefa')!;
  await act(async () => input.props.onSubmitEditing());
  await press('Adicionar lembrete');
  await press('15 min antes');
  await press('Criar tarefa');
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      priority: 'high',
      status: 'in_progress',
      subtasks: [expect.objectContaining({ title: 'Filha', done: false })],
      reminders: [{ offsetMinutes: 15 }],
    }),
  );
});
test('aguarda criação remota, bloqueia duplo envio e mantém erro sem navegação falsa', async () => {
  let reject!: (error: Error) => void;
  create.mockImplementation(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  await type('Título', 'Aguardar');
  let pending!: Promise<void>;
  await act(async () => {
    pending = controls('Criar tarefa')[0].props.onPress();
  });
  expect(controls('Salvando...')[0].props.disabled).toBe(true);
  await act(async () => controls('Salvando...')[0].props.onPress());
  expect(create).toHaveBeenCalledTimes(1);
  expect(alert).not.toHaveBeenCalled();
  await act(async () => {
    reject(new Error('offline'));
    await pending;
  });
  expect(alert).toHaveBeenCalledWith(
    'Não foi possível criar a tarefa',
    'offline',
  );
  expect(mockNavigation.navigate).not.toHaveBeenCalled();
  expect(controls('Criar tarefa')[0].props.disabled).toBe(false);
});

jest.mock('../src/services/reminderPermission', () => ({
  requestReminderPermission: jest.fn().mockResolvedValue(true),
}));
jest.mock('../src/models/reminder', () => ({
  ...jest.requireActual('../src/models/reminder'),
  deviceReminderTimeZone: jest.fn(() => 'America/Sao_Paulo'),
}));
import { requestReminderPermission } from '../src/services/reminderPermission';
import { deviceReminderTimeZone } from '../src/models/reminder';

async function choose(label: string) {
  await press('Adicionar lembrete');
  await press(label);
}
function futureClock() {
  jest.spyOn(Date, 'now').mockReturnValue(new Date(2020, 0, 1).getTime());
}
test('sem lembrete não captura fuso nem solicita permissão', async () => {
  await type('Título', 'Normal');
  await type('Horário', '');
  await press('Criar tarefa');
  expect(create.mock.calls[0][0]).not.toHaveProperty('reminderTimeZone');
  expect(create.mock.calls[0][0].reminders).toEqual([]);
  expect(requestReminderPermission).not.toHaveBeenCalled();
  expect(deviceReminderTimeZone).not.toHaveBeenCalled();
});
test.each([
  ['No horário', 0],
  ['15 min antes', 15],
  ['1 hora antes', 60],
  ['1 dia antes', 1440],
])('preset %s envia minutos canônicos e fuso', async (label, offsetMinutes) => {
  futureClock();
  await type('Título', 'Preset');
  await choose(label as string);
  await press('Criar tarefa');
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      reminders: [{ offsetMinutes }],
      reminderTimeZone: 'America/Sao_Paulo',
    }),
  );
  expect(requestReminderPermission).toHaveBeenCalledTimes(1);
});
test.each([
  ['Minutos', '7', 7],
  ['Horas', '2', 120],
  ['Dias', '3', 4320],
])('personalizado em %s', async (unit, amount, offsetMinutes) => {
  futureClock();
  await type('Título', 'Custom');
  await press('Adicionar lembrete');
  await press('Personalizado');
  await type('Quantidade do lembrete', amount);
  await press(unit);
  await press('Adicionar personalizado');
  await press('Criar tarefa');
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({ reminders: [{ offsetMinutes }] }),
  );
});
test.each(['0', '-1', '1.5', 'abc', '999999999999999999999999'])(
  'rejeita quantidade personalizada %s',
  async amount => {
    await press('Adicionar lembrete');
    await press('Personalizado');
    await type('Quantidade do lembrete', amount);
    await press('Adicionar personalizado');
    expect(alert).toHaveBeenCalled();
    expect(requestReminderPermission).not.toHaveBeenCalled();
  },
);
test('impede equivalente repetido e limita a cinco', async () => {
  await choose('1 hora antes');
  await press('Adicionar lembrete');
  await press('Personalizado');
  await type('Quantidade do lembrete', '60');
  await press('Adicionar personalizado');
  expect(alert).toHaveBeenLastCalledWith(
    'Lembretes',
    'Esse lembrete já está configurado.',
  );
  await press('No horário');
  for (const label of ['15 min antes', '30 min antes', '1 dia antes']) {
    await choose(label);
  }
  expect(controls('Adicionar lembrete')[0].props.disabled).toBe(true);
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'Você pode configurar até 5 lembretes por tarefa.',
  );
  expect(requestReminderPermission).toHaveBeenCalledTimes(1);
});
test.each(['', '25:00', 'abc'])(
  'bloqueia horário inválido %s antes da API',
  async time => {
    await type('Título', 'Inválida');
    await choose('No horário');
    await type('Horário', time);
    await press('Criar tarefa');
    expect(create).not.toHaveBeenCalled();
    expect(alert).toHaveBeenLastCalledWith(
      'Lembretes',
      'Defina um horário válido para configurar lembretes.',
    );
  },
);
test.each([
  ['No horário', 'TASK'],
  ['1 dia antes', 'TRIGGER'],
])('valida passado: %s', async (label, kind) => {
  const day = new Date();
  const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(day.getDate()).padStart(2, '0')}`;
  jest
    .spyOn(Date, 'now')
    .mockReturnValue(
      Date.parse(`${key}T${kind === 'TASK' ? '14:00' : '12:00'}:00Z`),
    );
  await type('Título', 'Passado');
  await choose(label);
  await press('Criar tarefa');
  expect(create).not.toHaveBeenCalled();
  expect(alert.mock.calls.at(-1)?.[1]).toContain(
    kind === 'TASK'
      ? 'O horário da tarefa já passou'
      : 'O lembrete precisa ser agendado',
  );
});
test('permissão negada permite salvar a configuração sem afirmar agendamento', async () => {
  futureClock();
  jest.mocked(requestReminderPermission).mockResolvedValueOnce(false);
  create.mockResolvedValue({
    cacheSaved: true,
    scheduling: { state: 'unavailable' },
  });
  await type('Título', 'Negada');
  await choose('No horário');
  // The permission adapter owns the OS prompt; this alert explains persistence.
  expect(alert).toHaveBeenCalledWith(
    'Notificações desativadas',
    'A tarefa poderá ser salva, mas as notificações estão desativadas neste aparelho.',
  );
  await press('Criar tarefa');
  expect(create).toHaveBeenCalledTimes(1);
  expect(alert.mock.calls.at(-1)?.[1]).toContain('não foi agendado');
});
test.each(['scheduled', 'not_required', 'pending', 'unavailable', 'error'])(
  'feedback %s combina cache sem repetir POST',
  async state => {
    create.mockResolvedValue({ cacheSaved: false, scheduling: { state } });
    await type('Título', 'Feedback');
    await press('Criar tarefa');
    const message = alert.mock.calls.at(-1)?.[1];
    expect(message).toContain(
      state === 'scheduled'
        ? 'lembrete agendado'
        : state === 'not_required'
        ? 'sucesso'
        : 'não foi agendado',
    );
    expect(message).toContain('cache local falhou');
    expect(create).toHaveBeenCalledTimes(1);
  },
);
