import { ApiError } from '../src/services/api';
import { RECURRENCE_DELETIONS_KEY } from '../src/services/recurrenceDeletionJournal';
import { deleteRecurrenceOccurrences, getRecurrenceSeries, activateRecurrence, updateRecurrenceSeries, materializeRecurrences } from '../src/services/recurrenceService';
jest.mock('../src/services/recurrenceService', () => ({ ...jest.requireActual('../src/services/recurrenceService'), getRecurrenceSeries: jest.fn(), deleteRecurrenceOccurrences: jest.fn(), activateRecurrence: jest.fn(), materializeRecurrences: jest.fn(), updateRecurrenceSeries: jest.fn() }));
import { ReminderScheduler, reminderScheduler } from '../src/services/reminderScheduler';
import TaskDetailsScreen from '../src/screens/TaskDetailsScreen';
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn(), reset: jest.fn() }), useRoute: () => ({ params: { taskId: 'server-uuid' } }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../src/components/TaskNotesSection', () => () => null);
import { normalizeReminderCache } from '../src/models/reminder';
import React from 'react';
import { AppState } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Task } from '../src/context/TaskContext';
import { TaskProvider, useTasks } from '../src/context/TaskContext';
import { ProjectProvider } from '../src/context/ProjectContext';
import { createTask, resolveProject, getTasks, getTaskById, updateTask, getTaskHistory, createSubtask, updateSubtask, deleteSubtask, deleteTask, restoreTask } from '../src/services/taskService';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../src/services/taskService', () => ({ createTask: jest.fn(), resolveProject: jest.fn(), getTasks: jest.fn(), getTaskById: jest.fn(), updateTask: jest.fn(), getTaskHistory: jest.fn(), createSubtask: jest.fn(), updateSubtask: jest.fn(), deleteSubtask: jest.fn(), deleteTask: jest.fn(), restoreTask: jest.fn(), fromApiTask: jest.requireActual('../src/services/taskService').fromApiTask, mergeSubtasks: jest.requireActual('../src/services/taskService').mergeSubtasks }));
const storage = new Map<string, string>();
let context: ReturnType<typeof useTasks>;
let renderer: ReactTestRenderer.ReactTestRenderer;
const draft = { title: 'Nova', project: 'Geral', projectId: 'p7', priority: 'medium' as const, status: 'todo' as const, done: false, startDate: '2026-10-02', dueDate: '2026-10-03' };
const saved = { ...draft, favorite: false, reminders: [], id: 'server-uuid', projectId: 'remote' };
function Probe() { context = useTasks(); return null; }
async function mount() {
  await act(async () => { renderer = ReactTestRenderer.create(<ProjectProvider><TaskProvider><Probe /></TaskProvider></ProjectProvider>); });
}
beforeEach(async () => {
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  jest.mocked(materializeRecurrences).mockResolvedValue(undefined);
  storage.clear();
  storage.set('@taskflow:tasks', '[]');
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.mocked(createTask).mockResolvedValue(saved);
  jest.mocked(resolveProject).mockResolvedValue('remote');
  jest.mocked(getTasks).mockResolvedValue([]);
  jest.mocked(getTaskHistory).mockResolvedValue([]);
  await mount();
});
afterEach(async () => { await act(async () => renderer.unmount()); jest.clearAllMocks(); });
it('concluir/reabrir atualiza filhos remotos e locais da tarefa selecionada após PATCH, sem upload do legado', async () => {
  const locals = [1, 2, 3].map(index => ({ id: 'local-' + index, title: 'Local ' + index, done: index <= 2 }));
  const child = { id: 'remote-child', title: 'SQLite', done: false, remote: true };
  const selected = { ...saved, subtasks: [child, ...locals], status: 'in_progress' as const, progress: 50 };
  const other = { ...saved, id: 'other', subtasks: [{ id: 'other-local', title: 'Não enviar', done: false }] };
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', JSON.stringify([selected, other])); await mount();
  expect(createSubtask).not.toHaveBeenCalled();
  for (const done of [true, false]) {
    jest.mocked(updateTask).mockResolvedValueOnce({ ...selected, status: done ? 'completed' : 'todo',
      done, progress: done ? 100 : 0, subtasks: [{ ...child, done }] });
    await act(async () => { await context.toggleTask(saved.id); });
    expect(context.tasks[0]).toMatchObject({ status: done ? 'completed' : 'todo', done, progress: done ? 100 : 0 });
    expect(context.tasks[0].subtasks).toHaveLength(4);
    expect(context.tasks[0].subtasks!.every(item => item.done === done)).toBe(true);
    expect(context.tasks[0].subtasks!.filter(item => !item.remote).map(item => item.id)).toEqual(locals.map(item => item.id));
    expect(context.tasks[1]).toEqual(other);
    expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual(context.tasks);
  }
  expect(createSubtask).not.toHaveBeenCalled(); expect(updateSubtask).not.toHaveBeenCalled();
});
it('falha do PATCH coletivo conserva todos os valores locais e o cache, sem upload ou conclusão falsa', async () => {
  const selected = { ...saved, status: 'in_progress' as const, done: false, progress: 50,
    subtasks: [1, 2, 3, 4].map(index => ({ id: 'local-' + index, title: 'Local ' + index, done: index <= 2 })) };
  await act(async () => renderer.unmount()); storage.set('@taskflow:tasks', JSON.stringify([selected])); await mount();
  const cache = storage.get('@taskflow:tasks');
  jest.mocked(updateTask).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await expect(context.toggleTask(saved.id)).rejects.toThrow('offline'); });
  expect(context.tasks).toEqual([selected]); expect(storage.get('@taskflow:tasks')).toBe(cache);
  expect(createSubtask).not.toHaveBeenCalled();
});
it('filhos do cache antigo só mudam após resposta confirmada do PATCH coletivo', async () => {
  const selected = { ...saved, subtasks: [{ id: 'local', title: 'Local', done: false }] };
  await act(async () => renderer.unmount()); storage.set('@taskflow:tasks', JSON.stringify([selected])); await mount();
  let finish!: () => void;
  jest.mocked(updateTask).mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({ ...saved, status: 'completed', done: true, progress: 100, subtasks: [] }); }));
  const cache = storage.get('@taskflow:tasks'); let pending!: Promise<unknown>;
  await act(async () => { pending = context.toggleTask(saved.id); });
  expect(context.tasks).toEqual([selected]); expect(storage.get('@taskflow:tasks')).toBe(cache);
  await act(async () => { finish(); await pending; });
  expect(context.tasks[0].subtasks).toEqual([{ ...selected.subtasks[0], done: true }]);
  expect(createSubtask).not.toHaveBeenCalled();
});
it('normaliza review legado na hidratação sem perder tarefa ou subtarefas', async () => {
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', JSON.stringify([{ ...saved, status: 'review', done: true, subtasks: [{ id: 's', title: 'Local', done: false }] }]));
  await mount();
  expect(context.tasks).toEqual([expect.objectContaining({ id: saved.id, status: 'in_progress', done: false, subtasks: [{ id: 's', title: 'Local', done: false }] })]);
  expect(JSON.parse(storage.get('@taskflow:tasks')!)[0].status).toBe('in_progress');
});
it('conclui e reabre via PATCH confirmado, atualiza cache e preserva após reabertura', async () => {
  await act(async () => { await context.addTask(draft); });
  jest.mocked(updateTask).mockResolvedValueOnce({ ...saved, status: 'completed', done: true, progress: 100 });
  await act(async () => { await context.toggleTask(saved.id); });
  expect(updateTask).toHaveBeenLastCalledWith(saved.id, { status: 'completed' }, saved);
  expect(context.tasks).toHaveLength(1);
  expect(context.tasks[0]).toMatchObject({ status: 'completed', done: true, progress: 100 });
  await act(async () => renderer.unmount());
  await mount();
  expect(context.tasks[0]).toMatchObject({ status: 'completed', done: true, progress: 100 });
  jest.mocked(updateTask).mockResolvedValueOnce({ ...saved, status: 'todo', done: false, progress: 0 });
  await act(async () => { await context.toggleTask(saved.id); });
  expect(context.tasks[0]).toMatchObject({ status: 'todo', done: false, progress: 0 });
  expect(JSON.parse(storage.get('@taskflow:tasks')!)[0]).toMatchObject({ status: 'todo', done: false, progress: 0 });
});
it('falha ao concluir preserva estado/cache confirmado', async () => {
  await act(async () => { await context.addTask(draft); });
  const cache = storage.get('@taskflow:tasks');
  jest.mocked(updateTask).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await expect(context.toggleTask(saved.id)).rejects.toThrow('offline'); });
  expect(context.tasks).toEqual([saved]);
  expect(storage.get('@taskflow:tasks')).toBe(cache);
});
it('carrega histórico real, preserva em erro e aceita histórico vazio', async () => {
  const event = { id: 'h', taskId: saved.id, action: 'CREATED' as const, metadata: {}, createdAt: '2026-10-04T12:00:00Z' };
  jest.mocked(getTaskHistory).mockResolvedValueOnce([event]);
  await act(async () => { await context.loadTaskHistory(saved.id); });
  expect(context.taskHistory[saved.id]).toEqual([event]);
  jest.mocked(getTaskHistory).mockRejectedValueOnce(new Error('history offline'));
  await act(async () => { await expect(context.loadTaskHistory(saved.id)).rejects.toThrow('history offline'); });
  expect(context.taskHistory[saved.id]).toEqual([event]);
  await act(async () => { await context.loadTaskHistory(saved.id); });
  expect(context.taskHistory[saved.id]).toEqual([]);
});
it('consulta de histórico antiga não sobrescreve uma resposta nova', async () => {
  let finish!: (events: []) => void;
  jest.mocked(getTaskHistory).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const event = { id: 'new', taskId: saved.id, action: 'UPDATED' as const, metadata: { fields: ['title'] }, createdAt: '2026-10-04T13:00:00Z' };
  jest.mocked(getTaskHistory).mockResolvedValueOnce([event]);
  await act(async () => { const first = context.loadTaskHistory(saved.id); await context.loadTaskHistory(saved.id); finish([]); await first; });
  expect(context.taskHistory[saved.id]).toEqual([event]);
});
it('adiciona somente a resposta remota e restaura do AsyncStorage ao reabrir', async () => {
  await act(async () => { expect((await context.addTask(draft)).cacheSaved).toBe(true); });
  expect(context.tasks).toEqual([saved]);
  expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual([saved]);
  expect(JSON.parse(storage.get('@taskflow:projects')!).find((p: { id: string }) => p.id === 'p7').remoteId).toBe('remote');
  await act(async () => renderer.unmount());
  await mount();
  expect(context.tasks).toEqual([saved]);
});
it('falha remota não altera lista/cache', async () => {
  jest.mocked(createTask).mockRejectedValue(new Error('offline'));
  await act(async () => { await expect(context.addTask(draft)).rejects.toThrow('offline'); });
  expect(context.tasks).toEqual([]);
  expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual([]);
});
it('falha de cache após sucesso remoto é informada sem repetir criação', async () => {
  jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('disk'));
  await act(async () => { expect((await context.addTask(draft)).cacheSaved).toBe(false); });
  expect(context.tasks).toEqual([saved]);
  expect(createTask).toHaveBeenCalledTimes(1);
});
it('impede chamadas simultâneas antes de criar duplicata', async () => {
  let finish!: (value: typeof saved) => void;
  jest.mocked(createTask).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => {
    const first = context.addTask(draft);
    await Promise.resolve();
    await expect(context.addTask(draft)).rejects.toThrow(/andamento/);
    finish(saved);
    await first;
  });
  expect(context.tasks).toEqual([saved]);
  expect(createTask).toHaveBeenCalledTimes(1);
});

