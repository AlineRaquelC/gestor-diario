import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProjectProvider, useProjects } from '../src/context/ProjectContext';
import { TaskProvider, useTasks } from '../src/context/TaskContext';
import { synchronize } from '../src/services/syncService';
import { getTasks } from '../src/services/taskService';
import { deleteProject } from '../src/services/projectService';
import SettingsScreen from '../src/screens/SettingsScreen';
import { dataGuard } from '../src/services/dataGuard';
import type { Task } from '../src/context/TaskContext';
import type { SyncResult } from '../src/services/syncService';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../src/services/syncService', () => ({ ...jest.requireActual('../src/services/syncService'), synchronize: jest.fn() }));
jest.mock('../src/services/taskService', () => ({ ...jest.requireActual('../src/services/taskService'), getTasks: jest.fn() }));
jest.mock('../src/services/projectService', () => ({ ...jest.requireActual('../src/services/projectService'), deleteProject: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../src/components/BottomNavigation', () => () => null);
const storage = new Map<string, string>();
const project = { id: 'lp', name: 'Legado A', color: '#fff', icon: 'P' };
const task: Task = { id: 'lt', projectId: 'lp', project: project.name, title: 'A1', status: 'todo', priority: 'high', done: false, startDate: '2026-10-21', dueDate: '2026-10-21' };
const result: SyncResult = { projects: [{ ...project, remoteId: 'rp' }], tasks: [{ ...task, id: 'rt', localId: 'lt', remoteId: 'rt', projectId: 'rp' }], pending: 0, projectsSent: 1, tasksSent: 1, conflicts: 0 };
let tasksContext: ReturnType<typeof useTasks>, projectsContext: ReturnType<typeof useProjects>;
let renderer: ReactTestRenderer.ReactTestRenderer;
function Probe() {tasksContext = useTasks(); projectsContext = useProjects(); return <SettingsScreen />;}
async function mount() {await act(async () => {renderer = ReactTestRenderer.create(<ProjectProvider><TaskProvider><Probe /></TaskProvider></ProjectProvider>);});}
const button = () => renderer.root.findAll(node => node.props.accessibilityLabel === 'Sincronizar' && typeof node.props.onPress === 'function')[0];
const screenText = () => renderer.root.findAllByType(Text).map(node => node.props.children).join(' ');
beforeEach(async () => {
  jest.clearAllMocks();
  jest.mocked(synchronize).mockReset();
  jest.mocked(AsyncStorage.setItem).mockReset();
  jest.mocked(deleteProject).mockReset(); storage.clear(); dataGuard.syncing = false; dataGuard.deletingProject = false; dataGuard.activeTasks = 0;
  storage.set('@taskflow:projects', JSON.stringify([project])); storage.set('@taskflow:tasks', JSON.stringify([task]));
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {storage.set(key, value);});
  jest.mocked(getTasks).mockResolvedValue([]); jest.mocked(synchronize).mockResolvedValue(result);
  jest.mocked(deleteProject).mockResolvedValue(undefined);
  await mount();
});
afterEach(async () => {await act(async () => renderer.unmount()); expect(dataGuard.syncing).toBe(false);});
it('ação explícita publica Context somente após cache consolidado confirmado', async () => {
  expect(synchronize).not.toHaveBeenCalled();
  const save = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
    if (key === '@taskflow:tasks' && value.includes('"rt"')) {expect(tasksContext.tasks[0].id).toBe('lt');}
    return save(key, value);
  });
  await act(async () => {await button().props.onPress();});
  expect(screenText()).toContain('Sincronização concluída');
  expect(tasksContext.tasks).toEqual(result.tasks); expect(projectsContext.projects).toEqual(result.projects);
  expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual(result.tasks);
  expect(JSON.parse(storage.get('@taskflow:projects')!)).toEqual(result.projects);
});
it('fechar/reabrir mantém projetos, tarefas e IDs sem duplicação', async () => {
  await act(async () => {await tasksContext.synchronizeManually();});
  await act(async () => renderer.unmount()); await mount();
  expect(tasksContext.tasks).toHaveLength(1); expect(tasksContext.tasks[0]).toMatchObject({ id: 'rt', remoteId: 'rt', projectId: 'rp' });
  expect(projectsContext.projects[0]).toMatchObject({ id: 'lp', remoteId: 'rp' });
});
it('offline mostra falha compreensível, mantém Context/cache e permite retorno da API', async () => {
  const before = new Map(storage); jest.mocked(synchronize).mockRejectedValueOnce(new Error('Verifique a conexão e o backend.'));
  await act(async () => {await button().props.onPress();});
  expect(screenText()).toContain('Falha na sincronização'); expect(screenText()).not.toContain('Sincronização concluída');
  expect(storage).toEqual(before); expect(tasksContext.tasks[0].id).toBe('lt');
  await act(async () => {await button().props.onPress();}); expect(screenText()).toContain('Sincronização concluída');
});
it.each(['@taskflow:projects', '@taskflow:tasks'])('falha no cache %s não publica estado nem sucesso', async keyToFail => {
  const save = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
    if (key === keyToFail) {throw new Error('Falha de armazenamento');} return save(key, value);
  });
  await act(async () => {await button().props.onPress();});
  expect(screenText()).toContain('Falha na sincronização'); expect(tasksContext.tasks[0].id).toBe('lt');
  expect(projectsContext.projects[0]).toEqual(project); expect(JSON.parse(storage.get('@taskflow:tasks')!)[0].id).toBe('lt');
});
it('trava imediata bloqueia cliques simultâneos e mutações durante sync', async () => {
  let finish!: (value: SyncResult) => void;
  jest.mocked(synchronize).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  let pending!: Promise<unknown>;
  await act(async () => {pending = tasksContext.synchronizeManually();});
  expect(tasksContext.syncing).toBe(true); expect(button().props.disabled).toBe(true); expect(screenText()).toContain('Sincronizando...');
  await expect(tasksContext.synchronizeManually()).rejects.toThrow(/andamento/);
  await expect(tasksContext.deleteTask(task.id)).rejects.toThrow(/andamento/);
  expect(() => projectsContext.addProject({ ...project, id: 'other' })).toThrow(/andamento/);
  await act(async () => {finish(result); await pending;});
  expect(synchronize).toHaveBeenCalledTimes(1); expect(tasksContext.syncing).toBe(false);
});
it('pendências são informadas sem anunciar conclusão completa', async () => {
  jest.mocked(synchronize).mockResolvedValueOnce({ ...result, pending: 2 });
  await act(async () => {await button().props.onPress();});
  expect(screenText()).toContain('2 pendência(s)'); expect(screenText()).not.toContain('Sincronização concluída');
});
it.each(['@taskflow:projects', '@taskflow:tasks'])('cache inválido em %s bloqueia sync e preserva original', async key => {
  await act(async () => renderer.unmount()); storage.set(key, 'INVALID'); await mount();
  await act(async () => {await expect(tasksContext.synchronizeManually()).rejects.toThrow(/seguro/);});
  expect(synchronize).not.toHaveBeenCalled(); expect(storage.get(key)).toBe('INVALID');
});
it('excluir projeto com tarefas é bloqueado, preservando vínculo e sem chamar API', async () => {
  await act(async () => {await expect(projectsContext.deleteProject('lp')).rejects.toThrow(/vinculadas/);});
  expect(deleteProject).not.toHaveBeenCalled(); expect(projectsContext.projects).toEqual([project]);
  expect(tasksContext.tasks[0].projectId).toBe('lp');
});
it('exclusão remota com falha preserva projeto e não move tarefas para Geral', async () => {
  await act(async () => renderer.unmount()); storage.set('@taskflow:projects', JSON.stringify([{ ...project, remoteId: 'rp' }]));
  storage.set('@taskflow:tasks', '[]'); await mount();
  jest.mocked(deleteProject).mockRejectedValueOnce(new Error('Projeto possui tarefas excluídas no servidor'));
  await act(async () => {await expect(projectsContext.deleteProject('lp')).rejects.toThrow(/excluídas/);});
  expect(projectsContext.projects).toHaveLength(1); expect(tasksContext.tasks).toEqual([]);
});
it('exclusão de projeto remoto sem dependências confirma API e cache antes de remover', async () => {
  await act(async () => renderer.unmount()); storage.set('@taskflow:projects', JSON.stringify([{ ...project, remoteId: 'rp' }]));
  storage.set('@taskflow:tasks', '[]'); await mount();
  await act(async () => {await projectsContext.deleteProject('lp');});
  expect(deleteProject).toHaveBeenCalledWith('rp'); expect(projectsContext.projects).toEqual([]);
  expect(storage.get('@taskflow:projects')).toBe('[]');
});
