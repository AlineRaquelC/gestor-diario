import React from 'react';
import { Modal, Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '../src/screens/HomeScreen';
import { TaskProvider, useTasks } from '../src/context/TaskContext';
import type { Task } from '../src/context/TaskContext';
import { ProjectProvider } from '../src/context/ProjectContext';
import {
  getTasks,
  deleteTask,
  restoreTask,
  updateTask,
} from '../src/services/taskService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('../src/services/taskService', () => ({
  getTasks: jest.fn(),
  deleteTask: jest.fn(),
  restoreTask: jest.fn(),
  updateTask: jest.fn(),
  mergeSubtasks: jest.requireActual('../src/services/taskService')
    .mergeSubtasks,
}));
const storage = new Map<string, string>();
const project = (id: string, name: string, remoteId?: string) => ({
  id,
  name,
  remoteId,
  icon: 'P',
  color: '#5C4DFF',
});
const task = (id: string, changes: Partial<Task> = {}): Task => ({
  id,
  title: id,
  project: 'Projeto A',
  projectId: 'remote-a',
  status: 'todo',
  done: false,
  priority: 'high',
  startDate: '2026-10-20',
  dueDate: '2026-10-20',
  ...changes,
});
const tasks = [
  task('Alta pendente A'),
  task('Média concluída A', {
    priority: 'medium',
    status: 'completed',
    done: true,
  }),
  task('Baixa pendente B', {
    priority: 'low',
    projectId: 'b',
    project: 'Projeto B',
    dueDate: '2026-10-25',
  }),
  task('Alta parcial B', {
    status: 'in_progress',
    projectId: 'b',
    project: 'Projeto B',
    dueDate: '2026-10-31',
  }),
];
let renderer: TestRenderer.ReactTestRenderer;
let context: ReturnType<typeof useTasks>;
function Probe() {
  context = useTasks();
  return <HomeScreen />;
}
const titles = () =>
  renderer.root
    .findAll(
      node => typeof node.type === 'function' && node.type.name === 'TaskCard',
    )
    .map(node => node.props.task.title);
const labels = () =>
  renderer.root.findAllByType(Text).map(node =>
    [node.props.children]
      .flat()
      .filter(value => typeof value === 'string' || typeof value === 'number')
      .join(''),
  );
async function press(label: string) {
  const control = renderer.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(
      node =>
        node.props.accessibilityLabel === label ||
        node.findAllByType(Text).some(text => text.props.children === label),
    );
  expect(control).toBeDefined();
  await act(async () => control!.props.onPress());
}
async function apply(...options: string[]) {
  await press('Filtrar e ordenar tarefas');
  for (const option of options) {
    await press(option);
  }
  await press('Aplicar');
}
const metrics = () =>
  renderer.root
    .findAll(
      node =>
        typeof node.type === 'function' &&
        ['StatCard', 'ProjectCard'].includes(node.type.name),
    )
    .map(node => ({ ...node.props }));
beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 20, 12));
  storage.clear();
  storage.set('@taskflow:tasks', JSON.stringify(tasks));
  storage.set(
    '@taskflow:projects',
    JSON.stringify([
      project('a', 'Projeto A', 'remote-a'),
      project('b', 'Projeto B'),
    ]),
  );
  jest
    .mocked(AsyncStorage.getItem)
    .mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
    storage.set(key, value);
  });
  jest.mocked(getTasks).mockResolvedValue(tasks);
  jest.mocked(deleteTask).mockResolvedValue({
    id: tasks[0].id,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  jest.mocked(restoreTask).mockResolvedValue(tasks[0]);
  await act(async () => {
    renderer = TestRenderer.create(
      <ProjectProvider>
        <TaskProvider>
          <Probe />
        </TaskProvider>
      </ProjectProvider>,
    );
  });
  jest.clearAllMocks();
});
afterEach(async () => {
  await act(async () => renderer.unmount());
  jest.useRealTimers();
});