it('carrega API depois do cache, sem duplicatas e preservando subtarefas/lembretes locais', async () => {
  await act(async () => renderer.unmount());
  const local = { ...saved, title: 'Antiga', subtasks: [{ id: 's', title: 'Local', done: false }], reminders: ['Lembrar'] };
  const legacy = { ...saved, id: 'legacy' };
  storage.set('@taskflow:tasks', JSON.stringify([local, legacy]));
  jest.mocked(getTasks).mockResolvedValue([{ ...saved, title: 'SQLite', progress: 60 }]);
  await mount();
  expect(context.loading).toBe(false);
  expect(context.readError).toBeNull();
  expect(context.tasks).toEqual([{ ...saved, title: 'SQLite', progress: 60, subtasks: local.subtasks, reminders: [], legacyReminders: local.reminders, syncSnapshot: normalizeReminderCache(local), syncSnapshots: [normalizeReminderCache(local)] }, legacy]);
  expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual(context.tasks);
});
it('consulta indisponível mantém cache e informa erro', async () => {
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', JSON.stringify([saved]));
  jest.mocked(getTasks).mockRejectedValue(new Error('Backend indisponível'));
  await mount();
  expect(context.tasks).toEqual([saved]);
  expect(context.readError).toBe('Backend indisponível');
  expect(context.loading).toBe(false);
  expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual([saved]);
});
it('lista remota vazia não cria exemplos nem apaga registros locais antigos', async () => {
  expect(context.tasks).toEqual([]);
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', JSON.stringify([saved]));
  await mount();
  expect(context.tasks).toEqual([saved]);
});
it('expõe loading durante consulta sem esconder cache hidratado', async () => {
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', JSON.stringify([saved]));
  let finish!: (value: typeof saved[]) => void;
  jest.mocked(getTasks).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await mount();
  expect(context.loading).toBe(true);
  expect(context.tasks).toEqual([saved]);
  await act(async () => finish([]));
  expect(context.loading).toBe(false);
});
it('cache ilegível não é sobrescrito mesmo quando API responde', async () => {
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', 'invalid-json');
  jest.mocked(getTasks).mockResolvedValue([saved]);
  await mount();
  expect(context.tasks).toEqual([saved]);
  expect(context.readError).toMatch(/cache original foi preservado/);
  expect(storage.get('@taskflow:tasks')).toBe('invalid-json');
});
it('carrega detalhe pelo service e mantém um registro por ID', async () => {
  jest.mocked(getTaskById).mockResolvedValue(saved);
  await act(async () => { await context.loadTaskById(saved.id); await context.loadTaskById(saved.id); });
  expect(context.tasks).toEqual([saved]);
  expect(context.getTaskById(saved.id)).toEqual(saved);
  jest.mocked(getTaskById).mockRejectedValue(new Error('Tarefa não encontrada.'));
  await act(async () => { await expect(context.loadTaskById('missing')).rejects.toThrow('Tarefa não encontrada.'); });
  expect(context.tasks).toEqual([saved]);
});

