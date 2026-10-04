import React from 'react';
import { Alert, TextInput } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProjectProvider } from '../src/context/ProjectContext';
import { TaskProvider, useTasks } from '../src/context/TaskContext';
import type { Task } from '../src/context/TaskContext';
import NewTaskScreen from '../src/screens/NewTaskScreen';
import HomeScreen from '../src/screens/HomeScreen';
import TaskDetailsScreen from '../src/screens/TaskDetailsScreen';
import type { ApiTask } from '../src/services/taskService';

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn(), reset: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { taskId: 'task' } }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('@react-native-community/datetimepicker', () => () => null);
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));

// Keep the real screens, Context, service and adapters. Mock only transport and
// storage; SQLite and atomic completion are covered by the backend regression.
let context: ReturnType<typeof useTasks>;
let renderer: ReactTestRenderer.ReactTestRenderer;
let selectedScreen: 'new' | 'home' | 'details';
let remote: ApiTask | undefined;
const storage = new Map<string, string>();
const fetchMock = jest.fn();
let serial = 0;
const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });
function calculate() {
  const children = remote!.subtasks!;
  const progress = Math.round(children.filter(child => child.done).length / children.length * 100);
  Object.assign(remote!, { progress, status: progress === 100 ? 'COMPLETED' : progress === 0 ? 'PENDING' : 'PARTIAL', done: progress === 100 });
}
function Probe() { context = useTasks(); return null; }
function Screens() {
  return <><Probe />{selectedScreen === 'new' ? <NewTaskScreen /> : selectedScreen === 'home' ? <HomeScreen /> : <TaskDetailsScreen />}</>;
}
const app = () => <ProjectProvider><TaskProvider><Screens /></TaskProvider></ProjectProvider>;
async function screen(value: typeof selectedScreen) {
  selectedScreen = value;
  await act(async () => renderer.update(app()));
}
const button = (label: string) => renderer.root.findAll(node => typeof node.props.onPress === 'function')
  .find(node => node.findAll(child => String(child.type) === 'Text').some(child => child.props.children === label))!;
const input = (placeholder: string) => renderer.root.findAllByType(TextInput).find(node => node.props.placeholder === placeholder)!;
const task = () => context.tasks.find(item => item.id === 'task')!;
function expectState(done: boolean, progress: number, status: Task['status']) {
  expect(task()).toMatchObject({ done, progress, status });
  expect(task().subtasks).toHaveLength(4);
  expect(task().subtasks!.every(child => child.remote && child.done === done)).toBe(true);
  expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual(context.tasks);
  expect(remote!.subtasks!.every(child => child.done === done)).toBe(true);
}
beforeEach(async () => {
  storage.clear(); serial = 0; remote = undefined; selectedScreen = 'new';
  storage.set('@taskflow:tasks', '[]');
  storage.set('@taskflow:projects', JSON.stringify([{ id: 'p', remoteId: 'remote-p', name: 'Projeto', color: '#fff', icon: 'P' }]));
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  global.fetch = fetchMock;
  fetchMock.mockReset().mockImplementation(async (url, options) => {
    const path = new URL(url).pathname;
    const payload = options.body ? JSON.parse(options.body) : undefined;
    if (options.method === 'GET') {return json(path.endsWith('/history') || path.endsWith('/notes') ? [] : path === '/tasks' ? remote ? [remote] : [] : remote);}
    if (options.method === 'POST' && path === '/tasks') {
      remote = { ...payload, id: 'task', projectId: 'remote-p', favorite: false, description: '', time: '10:00',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null, undoUntil: null,
        subtasks: (payload.subtasks ?? []).map((child: { title: string }) => ({ ...child, id: 'remote-' + ++serial, done: false })) };
      calculate(); return json(remote, 201);
    }
    if (options.method === 'PATCH' && path === '/tasks/task') {
      remote!.subtasks!.forEach(child => { child.done = payload.status === 'COMPLETED'; });
    } else if (options.method === 'PATCH' && path.includes('/subtasks/')) {
      remote!.subtasks!.find(child => path.endsWith('/' + child.id))!.done = payload.done;
    }
    remote!.updatedAt = new Date(Date.parse(remote!.updatedAt) + 1).toISOString();
    calculate();
    return json(path.includes('/subtasks/') ? { task: remote } : remote);
  });
  await act(async () => { renderer = ReactTestRenderer.create(app()); });
});
afterEach(async () => { await act(async () => renderer.unmount()); jest.restoreAllMocks(); });

