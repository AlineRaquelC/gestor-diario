import React from 'react';
import { Alert, Text, TextInput } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '../src/screens/HomeScreen';
import { TaskProvider, useTasks } from '../src/context/TaskContext';
import type { Task } from '../src/context/TaskContext';
import { ProjectProvider } from '../src/context/ProjectContext';
import { getTasks, searchTasks, updateTask } from '../src/services/taskService';
import { createTaskNote, getTaskNotes } from '../src/services/noteService';
import { materializeRecurrences } from '../src/services/recurrenceService';
import { reminderScheduler } from '../src/services/reminderScheduler';
const mockNavigation = { navigate: jest.fn(), addListener: jest.fn((_event: string, _callback: () => void) => () => undefined) };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../src/services/noteService', () => ({ ...jest.requireActual('../src/services/noteService'), createTaskNote: jest.fn(), getTaskNotes: jest.fn() }));
jest.mock('../src/services/taskService', () => ({ ...jest.requireActual('../src/services/taskService'), getTasks: jest.fn(), searchTasks: jest.fn(), updateTask: jest.fn() }));
jest.mock('../src/services/recurrenceService', () => ({ ...jest.requireActual('../src/services/recurrenceService'), materializeRecurrences: jest.fn() }));
jest.mock('../src/services/reminderScheduler', () => ({ ...jest.requireActual('../src/services/reminderScheduler'), reminderScheduler: { reconcile: jest.fn(), retry: jest.fn() } }));
const tasks: Task[] = [
  { id: 'a', remoteId: 'a', title: 'Marketing alpha', description: 'Cliente especial', favorite: false, projectId: 'remote-a', project: 'Mesmo nome', status: 'todo', done: false, priority: 'high', startDate: '2026-11-07', dueDate: '2026-11-07', dueDateKey: '2026-11-07', reminders: [], updatedAt: '2026-11-07T12:00:00Z' },
  { id: 'b', remoteId: 'b', title: 'Beta', favorite: true, projectId: 'remote-b', project: 'Mesmo nome', status: 'in_progress', done: false, priority: 'low', dueDate: '2026-11-08', dueDateKey: '2026-11-08', reminders: [], updatedAt: '2026-11-07T12:00:00Z' },
];
const projects = ['a', 'b'].map(id => ({ id, remoteId: `remote-${id}`, name: 'Mesmo nome', color: '#fff', icon: 'P' }));
let context: ReturnType<typeof useTasks>;
let renderer: Renderer.ReactTestRenderer;
const storage = new Map<string, string>();
function Probe() { context = useTasks(); return <HomeScreen />; }
async function mount() { await act(async () => { renderer = Renderer.create(<ProjectProvider><TaskProvider><Probe /></TaskProvider></ProjectProvider>); }); }
const controls = (label: string) => renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label);
async function press(label: string, index = 0) { expect(controls(label)[index]).toBeDefined(); await act(async () => { await controls(label)[index].props.onPress({ stopPropagation: jest.fn() }); }); }
async function pressText(label: string) {
  const control = renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => node.findAllByType(Text).some(child => child.props.children === label));
  expect(control).toBeDefined(); await act(async () => { await control!.props.onPress(); });
}
async function type(value: string, label = 'Buscar tarefas') { await act(async () => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!.props.onChangeText(value)); }
async function tick(ms = 300) { await act(async () => { jest.advanceTimersByTime(ms); }); }
const ids = () => renderer.root.findAll(node => typeof node.type === 'function' && node.type.name === 'TaskCard').map(node => node.props.task.id);
const text = () => JSON.stringify(renderer.toJSON());
beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 10, 7, 12)); jest.clearAllMocks();
  storage.clear(); storage.set('@taskflow:tasks', JSON.stringify(tasks)); storage.set('@taskflow:projects', JSON.stringify(projects));
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.mocked(getTasks).mockResolvedValue(tasks);
  jest.mocked(searchTasks).mockResolvedValue(tasks);
  jest.mocked(updateTask).mockImplementation(async (id, changes) => ({ ...tasks.find(task => task.id === id)!, ...changes, updatedAt: '2026-11-07T13:00:00Z' } as Task));
  jest.mocked(materializeRecurrences).mockResolvedValue(undefined);
  jest.mocked(reminderScheduler.reconcile).mockResolvedValue({ state: 'not_required' });
  jest.mocked(reminderScheduler.retry).mockResolvedValue({ state: 'not_required' });
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await mount();
});
afterEach(async () => { await act(async () => renderer.unmount()); jest.useRealTimers(); jest.restoreAllMocks(); });
it('debounce, Note remota, mapper/Context parcial e navegação pelo ID correto', async () => {
  const count = jest.mocked(materializeRecurrences).mock.calls.length;
  const schedules = jest.mocked(reminderScheduler.reconcile).mock.calls.length;
  jest.mocked(searchTasks).mockResolvedValueOnce([tasks[1]]);
  await type('cli'); await tick(150); await type('cliente'); await tick(299);
  expect(searchTasks).not.toHaveBeenCalled(); expect(ids()).toEqual(['a', 'b']);
  expect(text()).toContain('Atualizando resultados');
  await tick(1); expect(searchTasks).toHaveBeenCalledWith('cliente'); expect(ids()).toEqual(['b']);
  expect(context.tasks).toHaveLength(2); expect(JSON.parse(storage.get('@taskflow:tasks')!)).toHaveLength(2);
  await press('Abrir tarefa: Beta'); expect(mockNavigation.navigate).toHaveBeenCalledWith('DetalheTarefa', { taskId: 'b' });
  expect(materializeRecurrences).toHaveBeenCalledTimes(count); expect(reminderScheduler.reconcile).toHaveBeenCalledTimes(schedules);
  await type('  '); expect(ids()).toEqual(['a', 'b']); expect(searchTasks).toHaveBeenCalledTimes(1);
});
it('resposta de mar chegando depois de marketing não muda resultados nem cache', async () => {
  let old!: (value: Task[]) => void;
  jest.mocked(searchTasks).mockImplementationOnce(() => new Promise(resolve => { old = resolve; })).mockResolvedValueOnce([tasks[0]]);
  await type('mar'); await tick(); await type('marketing'); await tick();
  expect(ids()).toEqual(['a']);
  await act(async () => old([{ ...tasks[1], id: 'stale', remoteId: 'stale' }]));
  expect(ids()).toEqual(['a']); expect(context.tasks.some(task => task.id === 'stale')).toBe(false);
});
it('erro tardio ignorado; falha atual mantém cache e fallback honesto em título/descrição', async () => {
  let rejectOld!: (error: Error) => void;
  jest.mocked(searchTasks).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject; })).mockResolvedValueOnce([tasks[1]]);
  await type('mar'); await tick(); await type('beta'); await tick();
  await act(async () => rejectOld(new Error('Velha'))); expect(text()).not.toContain('Velha'); expect(ids()).toEqual(['b']);
  jest.mocked(searchTasks).mockRejectedValueOnce(new Error('Offline'));
  await type('cliente'); await tick(); expect(ids()).toEqual(['a']); expect(text()).toContain('Observações indisponíveis sem conexão');
  expect(context.tasks).toHaveLength(2);
  jest.mocked(searchTasks).mockRejectedValueOnce(new Error('Offline'));
  await type('não existe'); await tick(); expect(text()).toContain('Nenhuma tarefa local encontrada'); expect(context.tasks).toHaveLength(2);
});
it('favorite canônico, filtro dedicado + filtros, falha preserva estrela e reabertura mantém', async () => {
  await press('Favoritar: Marketing alpha'); expect(updateTask).toHaveBeenCalledWith('a', { favorite: true }, expect.any(Object));
  expect(context.tasks[0].favorite).toBe(true); expect(JSON.parse(storage.get('@taskflow:tasks')!)[0].favorite).toBe(true);
  await press('Favoritas'); expect(ids()).toEqual(['a', 'b']);
  await press('Filtrar tarefas'); await press('Prioridade: Alta');
  await pressText('Aplicar filtros');
  expect(ids()).toEqual(['a']);
  jest.mocked(updateTask).mockRejectedValueOnce(new Error('Sem conexão'));
  await press('Remover dos favoritos: Marketing alpha'); expect(context.tasks[0].favorite).toBe(true); expect(Alert.alert).toHaveBeenCalledWith('Não foi possível alterar favorito', 'Sem conexão');
  const saved = context.tasks; jest.mocked(getTasks).mockResolvedValue(saved);
  await act(async () => renderer.unmount()); await mount(); expect(context.tasks[0].favorite).toBe(true);
  await press('Remover dos favoritos: Marketing alpha'); expect(context.tasks[0].favorite).toBe(false);
});
it('saved filter aplica só snapshot: busca/sorting/favoritas permanecem; excluir não limpa ativos', async () => {
  await type('cliente'); await tick(); await press('Favoritas'); expect(ids()).toEqual(['b']);
  await press('Filtrar tarefas'); await press('Prioridade: Baixa');
  await pressText('Aplicar filtros');
  await press('Ordenar tarefas'); await press('Ordenação: Prazo'); await pressText('Aplicar ordenação');
  await press('Filtros salvos'); await type('  Meu filtro  ', 'Nome do filtro salvo'); await press('Salvar filtro atual'); await press('Fechar filtros salvos');
  await press('Limpar filtros e ordenação');
  await press('Ordenar tarefas'); await press('Ordenação: Prioridade'); await pressText('Aplicar ordenação');
  await press('Filtros salvos'); await press('Aplicar filtro: Meu filtro');
  expect(ids()).toEqual(['b']); expect(renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Buscar tarefas')!.props.value).toBe('cliente');
  expect(controls('Favoritas')[0].props.accessibilityState.selected).toBe(true);
  expect(controls('Ordenar tarefas')[0].props.accessibilityState.selected).toBe(true);
  await press('Filtros salvos'); await press('Excluir filtro: Meu filtro'); await press('Fechar filtros salvos');
  expect(ids()).toEqual(['b']); expect(controls('Filtrar tarefas, 1 filtro ativo')).toHaveLength(1);
});
it('filtro salvo reaparece após reabrir; indisponível preserva ID e não associa homônimo', async () => {
  const saved = { version: 1, items: [{ id: 'stable', name: 'Órfão', filters: { status: 'all', priority: 'all', projectId: 'unavailable', period: 'all' }, createdAt: '2026-11-07T12:00:00Z', updatedAt: '2026-11-07T12:00:00Z' }] };
  storage.set('@taskflow:saved-task-filters:v1', JSON.stringify(saved));
  await act(async () => renderer.unmount()); await mount(); await press('Filtros salvos'); expect(text()).toContain('Projeto indisponível');
  await press('Aplicar filtro: Órfão'); expect(ids()).toEqual([]); expect(context.tasks).toHaveLength(2);
});

it.each([['Status: Parciais', 'b'], ['Prioridade: Alta', 'a'], ['Período: Hoje', 'a']])('busca compõe com filtro existente %s', async (option, id) => {
  await type('com nota'); await tick(); await press('Filtrar tarefas'); await press(option); await pressText('Aplicar filtros');
  expect(ids()).toEqual([id]);
});
it('busca + projeto homônimo por ID e sorting existente', async () => {
  await type('nota'); await tick(); await press('Ordenar tarefas'); await press('Ordenação: Prioridade'); await press('Direção da prioridade: Baixa → alta'); await pressText('Aplicar ordenação');
  expect(ids()).toEqual(['b', 'a']);
  await press('Filtrar tarefas'); await press('Selecionar projeto: Todos os projetos'); await press('Projeto: Mesmo nome', 0); await pressText('Aplicar filtros');
  expect(ids()).toEqual(['a']); expect(context.tasks).toHaveLength(2);
});
it('favorite confirmado com cache failure conserva estado, avisa e não repete PATCH', async () => {
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Disk'));
  await press('Favoritar: Marketing alpha');
  expect(context.tasks[0].favorite).toBe(true); expect(updateTask).toHaveBeenCalledTimes(1);
  expect(Alert.alert).toHaveBeenCalledWith('Favorito salvo no servidor', expect.stringContaining('cache local falhou'));
});
it('busy por Task impede envio duplo e estado só muda após confirmação', async () => {
  let finish!: (value: Task) => void;
  jest.mocked(updateTask).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  let pending!: Promise<void>;
  await act(async () => { pending = controls('Favoritar: Marketing alpha')[0].props.onPress({ stopPropagation: jest.fn() }); });
  expect(context.tasks[0].favorite).toBe(false); expect(controls('Favoritar: Marketing alpha')[0].props.disabled).toBe(true);
  await press('Favoritar: Marketing alpha'); expect(updateTask).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ ...tasks[0], favorite: true }); await pending; });
  expect(context.tasks[0].favorite).toBe(true);
});

