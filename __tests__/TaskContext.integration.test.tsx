import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskProvider, useTasks } from '../src/context/TaskContext';
import { ProjectProvider } from '../src/context/ProjectContext';
import { createTask, resolveProject } from '../src/services/taskService';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../src/services/taskService', () => ({ createTask: jest.fn(), resolveProject: jest.fn() }));
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
