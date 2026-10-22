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
async function openFilters() {
  const button = renderer.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(node =>
      /^Filtrar tarefas/.test(node.props.accessibilityLabel ?? ''),
    )!;
  await act(async () => button.props.onPress());
}
async function selectProject(label: string) {
  const selector = renderer.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(node =>
      /^Selecionar projeto:/.test(node.props.accessibilityLabel ?? ''),
    )!;
  await act(async () => selector.props.onPress());
  await press(label);
}
async function apply(...options: string[]) {
  const filterOptions = options.filter(
    option => !option.startsWith('Ordenação:') && !option.startsWith('Direção'),
  );
  const sortOptions = options.filter(option => !filterOptions.includes(option));
  if (filterOptions.length) {
    await openFilters();
    for (const option of filterOptions) {
      if (option.startsWith('Projeto:')) {
        await selectProject(option);
      } else {
        await press(option);
      }
    }
    await press('Aplicar filtros');
  }
  if (sortOptions.length) {
    await press('Ordenar tarefas');
    for (const option of sortOptions) {
      await press(option);
    }
    await press('Aplicar ordenação');
  }
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
  await openFilters();
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  await press('Status: Parciais');
  await press('Prioridade: Alta');
  await selectProject('Projeto: Projeto B');
  await press('Período: Mês');
  expect(titles()).toHaveLength(4);
  await press('Aplicar filtros');
  expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  expect(titles()).toEqual(['Alta parcial B']);
  expect(labels()).toEqual(
    expect.arrayContaining([
      'Filtrar · 4',
      'Parciais',
      'Alta',
      'Projeto B',
      'Mês',
    ]),
  );
  await press('Limpar filtros e ordenação');
  expect(titles()).toHaveLength(4);
  expect(labels()).toContain('Filtrar');
  expect(
    renderer.root.findAll(node =>
      /^Filtrar tarefas,/.test(node.props.accessibilityLabel ?? ''),
    ),
  ).toHaveLength(0);
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
  await openFilters();
  await press('Prioridade: Baixa');
  await press('Cancelar');
  expect(titles()).toEqual(['Alta pendente A', 'Alta parcial B']);
  await openFilters();
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
  await openFilters();
  await press('Limpar filtros e ordenação');
  expect(titles()).toHaveLength(4);
  expect(labels()).toContain('Para fazer');
  expect(
    renderer.root.findAll(
      node => node.props.accessibilityLabel === 'Ordenar tarefas',
    )[0].props.accessibilityState.selected,
  ).toBe(false);
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
  expect(
    renderer.root.findAll(
      node => node.props.accessibilityLabel === 'Ordenar tarefas',
    )[0].props.accessibilityState.selected,
  ).toBe(true);
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
  await press('Limpar filtros e ordenação');
  expect(titles()).toHaveLength(4);
});
test('soft-deleted task cannot reappear on filter, sort or clear; restore comes only from Context', async () => {
  await act(async () => {
    await context.deleteTask(tasks[0].id);
  });
  await apply('Status: Pendentes', 'Ordenação: Prioridade');
  expect(titles()).toEqual(['Baixa pendente B']);
  await press('Limpar filtros e ordenação');
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

test('project names stay out of filter chips; selector opens rows and preserves draft on back', async () => {
  await openFilters();
  expect(
    renderer.root.findAll(node =>
      /^Projeto:/.test(node.props.accessibilityLabel ?? ''),
    ),
  ).toHaveLength(0);
  expect(
    renderer.root.findAll(node =>
      /^Ordenação:/.test(node.props.accessibilityLabel ?? ''),
    ),
  ).toHaveLength(0);
  await press('Selecionar projeto: Todos os projetos');
  expect(
    renderer.root.findAll(
      node =>
        typeof node.props.onPress === 'function' &&
        /^Projeto:/.test(node.props.accessibilityLabel ?? ''),
    ),
  ).toHaveLength(4);
  await act(async () => renderer.root.findByType(Modal).props.onRequestClose());
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  await selectProject('Projeto: Projeto B');
  expect(titles()).toHaveLength(4);
  await press('Aplicar filtros');
  expect(titles()).toEqual(['Baixa pendente B', 'Alta parcial B']);
  expect(labels()).toContain('Filtrar · 1');
  expect(
    renderer.root.findAll(
      node =>
        node.props.accessibilityLabel === 'Filtrar tarefas, 1 filtro ativo',
    ).length,
  ).toBeGreaterThan(0);
  expect(labels()).toContain('Projeto B');
  await openFilters();
  await selectProject('Projeto: Todos os projetos');
  await press('Aplicar filtros');
  expect(titles()).toHaveLength(4);
});

test('project selection uses IDs even for identical display names', async () => {
  await act(async () => renderer.unmount());
  storage.set(
    '@taskflow:projects',
    JSON.stringify([
      project('a', 'Mesmo nome', 'remote-a'),
      project('b', 'Mesmo nome'),
    ]),
  );
  await act(async () => {
    renderer = TestRenderer.create(
      <ProjectProvider>
        <TaskProvider>
          <Probe />
        </TaskProvider>
      </ProjectProvider>,
    );
  });
  await openFilters();
  await press('Selecionar projeto: Todos os projetos');
  const rows = renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel === 'Projeto: Mesmo nome',
  );
  expect(rows).toHaveLength(2);
  await act(async () => rows[1].props.onPress());
  await press('Aplicar filtros');
  expect(titles()).toEqual(['Baixa pendente B', 'Alta parcial B']);
});

test('sorting panel hides filters and shows direction only for selected criteria', async () => {
  await press('Ordenar tarefas');
  expect(
    renderer.root.findAll(node =>
      /^Status:|^Prioridade:|^Selecionar projeto:|^Direção/.test(
        node.props.accessibilityLabel ?? '',
      ),
    ),
  ).toHaveLength(0);
  await press('Ordenação: Prioridade → Prazo');
  await press('Direção da prioridade: Baixa → alta');
  await press('Direção do prazo: Mais distante → mais próximo');
  await press('Aplicar ordenação');
  expect(titles()).toEqual([
    'Baixa pendente B',
    'Média concluída A',
    'Alta parcial B',
    'Alta pendente A',
  ]);
  await press('Ordenar tarefas');
  await press('Ordenação: Padrão');
  expect(
    renderer.root.findAll(node =>
      /^Direção/.test(node.props.accessibilityLabel ?? ''),
    ),
  ).toHaveLength(0);
  await press('Aplicar ordenação');
  expect(labels()).toContain('Para fazer');
});