it('falha de leitura AsyncStorage não grava sobre o cache original', async () => {
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', JSON.stringify([saved]));
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => {
    if (key === '@taskflow:tasks') {throw new Error('read failure');}
    return storage.get(key) ?? null;
  });
  jest.mocked(getTasks).mockResolvedValue([saved]);
  await mount();
  expect(context.tasks).toEqual([saved]);
  expect(context.readError).toMatch(/cache original foi preservado/);
  expect(storage.get('@taskflow:tasks')).toBe(JSON.stringify([saved]));
});
it('resposta inicial atrasada não apaga tarefa criada enquanto GET estava em andamento', async () => {
  await act(async () => renderer.unmount());
  let finish!: (value: typeof saved[]) => void;
  jest.mocked(getTasks).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await mount();
  await act(async () => { await context.addTask(draft); });
  await act(async () => finish([]));
  expect(context.tasks).toEqual([saved]);
});

async function seedUpdate() {
  await act(async () => { await context.addTask(draft); });
  jest.mocked(updateTask).mockResolvedValue({ ...saved, title: 'Editada', updatedAt: '2026-10-04T12:00:00.000Z' });
}
it('edição confirmada atualiza estado/cache sem duplicatas e reabre com os valores novos', async () => {
  await seedUpdate();
  await act(async () => { expect((await context.updateTask(saved.id, { title: 'Editada' })).cacheSaved).toBe(true); });
  expect(context.tasks).toEqual([{ ...saved, title: 'Editada', updatedAt: '2026-10-04T12:00:00.000Z' }]);
  expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual(context.tasks);
  await act(async () => renderer.unmount());
  await mount();
  expect(context.tasks[0].title).toBe('Editada');
  expect(context.tasks).toHaveLength(1);
});
it('PATCH indisponível não modifica estado nem cache e permite tentar novamente', async () => {
  await seedUpdate();
  const before = storage.get('@taskflow:tasks');
  jest.mocked(updateTask).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await expect(context.updateTask(saved.id, { title: 'Não salva' })).rejects.toThrow('offline'); });
  expect(context.tasks).toEqual([saved]);
  expect(storage.get('@taskflow:tasks')).toBe(before);
  await act(async () => { await context.updateTask(saved.id, { title: 'Editada' }); });
  expect(context.tasks[0].title).toBe('Editada');
});
it('troca de projeto resolve ID, envia vínculo remoto e usa nome confirmado pela API', async () => {
  await seedUpdate();
  jest.mocked(resolveProject).mockResolvedValue('new-remote');
  jest.mocked(updateTask).mockResolvedValue({ ...saved, projectId: 'new-remote', project: 'Marketing confirmado' });
  await act(async () => { await context.updateTask(saved.id, { projectId: 'p1' }); });
  expect(updateTask).toHaveBeenLastCalledWith(saved.id, { projectId: 'new-remote' }, saved);
  expect(context.tasks[0]).toMatchObject({ projectId: 'new-remote', project: 'Marketing confirmado' });
  expect(JSON.parse(storage.get('@taskflow:tasks')!)[0].projectId).toBe('new-remote');
});
it('mantém vínculo remoto atual ausente no ProjectContext, sem recriação ou associação por nome', async () => {
  await act(async () => renderer.unmount());
  const unlisted = { ...saved, projectId: 'unlisted' };
  storage.set('@taskflow:tasks', JSON.stringify([unlisted]));
  await mount();
  jest.mocked(resolveProject).mockClear();
  jest.mocked(updateTask).mockResolvedValue({ ...unlisted, title: 'Editada' });
  await act(async () => { await context.updateTask(saved.id, { projectId: unlisted.projectId, title: 'Editada' }); });
  expect(resolveProject).not.toHaveBeenCalled();
  expect(updateTask).toHaveBeenLastCalledWith(saved.id, { projectId: unlisted.projectId, title: 'Editada' }, unlisted);
});
it('projeto desconhecido não muda tarefa nem chama PATCH', async () => {
  await seedUpdate();
  jest.mocked(updateTask).mockClear();
  await act(async () => { await expect(context.updateTask(saved.id, { projectId: 'invalid' })).rejects.toThrow(/projeto válido/); });
  expect(updateTask).not.toHaveBeenCalled();
  expect(context.tasks).toEqual([saved]);
});
it('subtarefas editadas localmente só são aplicadas após PATCH confirmado', async () => {
  await seedUpdate();
  const children = [{ id: 'local', title: 'Local', done: true }];
  await act(async () => { await context.updateTask(saved.id, { title: 'Editada', subtasks: children }); });
  expect(context.tasks[0].subtasks).toEqual(children);
  await act(async () => renderer.unmount());
  await mount();
  expect(context.tasks[0].subtasks).toEqual(children);
});
it('falha de cache após PATCH informa aviso sem repetir envio ou reverter confirmação remota', async () => {
  await seedUpdate();
  jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('disk'));
  jest.mocked(updateTask).mockClear();
  await act(async () => { expect((await context.updateTask(saved.id, { title: 'Editada' })).cacheSaved).toBe(false); });
  expect(context.tasks[0].title).toBe('Editada');
  expect(updateTask).toHaveBeenCalledTimes(1);
});
it('bloqueia PATCHs concorrentes da mesma tarefa', async () => {
  await seedUpdate();
  let finish!: (value: typeof saved) => void;
  jest.mocked(updateTask).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => {
    const first = context.updateTask(saved.id, { title: 'Editada' });
    await expect(context.updateTask(saved.id, { title: 'Outra' })).rejects.toThrow(/andamento/);
    finish({ ...saved, title: 'Editada' });
    await first;
  });
  expect(context.tasks).toHaveLength(1);
  expect(context.tasks[0].title).toBe('Editada');
});
it('GET inicial atrasado não reverte a edição confirmada', async () => {
  await act(async () => renderer.unmount());
  const old = { ...saved, updatedAt: '2026-10-03T12:00:00.000Z' };
  storage.set('@taskflow:tasks', JSON.stringify([old]));
  let finish!: (value: typeof old[]) => void;
  jest.mocked(getTasks).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  jest.mocked(updateTask).mockResolvedValue({ ...old, title: 'Editada', updatedAt: '2026-10-04T12:00:00.000Z' });
  await mount();
  await act(async () => { await context.updateTask(saved.id, { title: 'Editada' }); });
  await act(async () => finish([old]));
  expect(context.tasks[0].title).toBe('Editada');
  expect(JSON.parse(storage.get('@taskflow:tasks')!)[0].title).toBe('Editada');
});
it('operações locais anteriores permanecem locais, sem PATCH implícito', async () => {
  await seedUpdate();
  jest.mocked(updateTask).mockClear();
  await act(async () => { context.updateTaskLocal(saved.id, { subtasks: [{ id: 's', title: 'Local', done: true }] }); });
  expect(updateTask).not.toHaveBeenCalled();
  expect(context.tasks[0].subtasks).toHaveLength(1);
});

