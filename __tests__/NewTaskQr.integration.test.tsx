jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));
import React from 'react';
import { Alert, Linking, Text, TextInput } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import NewTaskScreen from '../src/screens/NewTaskScreen';
import { useTasks } from '../src/context/TaskContext';
import { useProjects } from '../src/context/ProjectContext';
import {
  qrScanner,
  requestQrCameraPermission,
} from '../src/services/qrScanner';

let mockBlur: () => void;
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn((_event, callback) => {
    mockBlur = callback;
    return jest.fn();
  }),
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('@react-native-community/datetimepicker', () => () => null);
jest.mock('../src/context/TaskContext', () => ({ useTasks: jest.fn() }));
jest.mock('../src/context/ProjectContext', () => ({ useProjects: jest.fn() }));
jest.mock('../src/services/qrScanner', () => ({
  requestQrCameraPermission: jest.fn(),
  qrScanner: { scan: jest.fn(), cancel: jest.fn(async () => {}) },
}));
const create = jest.fn();
const fixture = JSON.stringify({
  version: 1,
  title: 'QA66 QR',
  description: 'Material',
  dueDate: '2026-11-20',
  priority: 'medium',
});
let renderer: TestRenderer.ReactTestRenderer;
let alert: jest.SpyInstance;
const control = (label: string) =>
  renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      (node.props.accessibilityLabel === label ||
        node.findAllByType(Text).some(text => text.props.children === label)),
  )[0];
const input = (label: string) =>
  renderer.root
    .findAllByType(TextInput)
    .find(node => node.props.accessibilityLabel === label)!;
