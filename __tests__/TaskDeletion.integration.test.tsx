import React from 'react';
import { Alert } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import TaskDetailsScreen from '../src/screens/TaskDetailsScreen';
import EditTaskScreen from '../src/screens/EditTaskScreen';
import TaskUndoFeedback from '../src/components/TaskUndoFeedback';
import { useTasks } from '../src/context/TaskContext';
import { useProjects } from '../src/context/ProjectContext';
const mockNavigation = { reset: jest.fn(), navigate: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation, useRoute: () => ({ params: { taskId: 'task' } }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('@react-native-community/datetimepicker', () => () => null);
jest.mock('../src/context/TaskContext', () => ({ useTasks: jest.fn() }));
jest.mock('../src/context/ProjectContext', () => ({ useProjects: jest.fn() }));
jest.mock('../src/components/TaskNotesSection', () => () => null);
const task = { id: 'task', title: 'Excluir com segurança', project: 'Geral', priority: 'low', status: 'todo', done: false };
let renderer: TestRenderer.ReactTestRenderer;
let alert: jest.SpyInstance;
const remove = jest.fn(); const restore = jest.fn();
const context = () => ({ tasks: [task], loading: false, deleteTask: remove, restoreTask: restore, taskHistory: {}, loadTaskHistory: jest.fn().mockResolvedValue(undefined), loadTaskById: jest.fn(), undo: { id: 'task', expiresAt: Date.now() + 5000 } });
async function mount(element: React.ReactElement) { await act(async () => { renderer = TestRenderer.create(element); }); }
const button = (label: string) => renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => node.findAll(child => String(child.type) === 'Text').some(child => child.props.children === label))!;
beforeEach(() => {
  remove.mockReset().mockResolvedValue({ cacheSaved: true }); restore.mockReset().mockResolvedValue({ task, cacheSaved: true });
  jest.mocked(useTasks).mockReturnValue(context() as unknown as ReturnType<typeof useTasks>);
  jest.mocked(useProjects).mockReturnValue({ projects: [] } as unknown as ReturnType<typeof useProjects>);
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(async () => { if (renderer) {await act(async () => renderer.unmount());} jest.restoreAllMocks(); jest.clearAllMocks(); });

it.each([['Detalhes', TaskDetailsScreen, 'Excluir'], ['Edição', EditTaskScreen, 'Excluir tarefa']] as const)('%s confirma antes de DELETE; Cancelar não altera estado nem chama API', async (_name, Screen, label) => {
  await mount(<Screen />);
  await act(async () => button(label).props.onPress());
  expect(alert).toHaveBeenCalledWith('Excluir tarefa?', 'Tem certeza que deseja excluir esta tarefa?', expect.any(Array), expect.any(Object));
  expect(remove).not.toHaveBeenCalled();
  await act(async () => alert.mock.calls[0][2][0].onPress());
  expect(remove).not.toHaveBeenCalled(); expect(mockNavigation.reset).not.toHaveBeenCalled();
});
it.each([['Detalhes', TaskDetailsScreen, 'Excluir'], ['Edição', EditTaskScreen, 'Excluir tarefa']] as const)('%s aguarda confirmação da API, bloqueia duplo clique e navega só após sucesso', async (_name, Screen, label) => {
  let finish!: () => void;
  remove.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({ cacheSaved: true }); }));
  await mount(<Screen />);
  await act(async () => { button(label).props.onPress(); button(label).props.onPress(); });
  expect(alert).toHaveBeenCalledTimes(1);
  const confirm = alert.mock.calls[0][2][1].onPress;
  let pending!: Promise<void>;
  await act(async () => { pending = confirm(); await confirm(); });
  expect(remove).toHaveBeenCalledTimes(1); expect(remove).toHaveBeenCalledWith('task');
  expect(mockNavigation.reset).not.toHaveBeenCalled();
  await act(async () => { finish(); await pending; });
  expect(mockNavigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Home' }] });
});
it.each([['Detalhes', TaskDetailsScreen, 'Excluir'], ['Edição', EditTaskScreen, 'Excluir tarefa']] as const)('%s apresenta erro e mantém tela quando API está offline', async (_name, Screen, label) => {
  remove.mockRejectedValueOnce(new Error('Backend indisponível'));
  await mount(<Screen />); await act(async () => button(label).props.onPress());
  await act(async () => alert.mock.calls[0][2][1].onPress());
  expect(mockNavigation.reset).not.toHaveBeenCalled();
  expect(alert).toHaveBeenLastCalledWith('Não foi possível excluir', 'Backend indisponível');
  expect(JSON.stringify(renderer.toJSON())).toContain(task.title);
});
it('feedback apresenta texto e DESFAZER; usa ID correto e bloqueia cliques rápidos', async () => {
  let finish!: () => void;
  restore.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({ task, cacheSaved: true }); }));
  await mount(<TaskUndoFeedback />);
  expect(JSON.stringify(renderer.toJSON())).toContain('Tarefa excluída');
  const press = button('DESFAZER').props.onPress;
  let pending!: Promise<void>;
  await act(async () => { pending = press(); await press(); });
  expect(restore).toHaveBeenCalledTimes(1); expect(restore).toHaveBeenCalledWith('task');
  expect(button('Restaurando…').props.disabled).toBe(true);
  await act(async () => { finish(); await pending; });
  expect(alert).not.toHaveBeenCalled();
});
it('erro do restore informa falha sem fabricar tarefa; sem undo não mostra feedback', async () => {
  restore.mockRejectedValueOnce(new Error('offline'));
  await mount(<TaskUndoFeedback />);
  await act(async () => button('DESFAZER').props.onPress());
  expect(alert).toHaveBeenCalledWith('Não foi possível desfazer', 'offline');
  jest.mocked(useTasks).mockReturnValue({ ...context(), undo: null } as unknown as ReturnType<typeof useTasks>);
  await act(async () => renderer.update(<TaskUndoFeedback />));
  expect(renderer.toJSON()).toBeNull();
});
it('Edição continua renderizando sem erro de hooks quando exclusão remove Task do Context', async () => {
  await mount(<EditTaskScreen />);
  jest.mocked(useTasks).mockReturnValue({ ...context(), tasks: [] } as unknown as ReturnType<typeof useTasks>);
  await act(async () => renderer.update(<EditTaskScreen />));
  expect(JSON.stringify(renderer.toJSON())).toContain('Tarefa não encontrada');
});