const child = { id: 'remote-child', title: 'Filha', done: false, remote: true };
async function seedChildren() {
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', JSON.stringify([{ ...saved, progress: 0, subtasks: [child] }]));
  await mount();
}
it('adiciona subtarefa confirmada e atualiza pai/cache sem duplicação', async () => {
  await seedChildren();
  const added = { id: 'new-child', title: 'Nova', done: false, remote: true };
  jest.mocked(createSubtask).mockResolvedValue({ ...saved, progress: 0, subtasks: [child, added] });
  await act(async () => { expect((await context.addSubtask(saved.id, 'Nova')).cacheSaved).toBe(true); });
  expect(createSubtask).toHaveBeenCalledWith(saved.id, 'Nova');
  expect(context.tasks[0].subtasks).toEqual([child, added]);
  expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual(context.tasks);
});
it('marcar/desmarcar filho atualiza progresso/status/done e reabertura mantém confirmação', async () => {
  await seedChildren();
  jest.mocked(updateSubtask).mockResolvedValueOnce({ ...saved, progress: 100, status: 'completed', done: true, subtasks: [{ ...child, done: true }] });
  await act(async () => { await context.toggleSubtask(saved.id, child.id); });
  expect(context.tasks[0]).toMatchObject({ progress: 100, status: 'completed', done: true });
  jest.mocked(updateSubtask).mockResolvedValueOnce({ ...saved, progress: 0, status: 'todo', done: false, subtasks: [child] });
  await act(async () => { await context.toggleSubtask(saved.id, child.id); });
  expect(updateSubtask).toHaveBeenLastCalledWith(saved.id, child.id, { done: false });
  await act(async () => renderer.unmount()); await mount();
  expect(context.tasks[0]).toMatchObject({ progress: 0, status: 'todo', done: false, subtasks: [child] });
});
it('remover filho remoto não o ressuscita do cache e preserva filho antigo local', async () => {
  await seedChildren();
  const local = { id: 'legacy', title: 'Antiga local', done: true };
  await act(async () => { context.updateTaskLocal(saved.id, { subtasks: [child, local] }); });
  jest.mocked(deleteSubtask).mockResolvedValue({ ...saved, subtasks: [], progress: 0 });
  await act(async () => { await context.removeSubtask(saved.id, child.id); });
  expect(context.tasks[0].subtasks).toEqual([local]);
  expect(deleteSubtask).toHaveBeenCalledWith(saved.id, child.id);
});
it.each(['add', 'toggle', 'remove'])('subtarefa %s offline preserva cache e estado confirmado', async operation => {
  await seedChildren(); const before = storage.get('@taskflow:tasks'); const tasksBefore = context.tasks;
  jest.mocked(createSubtask).mockRejectedValue(new Error('offline'));
  jest.mocked(updateSubtask).mockRejectedValue(new Error('offline'));
  jest.mocked(deleteSubtask).mockRejectedValue(new Error('offline'));
  await act(async () => {
    const promise = operation === 'add' ? context.addSubtask(saved.id, 'Nova') : operation === 'toggle' ? context.toggleSubtask(saved.id, child.id) : context.removeSubtask(saved.id, child.id);
    await expect(promise).rejects.toThrow('offline');
  });
  expect(context.tasks).toEqual(tasksBefore); expect(storage.get('@taskflow:tasks')).toBe(before);
});
it('bloqueia chamadas concorrentes de filho/pai sem repetir operação', async () => {
  await seedChildren(); let finish!: (task: typeof saved) => void;
  jest.mocked(createSubtask).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  jest.mocked(createSubtask).mockClear();
  await act(async () => {
    const first = context.addSubtask(saved.id, 'Nova');
    await expect(context.addSubtask(saved.id, 'Nova')).rejects.toThrow(/andamento/);
    await expect(context.toggleTask(saved.id)).rejects.toThrow(/andamento/);
    finish({ ...saved }); await first;
  });
  expect(createSubtask).toHaveBeenCalledTimes(1); expect(context.tasks).toHaveLength(1);
});
it('filho apenas local não é enviado automaticamente nem apagado por GET vazio', async () => {
  await seedChildren(); const local = { id: 'legacy', title: 'Local', done: false };
  await act(async () => { context.updateTaskLocal(saved.id, { subtasks: [local] }); });
  jest.mocked(getTaskById).mockResolvedValue({ ...saved, subtasks: [] });
  await act(async () => { await context.loadTaskById(saved.id); });
  expect(context.tasks[0].subtasks).toEqual([local]);
  jest.mocked(updateSubtask).mockClear();
  await act(async () => { await expect(context.toggleSubtask(saved.id, local.id)).rejects.toThrow(/apenas no dispositivo/); });
  expect(updateSubtask).not.toHaveBeenCalled();
});
it('falha de cache após subtarefa confirmada avisa sem repetir POST', async () => {
  await seedChildren(); jest.mocked(createSubtask).mockResolvedValue({ ...saved, subtasks: [child] });
  jest.mocked(createSubtask).mockClear(); jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('disk'));
  await act(async () => { expect((await context.addSubtask(saved.id, 'Nova')).cacheSaved).toBe(false); });
  expect(createSubtask).toHaveBeenCalledTimes(1); expect(context.tasks[0].subtasks).toEqual([child]);
});