async function press(label: string) {
  await act(async () => {
    await control(label).props.onPress();
  });
}
async function type(label: string, value: string) {
  await act(async () => input(label).props.onChangeText(value));
}
async function confirm(text: string) {
  const buttons = alert.mock.calls.at(-1)![2];
  const button = buttons.find((item: { text: string }) => item.text === text);
  expect(button).toBeDefined();
  await act(async () => button.onPress?.());
}
beforeEach(async () => {
  jest.useFakeTimers({ now: new Date(2026, 10, 17, 12) });
  jest.clearAllMocks();
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
  jest.mocked(useProjects).mockReturnValue({
    projects: [
      { id: 'project-a', name: 'Geral' },
      { id: 'project-b', name: 'Geral' },
    ],
  } as ReturnType<typeof useProjects>);
  jest
    .mocked(requestQrCameraPermission)
    .mockReset()
    .mockResolvedValue('granted');
  jest
    .mocked(qrScanner.scan)
    .mockReset()
    .mockResolvedValue({ kind: 'payload', payload: fixture });
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await act(async () => {
    renderer = TestRenderer.create(<NewTaskScreen />);
  });
});
afterEach(async () => {
  await act(async () => renderer.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});
test('não pede CAMERA ao abrir; só aplica depois de confirmar e só persiste após Criar tarefa', async () => {
  expect(requestQrCameraPermission).not.toHaveBeenCalled();
  expect(control('Escanear QR Code').props.accessibilityRole).toBe('button');
  await press('Escanear QR Code');
  expect(requestQrCameraPermission).toHaveBeenCalledTimes(1);
  expect(input('Título').props.value).toBe('');
  expect(create).not.toHaveBeenCalled();
  await confirm('Usar dados');
  expect(input('Título').props.value).toBe('QA66 QR');
  expect(input('Descrição').props.value).toBe('Material');
  expect(control('Média').props.accessibilityState.selected).toBe(true);
  expect(create).not.toHaveBeenCalled();
  await type('Título', 'Revisado pela pessoa');
  await press('Criar tarefa');
  expect(create).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Revisado pela pessoa',
      description: 'Material',
      priority: 'medium',
      projectId: 'project-a',
      dueDate: expect.stringContaining('2026-11-20'),
    }),
  );
  expect(create.mock.calls[0][0]).not.toHaveProperty('source');
  expect(create.mock.calls[0][0]).not.toHaveProperty('rawPayload');
});
test('cancelar confirmação preserva campos existentes e Project selecionado por ID', async () => {
  await type('Título', 'Manual');
  await type('Descrição', 'Preservar');
  await press('Selecionar projeto: Geral');
  const projects = renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel === 'Projeto: Geral',
  );
  await act(async () => projects[1].props.onPress());
  await press('Escanear QR Code');
  expect(alert.mock.calls.at(-1)![1]).toContain('substituirão');
  await confirm('Cancelar');
  expect(input('Título').props.value).toBe('Manual');
  expect(input('Descrição').props.value).toBe('Preservar');
  await press('Criar tarefa');
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Manual', projectId: 'project-b' }),
  );
});
test('cancelar scanner é normal e não apaga formulário', async () => {
  await type('Título', 'Manual');
  jest.mocked(qrScanner.scan).mockResolvedValueOnce({ kind: 'cancelled' });
  await press('Escanear QR Code');
  expect(alert).not.toHaveBeenCalled();
  expect(input('Título').props.value).toBe('Manual');
  expect(create).not.toHaveBeenCalled();
});
test('permissão negada mantém a criação manual', async () => {
  await type('Título', 'Manual');
  jest.mocked(requestQrCameraPermission).mockResolvedValueOnce('denied');
  await press('Escanear QR Code');
  expect(qrScanner.scan).not.toHaveBeenCalled();
  expect(alert.mock.calls.at(-1)![1]).toContain('manualmente');
  await press('Criar tarefa');
  expect(create).toHaveBeenCalledTimes(1);
});
test('Configurações só abrem por ação explícita após bloqueio', async () => {
  const settings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  jest.mocked(requestQrCameraPermission).mockResolvedValueOnce('blocked');
  await press('Escanear QR Code');
  expect(settings).not.toHaveBeenCalled();
  await confirm('Abrir configurações');
  expect(settings).toHaveBeenCalledTimes(1);
  expect(create).not.toHaveBeenCalled();
});
test.each([
  'https://example.com',
  '{"version":2,"title":"Future"}',
  '{"version":1,"title":"A","projectId":"attacker"}',
])(
  'payload incompatível não altera formulário nem abre URL: %s',
  async payload => {
    const browser = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    await type('Título', 'Manual');
    jest
      .mocked(qrScanner.scan)
      .mockResolvedValueOnce({ kind: 'payload', payload });
    await press('Escanear QR Code');
    expect(alert.mock.calls.at(-1)![0]).toBe('QR Code não compatível');
    expect(input('Título').props.value).toBe('Manual');
    expect(browser).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  },
);
test('avisos de datas/prioridade deixam os valores atuais disponíveis para revisão', async () => {
  await press('Alta');
  jest.mocked(qrScanner.scan).mockResolvedValueOnce({
    kind: 'payload',
    payload: JSON.stringify({
      version: 1,
      title: 'Revisar',
      dueDate: '2026-02-31',
      priority: 'urgent',
    }),
  });
  await press('Escanear QR Code');
  expect(alert.mock.calls.at(-1)![1]).toContain('Prioridade inválida');
  expect(alert.mock.calls.at(-1)![1]).toContain('Prazo inválido');
  await confirm('Usar dados');
  expect(control('Alta').props.accessibilityState.selected).toBe(true);
  expect(JSON.stringify(renderer.toJSON())).toContain('Prioridade inválida');
  expect(create).not.toHaveBeenCalled();
});
test('duplo toque abre um único scanner; payload após blur é ignorado', async () => {
  let resolve!: (value: { kind: 'payload'; payload: string }) => void;
  jest.mocked(qrScanner.scan).mockImplementationOnce(
    () =>
      new Promise(yes => {
        resolve = yes;
      }),
  );
  let first!: Promise<void>;
  await act(async () => {
    first = control('Escanear QR Code').props.onPress();
  });
  await press('Escanear QR Code');
  expect(qrScanner.scan).toHaveBeenCalledTimes(1);
  await act(async () => mockBlur());
  await act(async () => {
    resolve({ kind: 'payload', payload: fixture });
    await first;
  });
  expect(input('Título').props.value).toBe('');
  expect(alert).not.toHaveBeenCalled();
  expect(qrScanner.cancel).toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
});
test('confirmação antiga após sair da rota não aplica draft', async () => {
  await press('Escanear QR Code');
  const apply = alert.mock.calls.at(-1)![2][1].onPress;
  await act(async () => mockBlur());
  await act(async () => apply());
  expect(input('Título').props.value).toBe('');
  expect(create).not.toHaveBeenCalled();
});
test('câmera indisponível informa erro sem perder campos e permite nova tentativa', async () => {
  await type('Título', 'Manual');
  jest
    .mocked(qrScanner.scan)
    .mockRejectedValueOnce(new Error('Câmera ocupada'));
  await press('Escanear QR Code');
  expect(alert).toHaveBeenLastCalledWith(
    'Leitura de QR Code',
    'Câmera ocupada',
  );
  expect(input('Título').props.value).toBe('Manual');
  await press('Escanear QR Code');
  expect(qrScanner.scan).toHaveBeenCalledTimes(2);
  await confirm('Usar dados');
  expect(create).not.toHaveBeenCalled();
});
