import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskProvider, useTasks } from '../src/context/TaskContext';
import { ProjectProvider } from '../src/context/ProjectContext';
import { reminderScheduler } from '../src/services/reminderScheduler';
import { createTask, updateTask, deleteTask, restoreTask, getTasks, createSubtask, updateSubtask, deleteSubtask, resolveProject } from '../src/services/taskService';
import { synchronize } from '../src/services/syncService';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../src/services/taskService', () => ({ ...jest.requireActual('../src/services/taskService'),
  createTask: jest.fn(), updateTask: jest.fn(), deleteTask: jest.fn(), restoreTask: jest.fn(), getTasks: jest.fn(),
  createSubtask: jest.fn(), updateSubtask: jest.fn(), deleteSubtask: jest.fn(), resolveProject: jest.fn(async () => 'p') }));
jest.mock('../src/services/reminderScheduler', () => ({ ...jest.requireActual('../src/services/reminderScheduler'),
  reminderScheduler: { reconcile: jest.fn(), suspend: jest.fn(), retry: jest.fn() } }));
jest.mock('../src/services/syncService', () => ({ ...jest.requireActual('../src/services/syncService'), synchronize: jest.fn() }));
const reminder = { id: 'r', taskId: 't', offsetMinutes: 15, createdAt: '2026-10-26T12:00:00Z', updatedAt: '2026-10-26T12:00:00Z', triggerAt: '2026-10-27T12:45:00Z' };
const draft = { title: 'Task', projectId: 'p7', project: 'P', startDate: '2026-10-26', dueDate: '2026-10-27', time: '10:00',
  priority: 'high' as const, status: 'todo' as const, done: false, reminderTimeZone: 'America/Sao_Paulo', reminders: [{ offsetMinutes: 15 }] };
