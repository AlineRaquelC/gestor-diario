import React from 'react';
import { Alert, TextInput } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskProvider, useTasks } from '../src/context/TaskContext';
import { ProjectProvider } from '../src/context/ProjectContext';
import TaskDetailsScreen from '../src/screens/TaskDetailsScreen';
import * as notes from '../src/services/noteService';
import { getTasks, getTaskHistory } from '../src/services/taskService';
import { ApiError } from '../src/services/api';
import type { Note } from '../src/models/note';
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../src/services/noteService', () => ({ getTaskNotes: jest.fn(), createTaskNote: jest.fn(), updateTaskNote: jest.fn(), deleteTaskNote: jest.fn() }));
jest.mock('../src/services/taskService', () => ({ ...jest.requireActual('../src/services/taskService'), getTasks: jest.fn(), getTaskHistory: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }), useRoute: () => ({ params: { taskId: 't' } }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
const task = { id: 't', title: 'Tarefa real', description: 'Descrição principal independente', project: 'Geral', priority: 'low' as const, status: 'todo' as const, done: false, progress: 0, updatedAt: '2026-10-04T11:00:00Z' };
const first: Note = { id: 'n1', taskId: 't', content: 'Primeira observação', createdAt: '2026-10-04T12:00:00Z', updatedAt: '2026-10-04T12:00:00Z' };
const second: Note = { ...first, id: 'n2', content: 'Segunda observação', createdAt: '2026-10-04T13:00:00Z', updatedAt: '2026-10-04T13:00:00Z' };
const storage = new Map<string, string>();
let context: ReturnType<typeof useTasks>;
let renderer: ReactTestRenderer.ReactTestRenderer;
function Probe() { context = useTasks(); return null; }
const text = () => JSON.stringify(renderer.toJSON());
const input = (label = 'Nova observação') => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === label)!;
const button = (label: string) => renderer.root.findAll(node => node.props.accessibilityRole === 'button')
  .find(node => node.findAll(child => String(child.type) === 'Text').some(child => child.props.children === label))!;
async function press(label: string) { await act(async () => { await button(label).props.onPress(); }); }
async function type(value: string, label?: string) { await act(async () => { input(label).props.onChangeText(value); }); }
async function mount() {
  await act(async () => { renderer = ReactTestRenderer.create(<ProjectProvider><TaskProvider><Probe /><TaskDetailsScreen /></TaskProvider></ProjectProvider>); });
}
beforeEach(() => {
  jest.resetAllMocks(); storage.clear(); storage.set('@taskflow:tasks', JSON.stringify([task]));
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.mocked(getTasks).mockResolvedValue([task]); jest.mocked(getTaskHistory).mockResolvedValue([]);
  jest.mocked(notes.getTaskNotes).mockResolvedValue([]);
  jest.mocked(notes.createTaskNote).mockResolvedValue(first);
  jest.mocked(notes.updateTaskNote).mockResolvedValue({ ...first, content: 'Editada', updatedAt: '2026-10-04T14:00:00Z' });
  jest.mocked(notes.deleteTaskNote).mockResolvedValue({ id: first.id, taskId: 't', updatedAt: '2026-10-04T15:00:00Z' });
});
afterEach(async () => { if (renderer) {await act(async () => renderer.unmount());} jest.restoreAllMocks(); });
it('loading de notas independente e lista vazia real mantêm descrição e atividade', async () => {
  let finish!: (value: Note[]) => void;
  jest.mocked(notes.getTaskNotes).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await mount(); expect(text()).toContain('Carregando observações…'); expect(text()).toContain(task.description);
  expect(text()).toContain('Nenhuma atividade registrada.');
  await act(async () => finish([])); expect(text()).toContain('Nenhuma observação registrada.');
});
it('múltiplas notas são ordenadas e exibem createdAt real em pt-BR', async () => {
  jest.mocked(notes.getTaskNotes).mockResolvedValue([second, first]); await mount();
  expect(context.taskNotes.t).toEqual([first, second]); expect(text().indexOf(first.content)).toBeLessThan(text().indexOf(second.content));
  expect(text()).toContain(new Date(first.createdAt).toLocaleString('pt-BR')); expect(context.tasks[0].description).toBe(task.description);
});
it('GET falha sem esconder tarefa/histórico ou apresentar vazio falso', async () => {
  jest.mocked(notes.getTaskNotes).mockRejectedValue(new Error('Backend indisponível')); await mount();
  expect(text()).toContain('Backend indisponível'); expect(text()).toContain('Tarefa real'); expect(text()).toContain(task.description);
  expect(text()).not.toContain('Nenhuma observação registrada.');
});
it('POST confirmado limpa texto, insere somente ID real e atualiza timestamp/cache do pai', async () => {
  await mount(); await type('  Primeira observação  '); await press('Adicionar observação');
  expect(notes.createTaskNote).toHaveBeenCalledWith('t', first.content); expect(input().props.value).toBe('');
  expect(context.taskNotes.t).toEqual([first]); expect(context.tasks).toEqual([{ ...task, updatedAt: first.updatedAt }]);
  expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual(context.tasks); expect(context.taskHistory.t).toEqual([]);
});
it('POST falha preserva rascunho, tarefa e cache sem nota falsa', async () => {
  await mount(); const cache = storage.get('@taskflow:tasks');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest.mocked(notes.createTaskNote).mockRejectedValue(new Error('offline'));
  await type('Texto preservado'); await press('Adicionar observação');
  expect(input().props.value).toBe('Texto preservado'); expect(context.taskNotes.t).toEqual([]);
  expect(storage.get('@taskflow:tasks')).toBe(cache); expect(alert).toHaveBeenCalledWith('Não foi possível salvar a observação', 'offline');
});
it('criação bloqueia taps concorrentes e aguarda confirmação sem atualização otimista', async () => {
  await mount(); await type(first.content); let finish!: (note: Note) => void;
  jest.mocked(notes.createTaskNote).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const onPress = button('Adicionar observação').props.onPress; let pending!: Promise<void>;
  await act(async () => { pending = onPress(); await onPress(); });
  expect(notes.createTaskNote).toHaveBeenCalledTimes(1); expect(context.taskNotes.t).toEqual([]); expect(input().props.value).toBe(first.content);
  await act(async () => { finish(first); await pending; }); expect(context.taskNotes.t).toEqual([first]);
});
it('edição inline carrega texto, pode cancelar e preserva createdAt após sucesso', async () => {
  jest.mocked(notes.getTaskNotes).mockResolvedValue([first]); await mount(); await press('Editar observação');
  expect(input('Editar conteúdo da observação').props.value).toBe(first.content);
  await type('Descartar', 'Editar conteúdo da observação'); await press('Cancelar'); expect(notes.updateTaskNote).not.toHaveBeenCalled();
  await press('Editar observação'); await type('Editada', 'Editar conteúdo da observação'); await press('Salvar observação');
  expect(notes.updateTaskNote).toHaveBeenCalledWith('t', first.id, 'Editada');
  expect(context.taskNotes.t[0]).toMatchObject({ content: 'Editada', createdAt: first.createdAt, updatedAt: '2026-10-04T14:00:00Z' });
});
it('edição com erro mantém texto e nota confirmada; conteúdo vazio bloqueado', async () => {
  jest.mocked(notes.getTaskNotes).mockResolvedValue([first]); await mount(); await press('Editar observação');
  await type('  ', 'Editar conteúdo da observação'); expect(button('Salvar observação').props.disabled).toBe(true);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest.mocked(notes.updateTaskNote).mockRejectedValue(new Error('offline'));
  await type('Tentativa', 'Editar conteúdo da observação'); await press('Salvar observação');
  expect(input('Editar conteúdo da observação').props.value).toBe('Tentativa'); expect(context.taskNotes.t).toEqual([first]);
  expect(alert).toHaveBeenCalledWith('Não foi possível salvar a observação', 'offline');
});
it('exclusão exige confirmação, cancela sem API e remove somente nota confirmada', async () => {
  jest.mocked(notes.getTaskNotes).mockResolvedValue([first, second]); await mount();
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined); await press('Excluir observação');
  expect(alert).toHaveBeenCalledWith('Excluir observação?', expect.any(String), expect.arrayContaining([expect.objectContaining({ text: 'Cancelar' }), expect.objectContaining({ text: 'Excluir' })]));
  expect(notes.deleteTaskNote).not.toHaveBeenCalled(); expect(context.taskNotes.t).toEqual([first, second]);
  await act(async () => { await alert.mock.calls[0][2]!.find(b => b.text === 'Excluir')!.onPress!(); });
  expect(notes.deleteTaskNote).toHaveBeenCalledWith('t', first.id); expect(context.taskNotes.t).toEqual([second]);
});
it('DELETE offline mantém nota e tarefa; não produz remoção falsa', async () => {
  jest.mocked(notes.getTaskNotes).mockResolvedValue([first]); await mount(); const cache = storage.get('@taskflow:tasks');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined); jest.mocked(notes.deleteTaskNote).mockRejectedValue(new Error('offline'));
  await press('Excluir observação'); await act(async () => { await alert.mock.calls[0][2]!.find(b => b.text === 'Excluir')!.onPress!(); });
  expect(context.taskNotes.t).toEqual([first]); expect(storage.get('@taskflow:tasks')).toBe(cache); expect(text()).toContain(first.content);
});
it('GET offline preserva conjunto em memória; reabertura consulta novamente SQLite pela API', async () => {
  jest.mocked(notes.getTaskNotes).mockResolvedValue([first]); await mount();
  jest.mocked(notes.getTaskNotes).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await expect(context.loadTaskNotes('t')).rejects.toThrow('offline'); }); expect(context.taskNotes.t).toEqual([first]);
  await act(async () => renderer.unmount()); await mount(); expect(context.taskNotes.t).toEqual([first]);
  expect(notes.createTaskNote).not.toHaveBeenCalled();
});
it('tarefa somente local recebe mensagem compreensível e mantém rascunho sem upload geral', async () => {
  jest.mocked(getTasks).mockResolvedValue([]);
  jest.mocked(notes.getTaskNotes).mockRejectedValue(new ApiError('Tarefa não encontrada.', 404, 'TASK_NOT_FOUND'));
  jest.mocked(notes.createTaskNote).mockRejectedValue(new ApiError('Tarefa não encontrada.', 404, 'TASK_NOT_FOUND'));
  await mount(); const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await type('Não perder'); await press('Adicionar observação');
  expect(text()).toContain('As observações exigem uma tarefa persistida na API.'); expect(input().props.value).toBe('Não perder');
  expect(context.tasks).toEqual([task]); expect(context.taskNotes.t).toBeUndefined();
  expect(alert).toHaveBeenCalledWith('Não foi possível salvar a observação', expect.stringContaining('não está disponível no servidor'));
});
it('resposta GET atrasada não desfaz POST confirmado nem cria duplicatas', async () => {
  await mount(); let finish!: (value: Note[]) => void;
  jest.mocked(notes.getTaskNotes).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { const pending = context.loadTaskNotes('t'); await context.addTaskNote('t', first.content); finish([]); await pending; });
  expect(context.taskNotes.t).toEqual([first]);
  await act(async () => { await context.addTaskNote('t', first.content); }); expect(context.taskNotes.t).toEqual([first]);
});
it('cache falha após confirmação sem repetir POST; nota e estado confirmado permanecem', async () => {
  await mount(); jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('disk'));
  await act(async () => { expect((await context.addTaskNote('t', first.content)).cacheSaved).toBe(false); });
  expect(notes.createTaskNote).toHaveBeenCalledTimes(1); expect(context.taskNotes.t).toEqual([first]);
});
it('bloqueia PATCH/DELETE duplicados e concorrência entre nota e status do pai', async () => {
  jest.mocked(notes.getTaskNotes).mockResolvedValue([first]); await mount(); let finish!: (note: Note) => void;
  jest.mocked(notes.updateTaskNote).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => {
    const pending = context.editTaskNote('t', first.id, 'Editada');
    await expect(context.editTaskNote('t', first.id, 'Editada')).rejects.toThrow(/andamento/);
    await expect(context.removeTaskNote('t', first.id)).rejects.toThrow(/andamento/);
    await expect(context.toggleTask('t')).rejects.toThrow(/andamento/);
    finish({ ...first, content: 'Editada' }); await pending;
  });
  expect(notes.updateTaskNote).toHaveBeenCalledTimes(1); expect(notes.deleteTaskNote).not.toHaveBeenCalled();
});