it('DELETE só remove após API; RESTORE preserva mesmo ID, filhos/cache e recalcula dashboard/calendário', async () => {
  const { dashboardMetrics } = require('../src/utils/dashboard');
  const { tasksForDay } = require('../src/utils/calendar');
  const original = { ...saved, dueDate: '2026-10-04', subtasks: [{ id: 's', title: 'Filha', done: false, remote: true }] };
  jest.mocked(createTask).mockResolvedValueOnce(original);
  await act(async () => { await context.addTask(draft); });
  let finish!: () => void;
  jest.mocked(deleteTask).mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({ id: saved.id, deletedAt: '2026-10-04T12:00:00Z', updatedAt: '2026-10-04T12:00:00Z' }); }));
  let pending!: Promise<unknown>;
  await act(async () => { pending = context.deleteTask(saved.id); });
  expect(context.tasks).toEqual([original]); expect(context.undo).toBeNull();
  await act(async () => { await expect(context.deleteTask(saved.id)).rejects.toThrow('andamento'); });
  expect(deleteTask).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); await pending; });
  expect(context.tasks).toEqual([]); expect(context.undo?.id).toBe(saved.id);
  expect(dashboardMetrics(context.tasks, 'today', new Date(2026, 9, 4)).total).toBe(0);
  expect(tasksForDay(context.tasks, '2026-10-04')).toEqual([]);
  jest.mocked(restoreTask).mockResolvedValueOnce(original);
  await act(async () => { await context.restoreTask(saved.id); });
  expect(context.tasks).toEqual([original]); expect(context.undo).toBeNull();
  expect(dashboardMetrics(context.tasks, 'today', new Date(2026, 9, 4)).total).toBe(1);
  expect(tasksForDay(context.tasks, '2026-10-04')).toEqual([original]);
  expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual([original]);
});
it.each(['offline', 'Tarefa apenas local'])('DELETE %s preserva último estado confirmado e cache', async message => {
  await act(async () => { await context.addTask(draft); });
  const cache = storage.get('@taskflow:tasks');
  jest.mocked(deleteTask).mockRejectedValueOnce(new Error(message));
  await act(async () => { await expect(context.deleteTask(saved.id)).rejects.toThrow(message); });
  expect(context.tasks).toEqual([saved]); expect(context.undo).toBeNull();
  expect(storage.get('@taskflow:tasks')).toBe(cache);
});
it('falha de RESTORE mantém exclusão; janela expira sem hard delete e reabertura preserva remoção', async () => {
  jest.useFakeTimers();
  try {
    await act(async () => { await context.addTask(draft); });
    jest.mocked(deleteTask).mockResolvedValueOnce({ id: saved.id, deletedAt: 'now', updatedAt: 'now' });
    await act(async () => { await context.deleteTask(saved.id); });
    jest.mocked(restoreTask).mockRejectedValueOnce(new Error('offline'));
    await act(async () => { await expect(context.restoreTask(saved.id)).rejects.toThrow('offline'); });
    expect(context.tasks).toEqual([]); expect(context.undo?.id).toBe(saved.id);
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(context.undo).toBeNull();
    await act(async () => { await expect(context.restoreTask(saved.id)).rejects.toThrow('prazo'); });
    expect(restoreTask).toHaveBeenCalledTimes(1); expect(deleteTask).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount()); await mount();
    expect(context.tasks).toEqual([]);
  } finally { jest.useRealTimers(); }
});
it('segunda exclusão substitui undo; callback antigo não restaura ID errado e duplo RESTORE é bloqueado', async () => {
  await act(async () => { await context.addTask(draft); });
  jest.mocked(createTask).mockResolvedValueOnce({ ...saved, id: 'second' });
  await act(async () => { await context.addTask(draft); });
  jest.mocked(deleteTask).mockResolvedValue({ id: saved.id, deletedAt: 'now', updatedAt: 'now' });
  await act(async () => { await context.deleteTask(saved.id); await context.deleteTask('second'); });
  expect(context.undo?.id).toBe('second');
  await act(async () => { await expect(context.restoreTask(saved.id)).rejects.toThrow('prazo'); });
  let finish!: () => void;
  jest.mocked(restoreTask).mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({ ...saved, id: 'second' }); }));
  let pending!: Promise<unknown>;
  await act(async () => { pending = context.restoreTask('second'); });
  await act(async () => { await expect(context.restoreTask('second')).rejects.toThrow('andamento'); });
  expect(restoreTask).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); await pending; });
  expect(context.tasks.map(task => task.id)).toEqual(['second']);
});
it('GET individual atrasado não ressuscita tarefa após DELETE confirmado', async () => {
  await act(async () => { await context.addTask(draft); });
  let finish!: () => void;
  jest.mocked(getTaskById).mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve(saved); }));
  let pending!: Promise<unknown>;
  await act(async () => { pending = context.loadTaskById(saved.id); });
  jest.mocked(deleteTask).mockResolvedValueOnce({ id: saved.id, deletedAt: 'now', updatedAt: 'now' });
  await act(async () => { await context.deleteTask(saved.id); });
  await act(async () => { finish(); await expect(pending).rejects.toThrow('excluída'); });
  expect(context.tasks).toEqual([]);
});
it('timer antigo não encerra undo da segunda tarefa; expira apenas após seus próprios cinco segundos', async () => {
  jest.useFakeTimers();
  try {
    await act(async () => { await context.addTask(draft); });
    jest.mocked(createTask).mockResolvedValueOnce({ ...saved, id: 'second' });
    await act(async () => { await context.addTask(draft); });
    jest.mocked(deleteTask).mockResolvedValue({ id: saved.id, deletedAt: 'now', updatedAt: 'now' });
    await act(async () => { await context.deleteTask(saved.id); jest.advanceTimersByTime(4000); });
    await act(async () => { await context.deleteTask('second'); jest.advanceTimersByTime(1000); });
    expect(context.undo?.id).toBe('second');
    await act(async () => { jest.advanceTimersByTime(3999); });
    expect(context.undo?.id).toBe('second');
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(context.undo).toBeNull(); expect(context.tasks).toEqual([]);
  } finally { jest.useRealTimers(); }
});
it('restore iniciado dentro da janela pode terminar depois dela, sem duplicar a tarefa', async () => {
  jest.useFakeTimers();
  try {
    await act(async () => { await context.addTask(draft); });
    jest.mocked(deleteTask).mockResolvedValueOnce({ id: saved.id, deletedAt: 'now', updatedAt: 'now' });
    await act(async () => { await context.deleteTask(saved.id); });
    let finish!: () => void;
    jest.mocked(restoreTask).mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve(saved); }));
    let pending!: Promise<unknown>;
    await act(async () => { pending = context.restoreTask(saved.id); jest.advanceTimersByTime(6000); });
    expect(context.tasks).toEqual([]);
    await act(async () => { finish(); await pending; });
    expect(context.tasks).toEqual([saved]); expect(context.undo).toBeNull();
  } finally { jest.useRealTimers(); }
});
it('falhas de cache após DELETE/RESTORE retornam warning e conservam estado confirmado da API', async () => {
  await act(async () => { await context.addTask(draft); });
  jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('cache cheio'));
  jest.mocked(deleteTask).mockResolvedValueOnce({ id: saved.id, deletedAt: 'now', updatedAt: 'now' });
  await act(async () => { expect(await context.deleteTask(saved.id)).toMatchObject({ cacheSaved: false }); });
  expect(context.tasks).toEqual([]); expect(context.undo?.id).toBe(saved.id);
  jest.mocked(restoreTask).mockResolvedValueOnce(saved);
  await act(async () => { expect((await context.restoreTask(saved.id)).cacheSaved).toBe(false); });
  expect(context.tasks).toEqual([saved]);
});

const dailySummary = { frequency: 'DAILY' as const, timeZone: 'America/Sao_Paulo', anchorDate: '2026-11-04', materializedThrough: '2026-12-05', updatedAt: '2026-11-04T12:00:00Z' };
it('criação DAILY materializa e publica snapshot em dias consecutivos no calendário; startup não duplica', async () => {
  const { taskCountsByDay, tasksForDay } = require('../src/utils/calendar');
  const occurrences = ['2026-11-04', '2026-11-05', '2026-11-06'].map((key, index) => ({
    ...saved, id: `daily-${index}`, recurrence: dailySummary, recurrenceSeriesId: 'series', occurrenceKey: key, dueDateKey: key,
  }));
  jest.mocked(createTask).mockResolvedValueOnce(occurrences[0]);
  jest.mocked(getTasks).mockResolvedValue(occurrences);
  const count = jest.mocked(materializeRecurrences).mock.calls.length;
  await act(async () => {expect(await context.addTask(draft)).toMatchObject({ recurrenceRefreshFailed: false, cacheSaved: true });});
  expect(materializeRecurrences).toHaveBeenCalledTimes(count + 1);
  expect(taskCountsByDay(context.tasks)).toEqual({ '2026-11-04': 1, '2026-11-05': 1, '2026-11-06': 1 });
  occurrences.forEach(task => expect(tasksForDay(context.tasks, task.dueDateKey)).toEqual([expect.objectContaining({ id: task.id })]));
  expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual(context.tasks);
  await act(async () => renderer.unmount()); await mount();
  expect(context.tasks).toHaveLength(3);
  expect(new Set(context.tasks.map(task => task.occurrenceKey)).size).toBe(3);
});
it.each(['materialize', 'refresh'])('falha parcial em %s mantém primeira ocorrência e não repete criação', async stage => {
  const first = { ...saved, recurrence: dailySummary, recurrenceSeriesId: 'series', occurrenceKey: '2026-11-04' };
  jest.mocked(createTask).mockResolvedValueOnce(first);
  if (stage === 'materialize') {jest.mocked(materializeRecurrences).mockRejectedValueOnce(new Error('offline'));}
  else {jest.mocked(getTasks).mockRejectedValueOnce(new Error('offline'));}
  await act(async () => {expect(await context.addTask(draft)).toMatchObject({ recurrenceRefreshFailed: true, cacheSaved: true });});
  expect(context.tasks).toEqual([first]);
  expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual([first]);
  expect(createTask).toHaveBeenCalledTimes(1);
});
it('cache falha após materialização: mantém snapshot confirmado e não gera novamente', async () => {
  const first = { ...saved, recurrence: dailySummary, recurrenceSeriesId: 'series', occurrenceKey: '2026-11-04' };
  const next = { ...first, id: 'next', occurrenceKey: '2026-11-05' };
  jest.mocked(createTask).mockResolvedValueOnce(first);
  jest.mocked(getTasks).mockResolvedValueOnce([first, next]);
  jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('disk'));
  const count = jest.mocked(materializeRecurrences).mock.calls.length;
  await act(async () => {expect(await context.addTask(draft)).toMatchObject({ cacheSaved: false, recurrenceRefreshFailed: false });});
  expect(context.tasks).toEqual([first, next]);
  expect(materializeRecurrences).toHaveBeenCalledTimes(count + 1);
  expect(createTask).toHaveBeenCalledTimes(1);
});
it('criação comum não materializa nem busca snapshot adicional', async () => {
  const count = jest.mocked(materializeRecurrences).mock.calls.length;
  const reads = jest.mocked(getTasks).mock.calls.length;
  await act(async () => {await context.addTask(draft);});
  expect(materializeRecurrences).toHaveBeenCalledTimes(count);
  expect(getTasks).toHaveBeenCalledTimes(reads);
});
it('reconcilia lembretes uma única vez com snapshot final após persistência', async () => {
  const first = { ...saved, recurrence: dailySummary, recurrenceSeriesId: 'series', occurrenceKey: '2026-11-04' };
  const second = { ...first, id: 'next', occurrenceKey: '2026-11-05' };
  jest.mocked(createTask).mockResolvedValueOnce(first);
  jest.mocked(getTasks).mockResolvedValueOnce([first, second]);
  const reconcile = jest.spyOn(reminderScheduler, 'reconcile').mockImplementation(async (snapshot: unknown) => {
    expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual(snapshot);
    return { state: 'not_required' as const };
  });
  try {
    await act(async () => {await context.addTask(draft);});
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledWith(context.tasks, true);
  } finally {reconcile.mockRestore();}
});


