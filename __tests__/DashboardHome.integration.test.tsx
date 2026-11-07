import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import HomeScreen from '../src/screens/HomeScreen';
import type { Task } from '../src/context/TaskContext';

let mockTasks: Task[] = [];
let mockReadError: string | null = null;
const mockNavigate = jest.fn();
const mockProjects = [
  {
    id: 'local',
    remoteId: 'remote',
    name: 'Apresentação',
    icon: 'P',
    color: '#5C4DFF',
  },
];
const mockToggle = jest.fn(async () => ({ cacheSaved: true }));
jest.mock('../src/context/TaskContext', () => ({
  useTasks: () => ({
    tasks: mockTasks,
    toggleTask: mockToggle,
    loading: false,
    readError: mockReadError,
  }),
}));
jest.mock('../src/context/ProjectContext', () => ({
  useProjects: () => ({ projects: mockProjects, hydrated: true }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

let renderer: TestRenderer.ReactTestRenderer;
const task = (changes: Partial<Task> = {}): Task => ({
  id: 'a',
  title: 'A',
  project: 'Nome só para exibição',
  projectId: 'remote',
  priority: 'low',
  status: 'todo',
  done: false,
  dueDate: '2026-10-04',
  ...changes,
});
const cards = () =>
  renderer.root
    .findAll(
      node => typeof node.type === 'function' && node.type.name === 'StatCard',
    )
    .map(node => ({ label: node.props.label, value: node.props.value }));
const projects = () =>
  renderer.root.findAll(
    node => typeof node.type === 'function' && node.type.name === 'ProjectCard',
  );
async function update(tasks: Task[]) {
  mockTasks = tasks;
  await act(async () => renderer.update(<HomeScreen />));
}
beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 4, 10));
  mockReadError = null;
  mockNavigate.mockClear();
  mockTasks = [];
  mockProjects.splice(1);
  mockToggle.mockClear();
  await act(async () => {
    renderer = TestRenderer.create(<HomeScreen />);
  });
});
afterEach(async () => {
  await act(async () => renderer.unmount());
  jest.useRealTimers();
});

test('empty Home renders zeros, dynamic header and project empty state without examples', () => {
  expect(cards().every(card => card.value === 0)).toBe(true);
  const labels = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children);
  expect(labels).toContain('Domingo, 4 de outubro');
  expect(labels).toContain('Nenhum projeto com tarefas vinculadas.');
  expect(projects()).toHaveLength(0);
});
test('Context changes immediately update creation, edit, conclusion, reopen, removal and restore indicators', async () => {
  await update([task()]);
  expect(cards()).toContainEqual({ label: 'Pendentes', value: 1 });
  expect(projects()[0].props).toMatchObject({
    name: 'Apresentação',
    total: 1,
    completed: 0,
  });
  await update([task({ dueDate: '2026-11-01' })]);
  expect(cards()).toContainEqual({ label: 'Pendentes', value: 0 });
  await update([task({ status: 'completed', done: true })]);
  expect(cards()).toContainEqual({ label: 'Concluídas', value: 1 });
  expect(projects()[0].props.completed).toBe(1);
  await update([task()]);
  expect(cards()).toContainEqual({ label: 'Pendentes', value: 1 });
  await update([]);
  expect(projects()).toHaveLength(0);
  await update([task()]);
  expect(projects()[0].props.total).toBe(1);
});
test('period controls alter indicators and progress title while overdue remains visible', async () => {
  await update([
    task(),
    task({ id: 'b', dueDate: '2026-09-30' }),
    task({ id: 'c', dueDate: '2026-10-20' }),
  ]);
  const select = async (label: string) => {
    const control = renderer.root
      .findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          typeof node.props.onPress === 'function',
      )
      .find(node =>
        node.findAllByType(Text).some(text => text.props.children === label),
      )!;
    await act(async () => control.props.onPress());
  };
  expect(cards()).toContainEqual({ label: 'Pendentes', value: 1 });
  await select('Semana');
  expect(cards()).toContainEqual({ label: 'Pendentes', value: 2 });
  expect(
    renderer.root.findAllByType(Text).map(node => node.props.children),
  ).toContain('Progresso da semana');
  await select('Mês');
  expect(cards()).toContainEqual({ label: 'Pendentes', value: 2 });
  expect(cards()).toContainEqual({ label: 'Atrasadas', value: 1 });
  expect(
    renderer.root.findAllByType(Text).map(node => node.props.children),
  ).toContain('Progresso do mês');
});
test('clock updates date and greeting across midnight while screen stays mounted', async () => {
  await act(async () => {
    jest.setSystemTime(new Date(2026, 9, 5, 0));
    jest.advanceTimersByTime(60000);
  });
  const labels = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children);
  expect(labels).toContain('Segunda-feira, 5 de outubro');
  expect(labels).toContain('Boa noite!');
});

