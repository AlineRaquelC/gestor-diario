import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import TaskDetailsScreen from '../src/screens/TaskDetailsScreen';
import { useTasks } from '../src/context/TaskContext';
const mockNavigation = { navigate: jest.fn(), goBack: jest.fn(), reset: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation, useRoute: () => ({ params: { taskId: 'task' } }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../src/context/TaskContext', () => ({ useTasks: jest.fn() }));
const task = { id: 'task', title: 'Tarefa real', project: 'Projeto real', priority: 'low', status: 'todo', done: false, progress: 0, updatedAt: '2026-10-04T12:00:00Z' };
const load = jest.fn();
const toggle = jest.fn();
let renderer: ReactTestRenderer.ReactTestRenderer;
const text = () => JSON.stringify(renderer.toJSON());
async function mount(events: unknown[] = []) {
  jest.mocked(useTasks).mockReturnValue({ tasks: [task], loading: false, taskHistory: { task: events }, loadTaskHistory: load, toggleTask: toggle, updateTaskLocal: jest.fn(), deleteTask: jest.fn(), loadTaskById: jest.fn() } as unknown as ReturnType<typeof useTasks>);
  await act(async () => { renderer = ReactTestRenderer.create(<TaskDetailsScreen />); });
}
beforeEach(() => { load.mockReset().mockResolvedValue(undefined); toggle.mockReset(); });
afterEach(async () => { await act(async () => renderer.unmount()); jest.restoreAllMocks(); jest.clearAllMocks(); });
it('mostra eventos reais e suas datas; não usa atividade fictícia', async () => {
  const date = '2026-10-04T12:34:00Z';
  await mount([{ id: 'h', taskId: 'task', action: 'CREATED', metadata: {}, createdAt: date }]);
  expect(load).toHaveBeenCalledWith('task');
  expect(text()).toContain('Tarefa criada');
  expect(text()).toContain(new Date(date).toLocaleString('pt-BR'));
  expect(text()).not.toContain('Configurar ambiente');
  expect(text()).not.toContain('Criar backlog');
  expect(text()).not.toContain('por Aline');
  expect(text()).not.toContain('Hoje, 14:22');
});
it('histórico vazio apresenta estado vazio, mantendo detalhes', async () => {
  await mount();
  expect(text()).toContain('Nenhuma atividade registrada.');
  expect(text()).toContain('Tarefa real');
});
it('falha de histórico não esconde tarefa nem inventa estado vazio', async () => {
  load.mockRejectedValue(new Error('offline'));
  await mount();
  expect(text()).toContain('Não foi possível carregar a atividade.');
  expect(text()).toContain('Tarefa real');
  expect(text()).not.toContain('Nenhuma atividade registrada.');
});
it('histórico mostra loading enquanto aguarda consulta', async () => {
  let finish!: () => void;
  load.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  await mount();
  expect(text()).toContain('Carregando atividade…');
  await act(async () => { finish(); });
  expect(text()).toContain('Nenhuma atividade registrada.');
});
it('falha de conclusão informa erro e não exibe conclusão falsa', async () => {
  toggle.mockRejectedValue(new Error('offline'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await mount();
  const button = renderer.root.findAll(node => typeof node.props.onPress === 'function')
    .find(node => node.findAll(child => String(child.type) === 'Text').some(child => child.props.children === '✓ Concluir tarefa'))!;
  await act(async () => { await button.props.onPress(); });
  expect(toggle).toHaveBeenCalledWith('task');
  expect(alert).toHaveBeenCalledWith('Não foi possível alterar o status', 'offline');
  expect(text()).not.toContain('Tarefa concluída!');
  expect(mockNavigation.navigate).not.toHaveBeenCalled();
});