it.each([['WEEKLY', true], ['WEEKLY', false], ['MONTHLY', true], ['NONE', true], ['NONE', false]] as const)('auditoria B: %s propaga a Context e Details (cache %s)', async (frequency, cacheSaved) => {
  const first = { ...saved, recurrence: dailySummary, recurrenceSeriesId: 'series', occurrenceKey: '2026-11-04' };
  const second = { ...first, id: 'next', occurrenceKey: '2026-11-05', title: 'Individual' };
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', JSON.stringify([first, second])); await mount();
  await act(async () => renderer.update(<ProjectProvider><TaskProvider><Probe /><TaskDetailsScreen /></TaskProvider></ProjectProvider>));
  expect(JSON.stringify(renderer.toJSON())).toContain('Diariamente');
  const before = context.tasks;
  const summary = { ...dailySummary, frequency, updatedAt: '2026-11-07T14:00:00Z', materializedThrough: '2026-12-08' };
  jest.mocked(updateRecurrenceSeries).mockResolvedValue({ ...summary, id: 'series' } as Awaited<ReturnType<typeof updateRecurrenceSeries>>);
  if (!cacheSaved) { jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk')); }
  const calls = jest.mocked(materializeRecurrences).mock.calls.length;
  await act(async () => { expect(await context.changeRecurrenceRule(first.id, 'series', dailySummary.updatedAt, frequency)).toMatchObject({ cacheSaved }); });
  expect(context.tasks).toEqual(before.map(item => ({ ...item, recurrence: summary })));
  expect(JSON.stringify(renderer.toJSON())).toContain(frequency === 'MONTHLY' ? 'Mensalmente' : frequency === 'WEEKLY' ? 'Semanalmente' : 'Novas ocorrências não serão criadas. As tarefas existentes permanecem.');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Diariamente');
  expect(materializeRecurrences).toHaveBeenCalledTimes(calls);
});


it.each(['DAILY', 'WEEKLY', 'MONTHLY'] as const)('issue 58: ativação %s publica futuras no Context/cache e calendário', async frequency => {
  const { fromApiTask } = jest.requireActual('../src/services/taskService');
  const api = { id: saved.id, title: saved.title, projectId: 'remote', priority: 'MEDIUM', status: 'PENDING',
    done: false, progress: 0, favorite: false, startDate: '2026-11-10', dueDate: '2026-11-10',
    createdAt: '2026-11-10T10:00:00Z', updatedAt: '2026-11-10T10:01:00Z', reminders: [],
    recurrenceSeriesId: 'series-58', occurrenceKey: '2026-11-10', recurrence: { ...dailySummary, frequency } };
  const first = fromApiTask(api);
  const futureDay = frequency === 'MONTHLY' ? '2026-12-10' : frequency === 'WEEKLY' ? '2026-11-17' : '2026-11-11';
  const future = { ...first, id: 'future-58', remoteId: 'future-58', occurrenceKey: futureDay, dueDateKey: futureDay };
  const listener = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  await act(async () => renderer.unmount()); await mount();
  await act(async () => { await context.addTask(draft); });
  jest.mocked(activateRecurrence).mockResolvedValueOnce({ series: { ...dailySummary, frequency, id: 'series-58' }, firstOccurrence: api } as never);
  jest.mocked(getTasks).mockResolvedValue([first, future]);
  const count = jest.mocked(materializeRecurrences).mock.calls.length;
  await act(async () => { await context.activateTaskRecurrence(saved.id, frequency, 'America/Sao_Paulo', 'request-58'); });
  expect(context.tasks.map(task => task.id)).toContain('future-58');
  expect(materializeRecurrences).toHaveBeenCalledTimes(count + 1);
  expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual(context.tasks);
  const { tasksForDay } = require('../src/utils/calendar');
  expect(tasksForDay(context.tasks, future.dueDateKey)).toEqual([expect.objectContaining({ id: future.id })]);
  await act(async () => renderer.unmount()); await mount();
  expect(context.tasks).toHaveLength(2);
  const foreground = listener.mock.calls.at(-1)![1];
  await act(async () => { foreground('background'); foreground('active'); });
  expect(context.tasks).toHaveLength(2);
  expect(new Set(context.tasks.map(item => item.occurrenceKey)).size).toBe(2);

});


it.each(['materialize', 'refresh', 'cache'])('issue 58: falha parcial %s mantém série e recupera no restart', async stage => {
  const { fromApiTask } = jest.requireActual('../src/services/taskService');
  const api = { id: saved.id, title: saved.title, projectId: 'remote', priority: 'MEDIUM', status: 'PENDING',
    done: false, progress: 0, startDate: '2026-11-10', dueDate: '2026-11-10', reminders: [],
    recurrenceSeriesId: 'series-58', occurrenceKey: '2026-11-10', recurrence: dailySummary };
  const first = fromApiTask(api), future = { ...first, id: 'future', remoteId: 'future', occurrenceKey: '2026-11-11' };
  await act(async () => { await context.addTask(draft); });
  jest.mocked(activateRecurrence).mockResolvedValueOnce({ series: { ...dailySummary, id: 'series-58' }, firstOccurrence: api } as never);
  jest.mocked(getTasks).mockResolvedValue([first, future]);
  if (stage === 'materialize') {jest.mocked(materializeRecurrences).mockRejectedValueOnce(new Error('offline'));}
  if (stage === 'refresh') {jest.mocked(getTasks).mockRejectedValueOnce(new Error('offline'));}
  if (stage === 'cache') {jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('disk'));}
  await act(async () => {
    expect(await context.activateTaskRecurrence(saved.id, 'DAILY', 'America/Sao_Paulo', '58')).toMatchObject(
      stage === 'cache' ? { cacheSaved: false } : { recurrenceRefreshFailed: true });
  });
  expect(context.tasks[0].recurrenceSeriesId).toBe('series-58');
  expect(activateRecurrence).toHaveBeenCalledTimes(1);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {storage.set(key, value);});
  await act(async () => renderer.unmount()); await mount();
  expect(context.tasks).toHaveLength(2);
  expect(activateRecurrence).toHaveBeenCalledTimes(1);
});

