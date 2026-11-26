import React from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import { StackRouter, type NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { RootStackParamList } from '../src/navigation/AppNavigator';
import { useNewTaskShortcut } from '../src/navigation/useNewTaskShortcut';

const mockProjects = { hydrated: true, readError: null as string | null, projects: [] };
const mockTasks = { loading: false, readError: null as string | null, addTask: jest.fn() };
jest.mock('../src/context/ProjectContext', () => ({ useProjects: () => mockProjects }));
jest.mock('../src/context/TaskContext', () => ({ useTasks: () => mockTasks }));

const router = StackRouter({ initialRouteName: 'Login' });
const options = {
  routeNames: ['Login', 'Home', 'NovaTarefa', 'Calendario', 'CriarProjeto'],
  routeParamList: {},
  routeGetIdList: {},
};
let state: ReturnType<typeof router.getInitialState>;
const dispatch = jest.fn((action: Parameters<typeof router.getStateForAction>[1]) => {
  const next = router.getStateForAction(state, action, options);
  if (next) {state = router.getRehydratedState(next, options);}
});
const navigation = {
  dispatch,
  getRootState: () => state,
  reset: jest.fn((next: Parameters<typeof router.getRehydratedState>[0]) => {
    state = router.getRehydratedState(next, options);
  }),
} as unknown as NavigationContainerRefWithCurrent<RootStackParamList>;

let renderer: ReactTestRenderer;
let initial: string | null;
let emit: (event: { url: string }) => void;
let resume: (state: 'active') => void;
let sequence = 0;
const url = () => `gestordiario://shortcut/new-task/${++sequence}`;
const routes = () => state.routes.map(route => route.name);
const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
const originalPlatform = Platform.OS;

function Shortcut({ ready }: { ready: boolean }) {
  useNewTaskShortcut(navigation, ready);
  return null;
}

async function render(ready = true) {
  await act(async () => {renderer = create(<Shortcut ready={ready} />);});
}

async function deliver(value = url()) {
  await act(async () => {emit({ url: value });});
}

beforeEach(() => {
  Platform.OS = 'android';
  initial = null;
  alert.mockClear();
  state = router.getInitialState(options);
  mockProjects.hydrated = true;
  mockProjects.readError = null;
  mockTasks.loading = false;
  mockTasks.readError = null;
  jest.spyOn(Linking, 'getInitialURL').mockImplementation(async () => initial);
  jest.spyOn(Linking, 'addEventListener').mockImplementation((_type, listener) => {
    emit = listener;
    return { remove: jest.fn() };
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    resume = listener;
    return { remove: jest.fn() };
  });
});

afterEach(async () => {
  await act(async () => {renderer.unmount();});
  expect(mockTasks.addTask).toHaveBeenCalledTimes(0);
  Platform.OS = originalPlatform;
});

afterAll(() => jest.restoreAllMocks());

test('retains cold delivery until navigation, Projects and Tasks are ready; permits empty Projects', async () => {
  initial = url();
  mockProjects.hydrated = false;
  mockTasks.loading = true;
  await render(false);
  expect(routes()).toEqual(['Login']);
  await act(async () => {renderer.update(<Shortcut ready />);});
  expect(routes()).toEqual(['Login']);
  mockProjects.hydrated = true;
  await act(async () => {renderer.update(<Shortcut ready />);});
  expect(routes()).toEqual(['Login']);
  mockTasks.loading = false;
  await act(async () => {renderer.update(<Shortcut ready />);});
  expect(routes()).toEqual(['Home', 'NovaTarefa']);
});

test('warm delivery returns to the same form instance from another route', async () => {
  navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'Calendario' }] });
  await render();
  const delivery = url();
  await deliver(delivery);
  const form = state.routes[2];
  await deliver();
  expect(state.routes[2]).toBe(form);
  dispatch({ type: 'PUSH', payload: { name: 'CriarProjeto' } });
  await deliver();
  expect(routes()).toEqual(['Home', 'Calendario', 'NovaTarefa']);
  expect(state.routes[2]).toBe(form);
  dispatch({ type: 'GO_BACK' });
  await deliver(delivery);
  expect(routes()).toEqual(['Home', 'Calendario']);
  await deliver();
  expect(routes()).toEqual(['Home', 'Calendario', 'NovaTarefa']);
});

test('deduplicates startup, active resume and Activity recreation', async () => {
  initial = url();
  await render();
  await deliver(initial);
  dispatch({ type: 'GO_BACK' });
  await act(async () => {resume('active');});
  expect(routes()).toEqual(['Home']);
  await act(async () => {renderer.unmount();});
  await render();
  expect(routes()).toEqual(['Home']);
});

test('recovers an event missed before subscription through the current Activity URL', async () => {
  await render(false);
  initial = url();
  await act(async () => {resume('active');});
  expect(routes()).toEqual(['Login']);
  await act(async () => {renderer.update(<Shortcut ready />);});
  expect(routes()).toEqual(['Home', 'NovaTarefa']);
});

test.each(['projects', 'tasks'])('consumes once and preserves navigation when %s hydration fails', async source => {
  if (source === 'projects') {
    mockProjects.readError = 'Cache ilegível';
  } else {
    mockTasks.readError = 'Falha de leitura';
  }
  initial = url();
  await render();
  await deliver(initial);
  expect(routes()).toEqual(['Login']);
  expect(alert).toHaveBeenCalledTimes(1);
  mockProjects.readError = null;
  mockTasks.readError = null;
  await deliver();
  expect(routes()).toEqual(['Home', 'NovaTarefa']);
});

test('ignores the raw shortcut, malformed deliveries and normal launch', async () => {
  await render();
  await deliver('gestordiario://shortcut/new-task');
  await deliver(`${url()}?title=QA67`);
  expect(routes()).toEqual(['Login']);
});