test('Home remains compact with deterministic last-three project selection', async () => {
  for (let index = 1; index <= 4; index++) {
    mockProjects.push({
      id: 'p' + index,
      remoteId: 'r' + index,
      name: 'Projeto ' + index,
      icon: 'P',
      color: '#5C4DFF',
    });
  }
  await update([
    task(),
    ...[1, 2, 3, 4].map(index =>
      task({ id: 't' + index, projectId: 'r' + index }),
    ),
  ]);
  expect(projects().map(project => project.props.name)).toEqual([
    'Projeto 4',
    'Projeto 3',
    'Projeto 2',
  ]);
});

test('header has no decorative emoji and settings keeps its navigation', async () => {
  const text = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .join('');
  expect(text).toContain('Bom dia!');
  expect(text).not.toMatch(/[👋👤🔴📋✅🕒🎉]/u);
  const settings = renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel === 'Abrir configurações',
  )[0];
  await act(async () => settings.props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('Configuracoes');
});

test('project icon, task metadata, accessible completion and details survive polish', async () => {
  mockProjects[0].icon = '📚';
  await update([task({ time: '09:00' })]);
  expect(
    renderer.root.findAllByType(Text).map(node => node.props.children),
  ).toContain('📚');
  expect(
    renderer.root
      .findAllByType(Text)
      .map(node => [node.props.children].flat().join('')),
  ).toContain('Nome só para exibição · 09:00');
  const checkbox = renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityRole === 'checkbox',
  )[0];
  expect(checkbox.props.accessibilityState).toEqual({ checked: false });
  const stopPropagation = jest.fn();
  await act(async () => checkbox.props.onPress({ stopPropagation }));
  expect(stopPropagation).toHaveBeenCalled();
  expect(mockToggle).toHaveBeenCalledWith('a');
  const details = renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel === 'Abrir tarefa: A',
  )[0];
  await act(async () => details.props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('DetalheTarefa', { taskId: 'a' });
  await update([task({ done: true, status: 'completed' })]);
  expect(
    renderer.root.findAll(
      node => node.props.accessibilityRole === 'checkbox',
    )[0].props.accessibilityState.checked,
  ).toBe(true);
  expect(cards()).toContainEqual({ label: 'Concluídas', value: 1 });
});

test('read failure is contained in an alert and retains available task cards', async () => {
  mockReadError = 'Não foi possível consultar tarefas.';
  await update([task()]);
  const alert = renderer.root.findAll(
    node => node.props.accessibilityRole === 'alert',
  )[0];
  expect(alert.findAllByType(Text).map(node => node.props.children)).toEqual([
    'Não foi possível consultar tarefas.',
    'As tarefas disponíveis foram mantidas.',
  ]);
  expect(
    renderer.root.findAll(
      node => node.props.accessibilityLabel === 'Abrir tarefa: A',
    ).length,
  ).toBeGreaterThan(0);
});

test('Home conta ocorrências reais como Tasks comuns sem duplicação visual', async () => {
  const recurrence = { frequency: 'DAILY' as const, timeZone: 'UTC', anchorDate: '2026-10-04', materializedThrough: '2026-11-04', updatedAt: '2026-10-04T10:00:00Z' };
  await update([task({ id: 'occurrence', title: 'REC-DIARIA', recurrenceSeriesId: 'series', occurrenceKey: '2026-10-04', recurrence }), task({ id: 'normal', title: 'Comum' })]);
  expect(cards()).toContainEqual({ label: 'Pendentes', value: 2 });
  const rows = renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === 'Abrir tarefa: REC-DIARIA');
  expect(rows).toHaveLength(1);
  await act(async () => rows[0].props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('DetalheTarefa', { taskId: 'occurrence' });
});
