import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskProvider, useTasks } from '../src/context/TaskContext';
import { ProjectProvider } from '../src/context/ProjectContext';
import { createTask, resolveProject, getTasks, getTaskById, updateTask, getTaskHistory, createSubtask, updateSubtask, deleteSubtask } from '../src/services/taskService';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../src/services/taskService', () => ({ createTask: jest.fn(), resolveProject: jest.fn(), getTasks: jest.fn(), getTaskById: jest.fn(), updateTask: jest.fn(), getTaskHistory: jest.fn(), createSubtask: jest.fn(), updateSubtask: jest.fn(), deleteSubtask: jest.fn(), mergeSubtasks: jest.requireActual('../src/services/taskService').mergeSubtasks }));
const storage = new Map<string, string>();
let context: ReturnType<typeof useTasks>;
let renderer: ReactTestRenderer.ReactTestRenderer;
const draft = { title: 'Nova', project: 'Geral', projectId: 'p7', priority: 'medium' as const, status: 'todo' as const, done: false, startDate: '2026-10-02', dueDate: '2026-10-03' };
const saved = { ...draft, id: 'server-uuid', projectId: 'remote' };
function Probe() { context = useTasks(); return null; }
async function mount() {
  await act(async () => { renderer = ReactTestRenderer.create(<ProjectProvider><TaskProvider><Probe /></TaskProvider></ProjectProvider>); });
}
beforeEach(async () => {
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
  expect(context.tasks).toEqual([{ ...saved, title: 'SQLite', progress: 60, subtasks: local.subtasks, reminders: local.reminders }, legacy]);
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