it('Notes confirmadas invalidam busca ativa sem GET de Notes por Task', async () => {
  let old!: (value: Task[]) => void;
  jest.mocked(searchTasks).mockImplementationOnce(() => new Promise(resolve => { old = resolve; })).mockResolvedValueOnce([tasks[1]]);
  await type('observação nova'); await tick();
  jest.mocked(createTaskNote).mockResolvedValue({ id: 'note', taskId: 'b', content: 'observação nova', createdAt: '2026-11-07T13:00:00Z', updatedAt: '2026-11-07T13:00:00Z' });
  await act(async () => { await context.addTaskNote('b', 'observação nova'); });
  await tick(); expect(ids()).toEqual(['b']);
  await act(async () => old([])); expect(ids()).toEqual(['b']); expect(getTaskNotes).not.toHaveBeenCalled();
});
it('mesma query repetida não deixa estado preso digitando', async () => {
  await type('cliente'); await tick(); expect(ids()).toEqual(['a', 'b']);
  await type('cliente'); expect(ids()).toEqual(['a', 'b']); expect(searchTasks).toHaveBeenCalledTimes(1);
});

it('cache de favorito confirmado sobrevive reabertura sem API; legado sem campo vira false', async () => {
  await press('Favoritar: Marketing alpha');
  await act(async () => renderer.unmount());
  jest.mocked(getTasks).mockRejectedValueOnce(new Error('Offline'));
  await mount(); expect(context.tasks[0].favorite).toBe(true);
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', JSON.stringify(tasks.map(({ favorite: _favorite, ...task }) => task)));
  jest.mocked(getTasks).mockRejectedValueOnce(new Error('Offline'));
  await mount(); expect(context.tasks.every(task => task.favorite === false)).toBe(true);
});
it('filtro salvo não anuncia sucesso nem apaga anterior quando storage falha', async () => {
  await press('Filtrar tarefas'); await press('Prioridade: Alta'); await pressText('Aplicar filtros');
  await press('Filtros salvos'); await type('Novo', 'Nome do filtro salvo');
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Disk'));
  await press('Salvar filtro atual'); expect(text()).toContain('filtros anteriores foram preservados');
  expect(controls('Aplicar filtro: Novo')).toHaveLength(0); expect(storage.get('@taskflow:saved-task-filters:v1')).toBeUndefined();
});
it('erro de hidratação dos filtros preserva JSON e impede sobrescrita', async () => {
  await act(async () => renderer.unmount()); storage.set('@taskflow:saved-task-filters:v1', '{bad'); await mount();
  await press('Filtros salvos'); expect(text()).toContain('Os dados foram preservados');
  expect(controls('Salvar filtro atual')[0].props.disabled).toBe(true);
  expect(storage.get('@taskflow:saved-task-filters:v1')).toBe('{bad');
});