it('issue 58: reativação NONE usa série existente e publica snapshot', async () => {
  const first = { ...saved, recurrenceSeriesId: 'series', occurrenceKey: '2026-11-10', recurrence: { ...dailySummary, frequency: 'NONE' as const } };
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', JSON.stringify([first])); await mount();
  jest.mocked(updateRecurrenceSeries).mockResolvedValueOnce({ ...dailySummary, id: 'series' } as never);
  jest.mocked(getTasks).mockResolvedValueOnce([{ ...first, recurrence: dailySummary }, { ...first, id: 'next', occurrenceKey: '2026-11-11', recurrence: dailySummary }]);
  await act(async () => { await context.changeRecurrenceRule(first.id, 'series', dailySummary.updatedAt, 'DAILY'); });
  expect(context.tasks).toHaveLength(2);
  expect(activateRecurrence).not.toHaveBeenCalled();
});


it.each(['DAILY', 'WEEKLY', 'MONTHLY'] as const)('issue 58: criação %s reutiliza snapshot completo', async frequency => {
  const first = { ...saved, recurrenceSeriesId: 'series', occurrenceKey: '2026-11-10', recurrence: { ...dailySummary, frequency } };
  jest.mocked(createTask).mockResolvedValueOnce(first);
  jest.mocked(getTasks).mockResolvedValueOnce([first, { ...first, id: 'next', occurrenceKey: '2026-11-11' }]);
  await act(async () => { expect(await context.addTask(draft)).toMatchObject({ recurrenceRefreshFailed: false }); });
  expect(context.tasks).toHaveLength(2);
});

it('issue 58: reminders confirmados são persistidos antes da reconciliação e não reagendados no lifecycle', async () => {
  const records = new Map<string, number>();
  const bridge = {
    schedule: jest.fn(async (id: string, triggerAt: number) => {records.set(id, triggerAt); return 'scheduled';}),
    cancel: jest.fn(async (id: string) => {records.delete(id); return 'cancelled';}),
    getScheduled: async () => JSON.stringify({ usable: true, records: [...records].map(([notificationId, triggerAt]) => ({ notificationId, triggerAt })) }),
  };
  const scheduler = new ReminderScheduler(bridge, AsyncStorage, () => Date.parse('2026-11-10T10:00:00Z'));
  const reconcile = jest.spyOn(reminderScheduler, 'reconcile').mockImplementation(async (snapshot: Task[], complete?: boolean) => {
    expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual(expect.arrayContaining(snapshot));
    return scheduler.reconcile(snapshot, complete);
  });
  try {
    const api = { id: saved.id, title: saved.title, projectId: 'remote', priority: 'MEDIUM', status: 'PENDING', done: false, progress: 0,
      startDate: '2026-11-10', dueDate: '2026-11-10', time: '12:00', reminderTimeZone: 'America/Sao_Paulo',
      reminders: [{ id: 'r1', taskId: saved.id, offsetMinutes: 0, createdAt: '2026-11-10T10:00:00Z', updatedAt: '2026-11-10T10:00:00Z', triggerAt: '2026-11-10T15:00:00Z' }], recurrenceSeriesId: 'series', occurrenceKey: '2026-11-10', recurrence: dailySummary };
    const { fromApiTask } = jest.requireActual('../src/services/taskService');
    const first = fromApiTask(api);
    const future = fromApiTask({ ...api, id: 'future', dueDate: '2026-11-11', occurrenceKey: '2026-11-11', reminders: [{ id: 'r2', taskId: 'future', offsetMinutes: 0, createdAt: '2026-11-10T10:00:00Z', updatedAt: '2026-11-10T10:00:00Z', triggerAt: '2026-11-11T15:00:00Z' }] });
    await act(async () => {await context.addTask(draft);});
    jest.mocked(activateRecurrence).mockResolvedValueOnce({ series: { ...dailySummary, id: 'series' }, firstOccurrence: api } as never);
    jest.mocked(getTasks).mockResolvedValue([first, future]);
    bridge.schedule.mockClear();
    await act(async () => {await context.activateTaskRecurrence(saved.id, 'DAILY', 'America/Sao_Paulo', '58');});
    expect(bridge.schedule).toHaveBeenCalledTimes(2);
    await act(async () => renderer.unmount()); await mount();
    const foreground = jest.mocked(AppState.addEventListener).mock.calls.at(-1)![1];
    await act(async () => {foreground('background'); foreground('active');});
    expect(records.size).toBe(2);
    expect(bridge.schedule).toHaveBeenCalledTimes(2);
  } finally {reconcile.mockRestore();}
});

it('issue 58: GET atrasado após ativação não desfaz criação concorrente', async () => {
  const api = { id: saved.id, title: saved.title, projectId: 'remote', priority: 'MEDIUM', status: 'PENDING', done: false, progress: 0,
    startDate: '2026-11-10', dueDate: '2026-11-10', reminders: [], recurrenceSeriesId: 'series', occurrenceKey: '2026-11-10', recurrence: dailySummary };
  const { fromApiTask } = jest.requireActual('../src/services/taskService');
  const first = fromApiTask(api);
  await act(async () => {await context.addTask(draft);});
  jest.mocked(activateRecurrence).mockResolvedValueOnce({ series: { ...dailySummary, id: 'series' }, firstOccurrence: api } as never);
  let finish!: (tasks: Task[]) => void;
  jest.mocked(getTasks).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  let pending!: ReturnType<typeof context.activateTaskRecurrence>;
  await act(async () => {pending = context.activateTaskRecurrence(saved.id, 'DAILY', 'America/Sao_Paulo', '58');});
  // Another task can mutate while the window GET is pending.
  const other = { ...saved, id: 'other', title: 'Other' };
  jest.mocked(createTask).mockResolvedValueOnce(other);
  await act(async () => {await context.addTask(draft);});
  await act(async () => {finish([first]); expect(await pending).toMatchObject({ recurrenceRefreshFailed: true });});
  expect(context.tasks.find(item => item.id === other.id)?.title).toBe('Other');
  expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual(context.tasks);
});


