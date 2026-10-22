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
  create.mockReset().mockResolvedValue({ cacheSaved: true });
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
      reminders: ['15 min antes'],
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