async function createThroughUI() {
  await act(async () => input('Nome da tarefa...').props.onChangeText('Nova com quatro filhos'));
  await act(async () => button('Projeto').props.onPress());
  for (let index = 1; index <= 4; index++) {
    await act(async () => button('Adicionar subtarefa').props.onPress());
    await act(async () => input('Nome da subtarefa...').props.onChangeText('Filho ' + index));
    await act(async () => input('Nome da subtarefa...').props.onSubmitEditing());
  }
  await act(async () => { await button('Criar tarefa').props.onPress(); });
  const post = fetchMock.mock.calls.find(([url, options]) => url.endsWith('/tasks') && options.method === 'POST');
  expect(JSON.parse(post![1].body).subtasks).toEqual([1, 2, 3, 4].map(index => ({ title: 'Filho ' + index })));
  expectState(false, 0, 'todo');
}
async function partialThroughDetails() {
  await screen('details');
  for (let index = 1; index <= 2; index++) {
    await act(async () => { await button('Filho ' + index).props.onPress(); });
  }
  expect(task()).toMatchObject({ progress: 50, status: 'in_progress', done: false });
  expect(task().subtasks!.filter(child => child.done)).toHaveLength(2);
}
async function homeCheckbox() {
  const card = renderer.root.findAll(node => typeof node.type === 'function' && node.type.name === 'TaskCard')[0];
  const checkbox = card.findAll(node => typeof node.props.onPress === 'function')
    .find(node => !node.findAll(child => String(child.type) === 'Text').some(child => child.props.children === task().title))!;
  await act(async () => { await checkbox.props.onPress(); });
}
it.each(['home', 'details'] as const)('rascunho pela UI → 2/4 → concluir/reabrir pela %s confirma todos e restaura cache sem duplicar', async source => {
  await createThroughUI(); await partialThroughDetails(); await screen(source);
  if (source === 'home') {await homeCheckbox();}
  else {await act(async () => { await button('✓ Concluir tarefa').props.onPress(); });}
  expectState(true, 100, 'completed');
  await screen('details');
  const details = renderer.root.findAll(node => String(node.type) === 'Text')
    .map(node => [node.props.children].flat().join('')).join('\n');
  expect(details).toContain('4/4'); expect(details).toContain('100%'); expect(details).not.toContain('Pendente');
  await screen(source);
  if (source === 'home') {await homeCheckbox();}
  else {await act(async () => { await button('↩ Reabrir tarefa').props.onPress(); });}
  expectState(false, 0, 'todo');
  expect(context.tasks).toHaveLength(1);
  await act(async () => renderer.unmount());
  await act(async () => { renderer = ReactTestRenderer.create(app()); });
  expectState(false, 0, 'todo');
});
it('falha ao concluir pela Home preserva filhos/status/cache após criação pelo rascunho', async () => {
  await createThroughUI(); await partialThroughDetails(); await screen('home');
  const before = JSON.stringify(task()), cache = storage.get('@taskflow:tasks');
  fetchMock.mockRejectedValueOnce(new Error('offline'));
  await homeCheckbox();
  expect(JSON.stringify(task())).toBe(before); expect(storage.get('@taskflow:tasks')).toBe(cache);
  expect(Alert.alert).toHaveBeenCalledWith('Não foi possível alterar o status', expect.any(String));
});
