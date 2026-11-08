import React from 'react';
import { AppState, Text, TextInput } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProductivityScreen from '../src/screens/ProductivityScreen';
import SettingsScreen from '../src/screens/SettingsScreen';
import type { Task } from '../src/context/TaskContext';
import { PRODUCTIVITY_GOALS_KEY } from '../src/services/productivityGoalsService';
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(() => () => undefined),
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('../src/components/BottomNavigation', () => () => null);
let mockTasks: Task[];
let mockLoading = false;
let mockReadError: string | null = null;
jest.mock('../src/context/TaskContext', () => ({
  useTasks: () => ({
    tasks: mockTasks,
    loading: mockLoading,
    readError: mockReadError,
  }),
}));
let renderer: Renderer.ReactTestRenderer;
let raw: string | null;
const text = () => JSON.stringify(renderer.toJSON());
const control = (label: string) =>
  renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel === label,
  )[0];
async function press(label: string) {
  expect(control(label)).toBeDefined();
  await act(async () => {
    await control(label).props.onPress();
  });
}
async function input(value: string) {
  await act(async () => {
    renderer.root.findByType(TextInput).props.onChangeText(value);
  });
}
async function mount() {
  await act(async () => {
    renderer = Renderer.create(<ProductivityScreen />);
  });
}
async function refresh() {
  await act(async () => {
    renderer.update(<ProductivityScreen />);
  });
}
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 10, 8, 12));
  jest.clearAllMocks();
  raw = null;
  mockLoading = false;
  mockReadError = null;
  mockTasks = [
    {
      id: 'a',
      title: 'Real',
      project: '',
      priority: 'low',
      status: 'todo',
      done: false,
      dueDate: '2026-11-08',
    },
  ];
  jest.mocked(AsyncStorage.getItem).mockImplementation(async () => raw);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (_key, value) => {
    raw = value;
  });
});
afterEach(async () => {
  if (renderer) {
    await act(async () => renderer.unmount());
  }
  jest.useRealTimers();
  jest.restoreAllMocks();
});
it('Configurações navega para a rota de metas', async () => {
  await act(async () => {
    renderer = Renderer.create(<SettingsScreen />);
  });
  await press('Metas e relatórios');
  expect(mockNavigation.navigate).toHaveBeenCalledWith('MetasRelatorios');
});
it('define, edita, persiste, reabre e remove sem alterar outros períodos', async () => {
  await mount();
  expect(text()).toContain('Meta não definida');
  await press('Definir meta');
  await input('5');
  await press('Salvar meta');
  expect(text()).toContain('Progresso da meta: ');
  expect(JSON.parse(raw!).goals.daily).toBe(5);
  await press('Semana');
  await press('Definir meta');
  await input('20');
  await press('Salvar meta');
  await press('Mês');
  await press('Definir meta');
  await input('50');
  await press('Salvar meta');
  await act(async () => renderer.unmount());
  await mount();
  expect(text()).toContain('5');
  await press('Editar meta');
  await input('2');
  await press('Salvar meta');
  expect(JSON.parse(raw!).goals).toMatchObject({
    daily: 2,
    weekly: 20,
    monthly: 50,
  });
  await press('Remover meta');
  expect(text()).toContain('Meta não definida');
  expect(JSON.parse(raw!).goals.daily).toBeNull();
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    PRODUCTIVITY_GOALS_KEY,
    expect.any(String),
  );
});
it('input inválido e escrita falha mantêm editor e meta confirmada', async () => {
  await mount();
  await press('Definir meta');
  await input('0');
  await press('Salvar meta');
  expect(text()).toContain('Informe um número inteiro');
  expect(raw).toBeNull();
  await input('5');
  await press('Salvar meta');
  await press('Editar meta');
  await input('8');
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Disk'));
  await press('Salvar meta');
  expect(text()).toContain('valor anterior');
  expect(renderer.root.findByType(TextInput).props.value).toBe('8');
  expect(JSON.parse(raw!).goals.daily).toBe(5);
  await press('Salvar meta');
  expect(JSON.parse(raw!).goals.daily).toBe(8);
});
it('storage inválido não sobrescreve, bloqueia edição e permite retry', async () => {
  raw = '{';
  await mount();
  expect(text()).toContain('preservados');
  expect(control('Definir meta')).toBeUndefined();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  raw = null;
  await press('Tentar novamente');
  expect(control('Definir meta')).toBeDefined();
});
it('cards, texto e barras atualizam com conclusão e reabertura do Context', async () => {
  await mount();
  expect(text()).toContain('Hoje, 0 de 1 tarefas');
  expect(
    renderer.root.findAll(
      node => node.props.accessibilityLabel === 'Pendentes: 1',
    ).length,
  ).toBeGreaterThanOrEqual(2);
  mockTasks = [{ ...mockTasks[0], status: 'completed', done: true }];
  await refresh();
  expect(text()).toContain('Hoje, 1 de 1 tarefas');
  expect(
    renderer.root.findAll(
      node => node.props.accessibilityLabel === 'Concluídas: 1',
    ).length,
  ).toBeGreaterThanOrEqual(2);
  mockTasks = [{ ...mockTasks[0], status: 'todo', done: false }];
  await refresh();
  expect(text()).toContain('Hoje, 0 de 1 tarefas');
});
it('seletor preserva metas independentes e vazio mantém 0 de meta', async () => {
  await mount();
  await press('Semana');
  expect(control('Semana').props.accessibilityState.selected).toBe(true);
  await press('Mês');
  expect(text()).toContain('Neste mês');
  await press('Definir meta');
  await input('5');
  await press('Salvar meta');
  mockTasks = [];
  await refresh();
  expect(text()).toContain('Nenhuma tarefa neste período.');
  expect(text()).toContain('Sem tarefas para exibir');
  expect(
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.children === '0 de 5 concluídas'),
  ).toBe(true);
});
it('loading não anuncia período vazio e readError identifica snapshot parcial', async () => {
  mockLoading = true;
  mockTasks = [];
  await mount();
  expect(text()).toContain('Carregando tarefas');
  expect(text()).not.toContain('Nenhuma tarefa neste período');
  mockLoading = false;
  mockReadError = 'Offline';
  await refresh();
  expect(text()).toContain('Dados disponíveis mantidos');
});
it('relógio atualiza na virada do dia e no foreground', async () => {
  const listener = jest.spyOn(AppState, 'addEventListener');
  await mount();
  expect(text()).toContain('Hoje, 0 de 1 tarefas');
  jest.setSystemTime(new Date(2026, 10, 9, 0));
  await act(async () => {
    jest.advanceTimersByTime(60000);
  });
  expect(text()).toContain('Nenhuma tarefa neste período');
  jest.setSystemTime(new Date(2026, 10, 8, 12));
  await act(async () => {
    listener.mock.calls[0][1]('active');
  });
  expect(text()).toContain('Hoje, 0 de 1 tarefas');
});
