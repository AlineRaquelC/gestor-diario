import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import CalendarScreen from '../src/screens/CalendarScreen';
import { weekDays } from '../src/utils/calendar';
import type { Task } from '../src/context/TaskContext';
let mockTasks: Task[] = [];
let mockLoading = false;
let mockError: string | null = null;
const mockNavigate = jest.fn();
jest.mock('../src/context/TaskContext', () => ({
  useTasks: () => ({
    tasks: mockTasks,
    loading: mockLoading,
    readError: mockError,
  }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
let renderer: TestRenderer.ReactTestRenderer;
const task = (changes: Partial<Task> = {}): Task => ({
  id: 't',
  title: 'Real',
  project: 'Apresentação',
  priority: 'low',
  status: 'todo',
  done: false,
  dueDate: '2026-10-04',
  ...changes,
});
const labels = () =>
  renderer.root.findAllByType(Text).map(node => node.props.children);
const controls = () =>
  renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function',
  );
async function press(label: string) {
  const control = controls().find(
    node =>
      node.props.accessibilityLabel === label ||
      node.findAllByType(Text).some(text => text.props.children === label),
  )!;
  expect(control).toBeDefined();
  await act(async () => control.props.onPress());
}
async function update(tasks: Task[]) {
  mockTasks = tasks;
  await act(async () => renderer.update(<CalendarScreen />));
}
beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 4, 10));
  mockTasks = [];
  mockLoading = false;
  mockError = null;
  mockNavigate.mockClear();
  await act(async () => {
    renderer = TestRenderer.create(<CalendarScreen />);
  });
});
afterEach(async () => {
  await act(async () => renderer.unmount());
  jest.useRealTimers();
});

test('month default, real empty states and existing bottom navigation', () => {
  expect(labels()).toContain('Outubro de 2026');
  expect(labels()).toContain('Nenhuma tarefa para este dia.');
  expect(labels()).toContain('Nenhuma tarefa neste mês.');
  expect(
    controls().find(node =>
      node.findAllByType(Text).some(text => text.props.children === 'Mês'),
    )!.props.accessibilityState.selected,
  ).toBe(true);
});
test('today remains identified separately after selecting another day', async () => {
  await press('5 de outubro, 0 tarefas');
  expect(
    controls().find(
      node => node.props.accessibilityLabel === '4 de outubro, 0 tarefas, hoje',
    )!.props.accessibilityState.selected,
  ).toBe(false);
  expect(
    controls().find(
      node => node.props.accessibilityLabel === '5 de outubro, 0 tarefas',
    )!.props.accessibilityState.selected,
  ).toBe(true);
  await press('Hoje');
  expect(
    controls().find(
      node => node.props.accessibilityLabel === '4 de outubro, 0 tarefas, hoje',
    )!.props.accessibilityState.selected,
  ).toBe(true);
});
test('day groups by time and navigation passes the real task ID', async () => {
  await update([
    task({ id: 'a', time: '09:00' }),
    task({ id: 'b', time: '14:00' }),
    task({ id: 'c', time: '19:00' }),
    task({ id: 'd' }),
  ]);
  await press('Dia');
  for (const group of ['Manhã', 'Tarde', 'Noite', 'Sem horário']) {
    expect(labels()).toContain(group);
  }
  await press('Abrir tarefa Real');
  expect(mockNavigate).toHaveBeenCalledWith('DetalheTarefa', { taskId: 'a' });
});
test('week is Monday through Sunday, supports navigation and day selection', async () => {
  expect(weekDays(new Date(2026, 9, 4))).toEqual([
    '2026-09-28',
    '2026-09-29',
    '2026-09-30',
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
  ]);
  await press('Semana');
  await press('Próximo período');
  expect(
    controls().some(
      node => node.props.accessibilityLabel === '5 de outubro, 0 tarefas',
    ),
  ).toBe(true);
  await press('Período anterior');
  expect(
    controls().some(
      node => node.props.accessibilityLabel === '28 de setembro, 0 tarefas',
    ),
  ).toBe(true);
});
test('month navigation and selection show actual tasks', async () => {
  await update([task({ dueDate: '2026-11-04' })]);
  await press('Próximo período');
  expect(labels()).toContain('Novembro de 2026');
  expect(
    controls().some(
      node => node.props.accessibilityLabel === 'Abrir tarefa Real',
    ),
  ).toBe(true);
  await press('Período anterior');
  expect(labels()).toContain('Outubro de 2026');
});
test('creation/edit/conclusion/reopen react without reload and completed tasks remain visible', async () => {
  await update([task()]);
  expect(labels()).toContain('PRAZO PRÓXIMO');
  await update([task({ status: 'completed', done: true })]);
  expect(labels()).toContain('Concluída');
  await update([task()]);
  expect(labels()).toContain('PRAZO PRÓXIMO');
  await update([task({ dueDate: '2026-10-05' })]);
  expect(labels()).toContain('Nenhuma tarefa para este dia.');
  await press('5 de outubro, 1 tarefas');
  expect(
    controls().some(
      node => node.props.accessibilityLabel === 'Abrir tarefa Real',
    ),
  ).toBe(true);
});
test('historical tasks display overdue badge, not high-priority inference', async () => {
  await update([task({ dueDate: '2026-10-03' })]);
  await press('3 de outubro, 1 tarefas');
  expect(labels()).toContain('ATRASADA');
});
test('loading and errors preserve accessible real tasks', async () => {
  mockLoading = true;
  mockError = 'API indisponível';
  await update([task()]);
  expect(labels()).toContain('Carregando tarefas…');
  expect(
    controls().some(
      node => node.props.accessibilityLabel === 'Abrir tarefa Real',
    ),
  ).toBe(true);
  expect(
    renderer.root.findAll(node => node.props.accessibilityRole === 'alert')
      .length,
  ).toBeGreaterThan(0);
});
