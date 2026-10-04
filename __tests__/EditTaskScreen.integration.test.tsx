import React from 'react';
import { Alert, TextInput } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import EditTaskScreen from '../src/screens/EditTaskScreen';
import { useTasks } from '../src/context/TaskContext';
import { useProjects } from '../src/context/ProjectContext';

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn(), reset: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation, useRoute: () => ({ params: { taskId: 'task' } }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('@react-native-community/datetimepicker', () => () => null);
jest.mock('../src/context/TaskContext', () => ({ useTasks: jest.fn() }));
jest.mock('../src/context/ProjectContext', () => ({ useProjects: jest.fn() }));
const task = { id: 'task', title: 'Original', description: 'Descrição', projectId: 'remote-a', project: 'Mesmo nome', priority: 'medium' as const, status: 'todo' as const, done: false, startDate: new Date(2026, 8, 1).toISOString(), dueDate: new Date(2026, 8, 3).toISOString(), time: '10:00' };
const projects = [{ id: 'a', remoteId: 'remote-a', name: 'Mesmo nome', color: '#fff', icon: 'P' }, { id: 'b', remoteId: 'remote-b', name: 'Mesmo nome', color: '#000', icon: 'P' }];
const patch = jest.fn();
let renderer: ReactTestRenderer.ReactTestRenderer;
let alert: jest.SpyInstance;
const button = (text: string) => renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => node.findAll(child => String(child.type) === 'Text').some(child => child.props.children === text))!;
beforeEach(async () => {
  patch.mockReset().mockResolvedValue({ task, cacheSaved: true });
  jest.mocked(useTasks).mockReturnValue({ tasks: [task], updateTask: patch, deleteTask: jest.fn() } as unknown as ReturnType<typeof useTasks>);
  jest.mocked(useProjects).mockReturnValue({ projects } as ReturnType<typeof useProjects>);
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await act(async () => { renderer = ReactTestRenderer.create(<EditTaskScreen />); });
});
afterEach(async () => { await act(async () => renderer.unmount()); jest.restoreAllMocks(); jest.clearAllMocks(); });

it('aguarda PATCH e impede sucesso/navegação antecipados', async () => {
  let finish!: (result: { task: typeof task; cacheSaved: boolean }) => void;
  patch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  let pending!: Promise<void>;
  await act(async () => { pending = button('✓ Salvar alterações').props.onPress(); });
  expect(alert).not.toHaveBeenCalled();
  expect(mockNavigation.goBack).not.toHaveBeenCalled();
  expect(button('Salvando…').props.disabled).toBe(true);
  await act(async () => { finish({ task, cacheSaved: true }); await pending; });
  expect(alert).toHaveBeenCalledWith('Alterações salvas', 'A tarefa foi atualizada com sucesso.', expect.any(Array));
  expect(mockNavigation.goBack).not.toHaveBeenCalled();
  alert.mock.calls[0][2][0].onPress();
  expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
});
it('falha de PATCH informa erro e não navega como se estivesse salvo', async () => {
  patch.mockRejectedValue(new Error('Backend indisponível'));
  await act(async () => { await button('✓ Salvar alterações').props.onPress(); });
  expect(alert).toHaveBeenCalledWith('Não foi possível salvar', 'Backend indisponível');
  expect(mockNavigation.goBack).not.toHaveBeenCalled();
  expect(button('✓ Salvar alterações').props.disabled).toBe(false);
});
it('seleção de projetos homônimos usa ID e preserva início antigo inalterado', async () => {
  const choices = renderer.root.findAll(node => typeof node.props.onPress === 'function').filter(node => node.findAll(child => String(child.type) === 'Text').some(child => child.props.children === 'Mesmo nome'));
  await act(async () => { choices[1].props.onPress(); });
  await act(async () => { await button('✓ Salvar alterações').props.onPress(); });
  expect(patch).toHaveBeenCalledWith('task', expect.objectContaining({ projectId: 'b', startDate: task.startDate }));
  expect(patch.mock.calls[0][1]).not.toHaveProperty('project');
});
it('horário inválido é rejeitado sem enviar PATCH', async () => {
  const input = renderer.root.findAllByType(TextInput).find(node => node.props.value === '10:00')!;
  await act(async () => { input.props.onChangeText('25:00'); });
  await act(async () => { await button('✓ Salvar alterações').props.onPress(); });
  expect(patch).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalledWith('Horário inválido', expect.any(String));
});