const task = { ...draft, id: 't', remoteId: 't', projectId: 'p', dueDateKey: draft.dueDate, reminders: [reminder], remindersConfirmed: true };
let foreground: (state: AppStateStatus) => void;
let context: ReturnType<typeof useTasks>, renderer: ReactTestRenderer.ReactTestRenderer;
const storage = new Map<string, string>();
function Probe() {context = useTasks(); return null;}
async function mount() {await act(async () => {renderer = ReactTestRenderer.create(<ProjectProvider><TaskProvider><Probe /></TaskProvider></ProjectProvider>);});}
beforeEach(async () => {
  jest.resetAllMocks(); storage.clear();
  jest.mocked(resolveProject).mockResolvedValue('p');
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {foreground = listener; return { remove: jest.fn() };});
  storage.set('@taskflow:tasks', '[]');
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {storage.set(key, value);});
  jest.mocked(getTasks).mockResolvedValue([task]);
  jest.mocked(createTask).mockResolvedValue(task); jest.mocked(updateTask).mockResolvedValue(task);
  jest.mocked(deleteTask).mockResolvedValue({ id: 't', deletedAt: '2026-10-26T12:00:00Z', updatedAt: '2026-10-26T12:00:00Z' });
  jest.mocked(restoreTask).mockResolvedValue(task);
  jest.mocked(reminderScheduler.reconcile).mockResolvedValue({ state: 'scheduled' });
  jest.mocked(reminderScheduler.suspend).mockResolvedValue({ state: 'not_required' });
  jest.mocked(reminderScheduler.retry).mockResolvedValue({ state: 'not_required' });
  await mount(); jest.mocked(reminderScheduler.reconcile).mockClear();
});
afterEach(async () => {await act(async () => renderer.unmount()); jest.restoreAllMocks();});
it('create espera POST e cache antes do journal/scheduler', async () => {
  let finish!: (value: typeof task) => void;
  jest.mocked(createTask).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  let result!: Promise<unknown>;
  await act(async () => {result = context.addTask(draft);});
  expect(reminderScheduler.reconcile).not.toHaveBeenCalled();
  jest.mocked(reminderScheduler.reconcile).mockImplementationOnce(async tasks => {
    expect(JSON.parse(storage.get('@taskflow:tasks')!)).toEqual(tasks); return { state: 'scheduled' };
  });
  await act(async () => {finish(task); await result;});
  expect(createTask).toHaveBeenCalledTimes(1); expect(reminderScheduler.reconcile).toHaveBeenCalledWith([task]);
});
it('create API falha não agenda draft', async () => {
  jest.mocked(createTask).mockRejectedValueOnce(new Error('offline'));
  await act(async () => {await expect(context.addTask(draft)).rejects.toThrow('offline');});
  expect(reminderScheduler.reconcile).not.toHaveBeenCalled();
});
it('API confirma e Android falha: Task/cache permanecem salvos e POST não repete', async () => {
  jest.mocked(reminderScheduler.reconcile).mockResolvedValueOnce({ state: 'error', message: 'Tarefa salva, mas lembrete pendente.' });
  await act(async () => {expect(await context.addTask(draft)).toMatchObject({ cacheSaved: true, scheduling: { state: 'error' } });});
  expect(context.tasks).toHaveLength(1); expect(createTask).toHaveBeenCalledTimes(1);
  expect(context.reminderScheduling.t.state).toBe('error');
});
it('API confirma e cache falha: retorna pending sem agendar ou repetir POST', async () => {
  jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('disk'));
  await act(async () => {expect(await context.addTask(draft)).toMatchObject({ cacheSaved: false, scheduling: { state: 'pending' } });});
  expect(reminderScheduler.reconcile).not.toHaveBeenCalled(); expect(createTask).toHaveBeenCalledTimes(1);
});
it('update irrelevante não toca scheduler; temporal usa estado confirmado', async () => {
  jest.mocked(updateTask).mockResolvedValueOnce({ ...task, title: 'Outra' });
  await act(async () => {await context.updateTask('t', { title: 'Outra' });});
  expect(reminderScheduler.reconcile).not.toHaveBeenCalled();
  const next = { ...task, time: '11:00', reminders: [{ ...reminder, triggerAt: '2026-10-27T13:45:00Z' }] };
  jest.mocked(updateTask).mockResolvedValueOnce(next);
  await act(async () => {await context.updateTask('t', { time: '11:00' });});
  expect(reminderScheduler.reconcile).toHaveBeenLastCalledWith([next]);
});
it('DELETE cancela provisoriamente antes de API; restore chama API antes do scheduler e mantém IDs', async () => {
  jest.mocked(deleteTask).mockImplementationOnce(async () => {
    expect(reminderScheduler.suspend).toHaveBeenCalledWith(task);
    return { id: 't', deletedAt: 'now', updatedAt: 'now' };
  });
  await act(async () => {await context.deleteTask('t');});
  expect(context.tasks).toEqual([]); expect(context.undo?.id).toBe('t');
  jest.mocked(reminderScheduler.reconcile).mockClear();
  jest.mocked(restoreTask).mockImplementationOnce(async () => {
    expect(reminderScheduler.reconcile).not.toHaveBeenCalled(); return task;
  });
  await act(async () => {await context.restoreTask('t');});
  expect(context.tasks[0].reminders).toEqual([reminder]); expect(reminderScheduler.reconcile).toHaveBeenCalledWith([expect.objectContaining({ id: 't', reminders: [reminder] })]);
});
it('cancelamento não confirmado impede DELETE', async () => {
  jest.mocked(reminderScheduler.suspend).mockResolvedValueOnce({ state: 'error', message: 'Cancelamento pendente' });
  await act(async () => {await expect(context.deleteTask('t')).rejects.toThrow('Cancelamento pendente');});
  expect(deleteTask).not.toHaveBeenCalled(); expect(context.tasks).toHaveLength(1);
});
it('DELETE falha compensa com configuração confirmada anterior e não abre undo', async () => {
  jest.mocked(deleteTask).mockRejectedValueOnce(new Error('offline'));
  await act(async () => {await expect(context.deleteTask('t')).rejects.toThrow('offline');});
  expect(reminderScheduler.reconcile).toHaveBeenCalledWith([task]); expect(context.undo).toBeNull();
});
it('complete cancela antes de PATCH; falha compensa; reopen reconcilia remoto', async () => {
  jest.mocked(updateTask).mockRejectedValueOnce(new Error('offline'));
  await act(async () => {await expect(context.toggleTask('t')).rejects.toThrow('offline');});
  expect(reminderScheduler.suspend).toHaveBeenCalledWith(task); expect(reminderScheduler.reconcile).toHaveBeenCalledWith([task]);
  const completed = { ...task, done: true, status: 'completed' as const };
  jest.mocked(updateTask).mockResolvedValueOnce(completed);
  await act(async () => {await context.toggleTask('t');});
  expect(reminderScheduler.reconcile).toHaveBeenLastCalledWith([completed]);
  jest.mocked(updateTask).mockResolvedValueOnce(task);
  await act(async () => {await context.toggleTask('t');});
  expect(reminderScheduler.reconcile).toHaveBeenLastCalledWith([task]);
});
it.each(['add', 'toggle', 'remove'])('subtask %s reconcilia mudança de status efetiva da resposta', async action => {
  const child = { id: 's', title: 'Filha', done: false, remote: true };
  await act(async () => {context.updateTaskLocal('t', { subtasks: [child] });});
  const completed = { ...task, status: 'completed' as const, done: true, subtasks: [{ ...child, done: true }] };
  jest.mocked(createSubtask).mockResolvedValueOnce(completed); jest.mocked(updateSubtask).mockResolvedValueOnce(completed); jest.mocked(deleteSubtask).mockResolvedValueOnce(completed);
  await act(async () => {
    if (action === 'add') {await context.addSubtask('t', 'Nova');}
    else if (action === 'toggle') {await context.toggleSubtask('t', 's');}
    else {await context.removeSubtask('t', 's');}
  });
  expect(reminderScheduler.reconcile).toHaveBeenLastCalledWith([completed]);
});
it('sync só agenda snapshot completo depois de ambos os caches confirmados', async () => {
  const tombstone = { ...task, deletedAt: '2026-10-26T12:00:00Z' };
  jest.mocked(synchronize).mockResolvedValue({ projects: [], tasks: [], reminderSnapshot: [tombstone], pending: 0, conflicts: 0, tasksSent: 0, projectsSent: 0 });
  jest.mocked(reminderScheduler.reconcile).mockImplementationOnce(async (tasks, complete) => {
    expect(tasks).toEqual([tombstone]); expect(complete).toBe(true);
    expect(storage.get('@taskflow:tasks')).toBe('[]'); expect(storage.get('@taskflow:projects')).toBe('[]');
    return { state: 'not_required' };
  });
  await act(async () => {await context.synchronizeManually();});
  expect(reminderScheduler.reconcile).toHaveBeenCalledTimes(1);
});
it.each(['network', 'cache'])('sync falha em %s não reconcilia lista intermediária', async failure => {
  if (failure === 'network') {jest.mocked(synchronize).mockRejectedValueOnce(new Error('network'));}
  else {
    jest.mocked(synchronize).mockResolvedValueOnce({ projects: [], tasks: [], reminderSnapshot: [], pending: 0, conflicts: 0, tasksSent: 0, projectsSent: 0 });
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('cache'));
  }
  await act(async () => {await expect(context.synchronizeManually()).rejects.toThrow(failure);});
  expect(reminderScheduler.reconcile).not.toHaveBeenCalled();
});
it('cache legado remoto [] preserva evidência e não ressuscita labels', async () => {
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', JSON.stringify([{ ...task, reminders: ['15 min antes'] }]));
  jest.mocked(getTasks).mockResolvedValueOnce([{ ...task, reminders: [], reminderTimeZone: null }]);
  await mount();
  expect(context.tasks[0]).toMatchObject({ reminders: [], legacyReminders: ['15 min antes'], reminderTimeZone: null });
});
it('startup cache inválido não reconcilia nem sobrescreve dados', async () => {
  await act(async () => renderer.unmount()); storage.set('@taskflow:tasks', 'invalid');
  jest.mocked(reminderScheduler.reconcile).mockClear(); jest.mocked(reminderScheduler.retry).mockClear();
  await mount(); expect(storage.get('@taskflow:tasks')).toBe('invalid');
  expect(reminderScheduler.reconcile).not.toHaveBeenCalled(); expect(reminderScheduler.retry).not.toHaveBeenCalled();
});
it('startup aguarda leitura completa; cache parcial não agenda durante GET pendente', async () => {
  await act(async () => renderer.unmount());
  storage.set('@taskflow:tasks', JSON.stringify([task]));
  let finish!: (tasks: typeof task[]) => void;
  jest.mocked(getTasks).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  await mount(); expect(context.loading).toBe(true); expect(reminderScheduler.reconcile).not.toHaveBeenCalled();
  await act(async () => finish([task]));
  expect(reminderScheduler.reconcile).toHaveBeenCalledWith([expect.objectContaining({ id: 't' })], true);
});
it('foreground consulta snapshot completo; falha de rede usa somente retry do journal', async () => {
  jest.mocked(getTasks).mockResolvedValueOnce([]);
  await act(async () => {foreground('active');});
  expect(reminderScheduler.reconcile).toHaveBeenCalledWith([], true);
  jest.mocked(reminderScheduler.reconcile).mockClear();
  jest.mocked(getTasks).mockRejectedValueOnce(new Error('offline'));
  await act(async () => {foreground('active');});
  expect(reminderScheduler.reconcile).not.toHaveBeenCalled(); expect(reminderScheduler.retry).toHaveBeenCalled();
});
it('conclusão pedida mas não efetivada pela API desfaz supressão com estado remoto', async () => {
  jest.mocked(updateTask).mockResolvedValueOnce(task);
  await act(async () => {await context.updateTask('t', { status: 'completed' });});
  expect(reminderScheduler.suspend).toHaveBeenCalledWith(task);
  expect(reminderScheduler.reconcile).toHaveBeenLastCalledWith([task]);
});
it('edição irrelevante preserva resultado unavailable anterior, sem falso sucesso ou retry de PATCH', async () => {
  jest.mocked(reminderScheduler.reconcile).mockResolvedValueOnce({ state: 'unavailable' });
  await act(async () => {await context.addTask(draft);});
  jest.mocked(reminderScheduler.reconcile).mockClear(); jest.mocked(updateTask).mockResolvedValueOnce({ ...task, title: 'Outra' });
  await act(async () => {expect((await context.updateTask('t', { title: 'Outra' })).scheduling.state).toBe('unavailable');});
  expect(reminderScheduler.reconcile).not.toHaveBeenCalled(); expect(updateTask).toHaveBeenCalledTimes(1);
});
it('DELETE confirmado não aguarda nova reconciliação durante a janela de undo', async () => {
  jest.mocked(reminderScheduler.reconcile).mockRejectedValueOnce(new Error('Não chamar após DELETE'));
  await act(async () => {await expect(context.deleteTask('t')).resolves.toMatchObject({ scheduling: { state: 'not_required' } });});
  expect(reminderScheduler.reconcile).not.toHaveBeenCalled(); expect(context.undo?.id).toBe('t');
});
