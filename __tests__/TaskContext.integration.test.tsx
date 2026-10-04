import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskProvider, useTasks } from '../src/context/TaskContext';
import { ProjectProvider } from '../src/context/ProjectContext';
import { createTask, resolveProject, getTasks, getTaskById } from '../src/services/taskService';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../src/services/taskService', () => ({ createTask: jest.fn(), resolveProject: jest.fn(), getTasks: jest.fn(), getTaskById: jest.fn() }));
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
  await mount();
});
afterEach(async () => { await act(async () => renderer.unmount()); jest.clearAllMocks(); });
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