test('opens filters, changes drafts only, applies intersection, indicates active filters, clears to full list', async () => {
  await press('Filtrar e ordenar tarefas');
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  await press('Status: Parciais');
  await press('Prioridade: Alta');
  await press('Projeto: Projeto B');
  await press('Período: Mês');
  expect(titles()).toHaveLength(4);
  await press('Aplicar');
  expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  expect(titles()).toEqual(['Alta parcial B']);
  expect(JSON.stringify(labels())).toContain('Filtros ativos: 4');
  await press('Limpar filtros');
  expect(titles()).toHaveLength(4);
  expect(JSON.stringify(labels())).not.toContain('Filtros ativos:');
});
test.each([
  ['Pendentes', ['Alta pendente A', 'Baixa pendente B']],
  ['Parciais', ['Alta parcial B']],
  ['Concluídas', ['Média concluída A']],
])('status %s', async (status, expected) => {
  await apply(`Status: ${status}`);
  expect(titles()).toEqual(expected);
});
test('no matching results is distinct from no registered tasks and does not report all caught up', async () => {
  await apply('Status: Concluídas', 'Prioridade: Alta');
  expect(titles()).toEqual([]);
  expect(labels()).toContain('Nenhuma tarefa encontrada com esses filtros.');
  expect(labels()).not.toContain('Tudo em dia!');
});
test('cancel and Android back discard drafts; reopening starts from applied selection', async () => {
  await apply('Prioridade: Alta');
  await press('Filtrar e ordenar tarefas');
  await press('Prioridade: Baixa');
  await press('Cancelar');
  expect(titles()).toEqual(['Alta pendente A', 'Alta parcial B']);
  await press('Filtrar e ordenar tarefas');
  expect(
    renderer.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(node => node.props.accessibilityLabel === 'Prioridade: Alta')!.props
      .accessibilityState.selected,
  ).toBe(true);
  await press('Status: Concluídas');
  await act(async () => renderer.root.findByType(Modal).props.onRequestClose());
  expect(titles()).toHaveLength(2);
});
test('restoring default resets sorting and filters together', async () => {
  await apply('Prioridade: Baixa', 'Ordenação: Prazo');
  expect(titles()).toEqual(['Baixa pendente B']);
  await press('Filtrar e ordenar tarefas');
  await press('Restaurar padrão');
  expect(titles()).toHaveLength(4);
  expect(labels()).toContain('Para fazer');
  expect(labels()).not.toContain('Ordenação ativa');
});
test('sorts the whole list, including completed tasks, in both directions without writing to Context, cache or API', async () => {
  const original = context.tasks;
  const persisted = storage.get('@taskflow:tasks');
  await apply('Ordenação: Prioridade', 'Direção da prioridade: Baixa → alta');
  expect(titles()).toEqual([
    'Baixa pendente B',
    'Média concluída A',
    'Alta pendente A',
    'Alta parcial B',
  ]);
  expect(labels()).toContain('Ordenação ativa');
  await apply('Direção da prioridade: Alta → baixa');
  expect(titles()).toEqual([
    'Alta pendente A',
    'Alta parcial B',
    'Média concluída A',
    'Baixa pendente B',
  ]);
  await apply(
    'Ordenação: Prazo',
    'Direção do prazo: Mais distante → mais próximo',
  );
  expect(titles()).toEqual([
    'Alta parcial B',
    'Baixa pendente B',
    'Alta pendente A',
    'Média concluída A',
  ]);
  expect(context.tasks).toBe(original);
  expect(storage.get('@taskflow:tasks')).toBe(persisted);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(getTasks).not.toHaveBeenCalled();
  expect(updateTask).not.toHaveBeenCalled();
  expect(deleteTask).not.toHaveBeenCalled();
});
test('filtering and sorting leave dashboard and project metrics unchanged; dashboard period does not filter list', async () => {
  const before = metrics();
  await apply('Projeto: Projeto B', 'Prioridade: Baixa', 'Ordenação: Prazo');
  expect(titles()).toEqual(['Baixa pendente B']);
  expect(metrics()).toEqual(before);
  await press('Semana');
  expect(titles()).toEqual(['Baixa pendente B']);
  await press('Limpar filtros');
  expect(titles()).toHaveLength(4);
});
test('soft-deleted task cannot reappear on filter, sort or clear; restore comes only from Context', async () => {
  await act(async () => {
    await context.deleteTask(tasks[0].id);
  });
  await apply('Status: Pendentes', 'Ordenação: Prioridade');
  expect(titles()).toEqual(['Baixa pendente B']);
  await press('Limpar filtros');
  expect(titles()).not.toContain(tasks[0].title);
  await act(async () => {
    await context.restoreTask(tasks[0].id);
  });
  expect(titles()).toContain(tasks[0].title);
});
test('period reacts to local midnight without remount and all returns the full list', async () => {
  await apply('Período: Hoje');
  expect(titles()).toEqual(['Alta pendente A', 'Média concluída A']);
  await act(async () => {
    jest.setSystemTime(new Date(2026, 9, 21, 0));
    jest.advanceTimersByTime(60000);
  });
  expect(titles()).toEqual([]);
  expect(labels()).toContain('Nenhuma tarefa encontrada com esses filtros.');
  await apply('Período: Todos');
  expect(titles()).toHaveLength(4);
});

test('a filtered subset containing only completed tasks does not claim every pending task is finished', async () => {
  await apply('Prioridade: Média');
  expect(titles()).toEqual(['Média concluída A']);
  expect(labels()).not.toContain('Tudo em dia!');
  expect(context.tasks.some(item => item.status === 'todo')).toBe(true);
});

test('no registered tasks has its own message, distinct from no matching results', async () => {
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', '[]');
  jest.mocked(getTasks).mockResolvedValue([]);
  await act(async () => {
    renderer = TestRenderer.create(
      <ProjectProvider>
        <TaskProvider>
          <Probe />
        </TaskProvider>
      </ProjectProvider>,
    );
  });
  expect(labels()).toContain('Nenhuma tarefa cadastrada');
  expect(labels()).not.toContain(
    'Nenhuma tarefa encontrada com esses filtros.',
  );
});