it('sair da Home invalida debounce e retorno repete a consulta ativa', async () => {
  await type('cliente');
  const blur = mockNavigation.addListener.mock.calls.find(([event]) => event === 'blur') as unknown as [string, () => void];
  const focus = mockNavigation.addListener.mock.calls.find(([event]) => event === 'focus') as unknown as [string, () => void];
  await act(async () => blur[1]()); await tick(); expect(searchTasks).not.toHaveBeenCalled();
  await act(async () => focus[1]()); await tick(); expect(searchTasks).toHaveBeenCalledWith('cliente'); expect(ids()).toEqual(['a', 'b']);
});

it('limpar busca restaura lista normal e mantém filtros/sorting/favoritas', async () => {
  await press('Favoritas');
  await type('nota'); await tick(); expect(ids()).toEqual(['b']);
  await press('Limpar busca'); expect(ids()).toEqual(['b']);
  expect(renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Buscar tarefas')!.props.value).toBe('');
  expect(controls('Favoritas')[0].props.accessibilityState.selected).toBe(true);
});
it('atualização mantém lista confirmada e erro da mesma query preserva resultado vindo de Note', async () => {
  jest.mocked(searchTasks).mockResolvedValueOnce([tasks[1]]);
  await type('apenas observação'); await tick(); expect(ids()).toEqual(['b']);
  let reject!: (error: Error) => void;
  jest.mocked(searchTasks).mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
  const focus = mockNavigation.addListener.mock.calls.find(([event]) => event === 'focus') as unknown as [string, () => void];
  await act(async () => focus[1]()); expect(ids()).toEqual(['b']); await tick(); expect(ids()).toEqual(['b']);
  await act(async () => reject(new Error('Offline'))); expect(ids()).toEqual(['b']);
  expect(text()).toContain('últimos resultados confirmados desta busca foram mantidos');
  expect(text()).toContain('Observações indisponíveis sem conexão');
  jest.mocked(searchTasks).mockRejectedValueOnce(new Error('Offline'));
  await type('outra busca sem match'); await tick(); expect(ids()).toEqual([]);
});
it('favorito não abre Details por propagação; card continua navegando', async () => {
  const stopPropagation = jest.fn();
  await act(async () => controls('Favoritar: Marketing alpha')[0].props.onPress({ stopPropagation }));
  expect(stopPropagation).toHaveBeenCalled(); expect(mockNavigation.navigate).not.toHaveBeenCalled();
  await press('Abrir tarefa: Marketing alpha'); expect(mockNavigation.navigate).toHaveBeenCalledWith('DetalheTarefa', { taskId: 'a' });
});
it('busca compõe todos os filtros e sorting simultaneamente', async () => {
  await type('nota real'); await tick(); await press('Filtrar tarefas');
  await press('Status: Pendentes'); await press('Prioridade: Alta'); await press('Período: Hoje');
  await press('Selecionar projeto: Todos os projetos'); await press('Projeto: Mesmo nome', 0); await pressText('Aplicar filtros');
  await press('Ordenar tarefas'); await press('Ordenação: Prazo'); await pressText('Aplicar ordenação');
  expect(ids()).toEqual(['a']);
  await press('Favoritar: Marketing alpha'); await tick(); await press('Favoritas'); expect(ids()).toEqual(['a']);
});

it('Task apenas local pode corresponder por título sem inventar resultado de Notes', async () => {
  await act(async () => renderer.unmount());
  const local = { ...tasks[0], id: 'legacy', remoteId: undefined, title: 'Cliente apenas local', projectId: undefined };
  storage.set('@taskflow:tasks', JSON.stringify([local, ...tasks]));
  await mount(); jest.mocked(searchTasks).mockResolvedValueOnce([]);
  await type('cliente'); await tick(); expect(ids()).toEqual(['legacy']);
  expect(text()).toContain('apenas neste aparelho são pesquisadas por título e descrição');
  expect(getTaskNotes).not.toHaveBeenCalled(); expect(context.tasks).toHaveLength(3);
});

it('cache antigo com ID canônico sem remoteId não é tratado como legado local', async () => {
  await act(async () => renderer.unmount());
  const canonical = { ...tasks[0], id: 'cf4af3a6-6058-4a51-9d3f-9fb1387fbcee', remoteId: undefined, title: 'Cliente remoto indisponível' };
  storage.set('@taskflow:tasks', JSON.stringify([canonical, ...tasks]));
  await mount(); jest.mocked(searchTasks).mockResolvedValueOnce([]);
  await type('cliente'); await tick(); expect(ids()).toEqual([]);
});