async function prepareDeleteScope(frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY', scope: 'future' | 'all' = 'future') {
  const series = { ...dailySummary, id: 'series-61', clientId: 'client-61', firstOccurrenceKey: '2026-11-10', createdAt: dailySummary.updatedAt,
    frequency, endBeforeOccurrenceKey: null, deletedAt: null,
    template: { title: 'QA isolated', description: null, projectId: 'remote', priority: 'MEDIUM' as const, time: null, startOffsetDays: 0, subtasks: [], reminders: [] } };
  const keys = frequency === 'MONTHLY' ? ['2026-11-10', '2026-12-10', '2027-01-10'] : frequency === 'WEEKLY' ? ['2026-11-10', '2026-11-17', '2026-11-24'] : ['2026-11-10', '2026-11-11', '2026-11-12'];
  const api = keys.map((key, index) => ({
    id: index === 1 ? saved.id : `61-${index}`, title: saved.title, description: null, projectId: 'remote', priority: 'MEDIUM' as const, status: 'PENDING' as const,
    done: false, progress: 0, favorite: false, startDate: key, dueDate: key, time: null, createdAt: dailySummary.updatedAt,
    updatedAt: dailySummary.updatedAt, deletedAt: null, undoUntil: null, reminders: [], recurrenceSeriesId: series.id, occurrenceKey: key, recurrence: series,
  }));
  const mapped = api.map(item => fromApiTaskForTest(item));
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', JSON.stringify([...mapped, { ...saved, id: 'unrelated' }])); await mount();
  const changed = { ...series, endBeforeOccurrenceKey: scope === 'future' ? api[1].occurrenceKey : null,
    deletedAt: scope === 'all' ? '2026-11-10T15:00:00Z' : null, frequency: scope === 'all' ? 'NONE' as const : frequency,
    updatedAt: '2026-11-10T15:00:00Z' };
  const result = { series: changed, scope, fromOccurrenceKey: scope === 'future' ? api[1].occurrenceKey : null, deletedCount: scope === 'future' ? 2 : 3,
    alreadyApplied: false, tombstones: api.filter((_, index) => scope === 'all' || index >= 1).map(item => ({ ...item, deletedAt: '2026-11-10T15:00:00Z', updatedAt: '2026-11-10T15:00:00Z', recurrence: changed })) };
  jest.mocked(getRecurrenceSeries).mockResolvedValue(series);
  jest.mocked(deleteRecurrenceOccurrences).mockResolvedValue(result);
  return { mapped, result };
}
const fromApiTaskForTest = jest.requireActual('../src/services/taskService').fromApiTask as typeof import('../src/services/taskService').fromApiTask;

it.each(['DAILY', 'WEEKLY', 'MONTHLY'] as const)('issue 61: Context %s future/all persiste e publica sem Undo de lote', async frequency => {
  for (const scope of ['future', 'all'] as const) {
    const { mapped, result } = await prepareDeleteScope(frequency, scope);
    const suppressed = jest.spyOn(reminderScheduler, 'suspendMany');
    await act(async () => {expect(await context.deleteRecurringTask(saved.id, scope)).toMatchObject({ cacheSaved: true, pending: false });});
    const expected = scope === 'all' ? ['unrelated'] : [mapped[0].id, 'unrelated'];
    expect(context.tasks.map(item => item.id)).toEqual(expected);
    expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual(context.tasks);
    expect(context.undo).toBeNull();
    expect(suppressed.mock.calls.at(-1)![0].map(item => item.id)).toEqual(result.tombstones.map(item => item.id));
    const remote = [...context.tasks, ...result.tombstones.map(item => fromApiTaskForTest(item))];
    jest.mocked(getTasks).mockResolvedValue(remote);
    await act(async () => renderer.unmount()); await mount();
    const foreground = jest.mocked(AppState.addEventListener).mock.calls.at(-1)![1];
    await act(async () => {foreground('background'); foreground('active');});
    expect(context.tasks.map(item => item.id)).toEqual(expected);
    expect(JSON.parse(storage.get(RECURRENCE_DELETIONS_KEY)!)).toEqual([]);
    suppressed.mockRestore();
    jest.mocked(getTasks).mockResolvedValue([]);
  }
});

it('issue 61: resposta perdida mantém intenção e recupera mesmo comando no restart', async () => {
  const { result } = await prepareDeleteScope();
  jest.mocked(deleteRecurrenceOccurrences).mockRejectedValueOnce(new ApiError('resposta perdida'));
  await act(async () => {await expect(context.deleteRecurringTask(saved.id, 'future')).rejects.toThrow('pendente');});
  expect(JSON.parse(storage.get(RECURRENCE_DELETIONS_KEY)!)).toHaveLength(1);
  const retained = [...context.tasks.filter(item => item.id === '61-0' || item.id === 'unrelated'), ...result.tombstones.map(item => fromApiTaskForTest(item))];
  jest.mocked(getTasks).mockResolvedValue(retained);
  await act(async () => renderer.unmount()); await mount();
  expect(deleteRecurrenceOccurrences).toHaveBeenCalledTimes(2);
  expect(jest.mocked(deleteRecurrenceOccurrences).mock.calls[1]).toEqual(jest.mocked(deleteRecurrenceOccurrences).mock.calls[0]);
  expect(context.tasks.map(item => item.id)).toEqual(['61-0', 'unrelated']);
  expect(JSON.parse(storage.get(RECURRENCE_DELETIONS_KEY)!)).toEqual([]);
});

it('issue 61: cache falho após lote confirmado conserva memória e intenção para retry', async () => {
  await prepareDeleteScope();
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
    if (key === '@taskflow:tasks') {throw new Error('disk');} storage.set(key, value);
  });
  await act(async () => {expect(await context.deleteRecurringTask(saved.id, 'future')).toMatchObject({ cacheSaved: false, pending: true });});
  expect(context.tasks.map(item => item.id)).toEqual(['61-0', 'unrelated']);
  expect(JSON.parse(storage.get(RECURRENCE_DELETIONS_KEY)!)).toHaveLength(1);
});

it('issue 61: double click é bloqueado e conflito definitivo não apaga Tasks', async () => {
  await prepareDeleteScope();
  let reject!: (reason: unknown) => void;
  jest.mocked(deleteRecurrenceOccurrences).mockImplementationOnce(() => new Promise((_, fail) => {reject = fail;}));
  let pending!: ReturnType<typeof context.deleteRecurringTask>;
  await act(async () => {pending = context.deleteRecurringTask(saved.id, 'future');});
  await act(async () => {await expect(context.deleteRecurringTask(saved.id, 'all')).rejects.toThrow('Aguarde');});
  await act(async () => {reject(new ApiError('conflito', 409)); await expect(pending).rejects.toThrow('conflito');});
  expect(context.tasks).toHaveLength(4);
  expect(JSON.parse(storage.get(RECURRENCE_DELETIONS_KEY)!)).toEqual([]);
});


it('issue 61: DELETE individual com resposta perdida confirma tombstone sem Undo inseguro', async () => {
  await act(async () => {await context.addTask(draft);});
  jest.mocked(deleteTask).mockRejectedValueOnce(new ApiError('resposta perdida'));
  jest.mocked(getTasks).mockResolvedValueOnce([{ ...saved, deletedAt: '2026-11-10T15:00:00Z' }]);
  await act(async () => {expect(await context.deleteTask(saved.id)).toMatchObject({ cacheSaved: true });});
  expect(context.tasks).toEqual([]); expect(context.undo).toBeNull();
});


it('issue 61: falha ao finalizar journal retorna pendência sem perder exclusão confirmada', async () => {
  await prepareDeleteScope();
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
    if (key === RECURRENCE_DELETIONS_KEY && value === '[]') {throw new Error('journal disk');}
    storage.set(key, value);
  });
  await act(async () => {expect(await context.deleteRecurringTask(saved.id, 'future')).toMatchObject({ cacheSaved: true, pending: true });});
  expect(context.tasks.map(item => item.id)).toEqual(['61-0', 'unrelated']);
  expect(JSON.parse(storage.get(RECURRENCE_DELETIONS_KEY)!)).toHaveLength(1);
});
