jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));

import React from 'react';
import { Alert, PermissionsAndroid, Platform, Text, TextInput } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import NewTaskScreen from '../src/screens/NewTaskScreen';
import { useTasks } from '../src/context/TaskContext';
import { useProjects } from '../src/context/ProjectContext';
import voice from '../specs/NativeTaskVoice';

const mockNavigation = { goBack: jest.fn(), addListener: jest.fn(() => jest.fn()) };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('@react-native-community/datetimepicker', () => () => null);
jest.mock('../src/context/TaskContext', () => ({ useTasks: jest.fn() }));
jest.mock('../src/context/ProjectContext', () => ({ useProjects: jest.fn() }));
jest.mock('../specs/NativeTaskVoice', () => ({
  isAvailable: jest.fn(), start: jest.fn(), cancel: jest.fn(),
}));

const native = jest.mocked(voice!);
const create = jest.fn();
let renderer: TestRenderer.ReactTestRenderer;
let permission: jest.SpyInstance;

function control(label: string) {
  return renderer.root.findAll(node => typeof node.props.onPress === 'function'
    && (node.props.accessibilityLabel === label
      || node.findAllByType(Text).some(text => text.props.children === label)))[0];
}

function input(label: string) {
  return renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!;
}

function visible(text: string) {
  return renderer.root.findAllByType(Text).some(node => node.props.children === text);
}

async function press(label: string) {
  await act(async () => {await control(label).props.onPress();});
}

async function type(label: string, value: string) {
  await act(async () => input(label).props.onChangeText(value));
}

beforeEach(async () => {
  jest.useFakeTimers({now: new Date(2026, 10, 27, 12)});
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  permission = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  native.isAvailable.mockResolvedValue(true);
  native.start.mockResolvedValue('Entregar trabalho na segunda-feira, prioridade alta');
  native.cancel.mockResolvedValue(undefined);
  create.mockResolvedValue({cacheSaved: true, scheduling: {state: 'not_required'}});
  jest.mocked(useTasks).mockReturnValue({addTask: create} as unknown as ReturnType<typeof useTasks>);
  jest.mocked(useProjects).mockReturnValue({
    projects: [{id: 'project-a', name: 'Geral'}],
  } as ReturnType<typeof useProjects>);
  await act(async () => {renderer = TestRenderer.create(<NewTaskScreen />);});
});

afterEach(async () => {
  await act(async () => renderer.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('uses edited text to populate the canonical form, saves once only after explicit confirmation', async () => {
  expect(permission).not.toHaveBeenCalled();
  await type('Título', 'Rascunho manual');
  await type('Descrição', 'Descrição preservada');
  await press('Criar por voz');
  expect(input('Título').props.value).toBe('Rascunho manual');
  expect(create).not.toHaveBeenCalled();

  await type('Transcrição', 'Entregar trabalho na segunda-feira prioridade média');
  await press('Interpretar e preencher');
  expect(input('Título').props.value).toBe('Entregar trabalho');
  expect(create).not.toHaveBeenCalled();

  const save = control('Criar tarefa').props.onPress;
  await act(async () => {
    await Promise.all([save(), save()]);
  });
  expect(create).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Entregar trabalho',
    description: 'Descrição preservada',
    priority: 'medium',
    dueDate: new Date(2026, 10, 30).toISOString(),
    projectId: 'project-a',
  }));
});

test('unavailable service preserves manual editing and skips the permission request', async () => {
  native.isAvailable.mockResolvedValue(false);
  await press('Criar por voz');
  expect(permission).not.toHaveBeenCalled();
  expect(native.start).not.toHaveBeenCalled();
  await type('Título', 'Criação manual');
  await press('Criar tarefa');
  expect(create).toHaveBeenCalledTimes(1);
});

test('denied permission leaves the draft intact', async () => {
  permission.mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
  await type('Título', 'Rascunho');
  await press('Criar por voz');
  expect(native.start).not.toHaveBeenCalled();
  expect(input('Título').props.value).toBe('Rascunho');
  expect(visible('Microfone não autorizado. Você pode continuar digitando.')).toBe(true);
});

test.each(['Nenhuma transcrição reconhecida.', 'O modelo de português do Brasil está indisponível.'])(
  'preserves the previous transcript and draft on native error: %s',
  async message => {
    await press('Criar por voz');
    await type('Título', 'Rascunho');
    native.start.mockRejectedValueOnce(new Error(message));
    await press('Criar por voz');
    expect(input('Transcrição').props.value).toBe('Entregar trabalho na segunda-feira, prioridade alta');
    expect(input('Título').props.value).toBe('Rascunho');
    expect(visible(message)).toBe(true);
    expect(create).not.toHaveBeenCalled();
  },
);

test('blocks concurrent captures and discards a result that arrives after cancellation', async () => {
  await press('Criar por voz');
  const first = input('Transcrição').props.value;
  let late!: (value: string) => void;
  native.start.mockReturnValueOnce(new Promise(resolve => {late = resolve;}));
  const start = control('Criar por voz').props.onPress;
  await act(async () => {
    start();
    start();
  });
  expect(native.start).toHaveBeenCalledTimes(2);
  expect(control('Cancelar captura')).toBeDefined();
  await press('Cancelar captura');
  await act(async () => late('Resultado descartado'));
  expect(native.cancel).toHaveBeenCalledTimes(1);
  expect(input('Transcrição').props.value).toBe(first);
  expect(create).not.toHaveBeenCalled();

  native.start.mockResolvedValueOnce('Comprar pão amanhã');
  await press('Criar por voz');
  expect(input('Transcrição').props.value).toBe('Comprar pão amanhã');
  expect(create).not.toHaveBeenCalled();
});

test('clearing the transcript leaves the form unchanged on interpretation', async () => {
  await type('Título', 'Rascunho');
  await press('Criar por voz');
  await type('Transcrição', '  ');
  await press('Interpretar e preencher');
  expect(visible('Informe uma transcrição para interpretar.')).toBe(true);
  expect(input('Título').props.value).toBe('Rascunho');
  expect(create).not.toHaveBeenCalled();
});
