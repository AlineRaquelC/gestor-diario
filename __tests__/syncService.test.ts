import { normalizeReminderCache } from '../src/models/reminder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { synchronize, preserveTask, SYNC_LEDGER_KEY } from '../src/services/syncService';
import { listProjects, createProject, updateProject } from '../src/services/projectService';
import { getTasksForSync, importLocalTask } from '../src/services/taskService';
import type { Project } from '../src/context/ProjectContext';
import type { Task } from '../src/context/TaskContext';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../src/services/projectService', () => ({ listProjects: jest.fn(), createProject: jest.fn(), updateProject: jest.fn() }));
jest.mock('../src/services/taskService', () => ({ getTasksForSync: jest.fn(), importLocalTask: jest.fn(), mergeSubtasks: jest.requireActual('../src/services/taskService').mergeSubtasks }));
const storage = new Map<string, string>();
const project: Project = { id: 'local-p', name: 'Mesmo nome', color: '#fff', icon: 'P' };
const task: Task = { reminders: [], id: 'local-t', projectId: project.id, project: project.name, title: 'Legado', priority: 'high', status: 'todo', done: false, startDate: '2020-01-01', dueDate: '2020-01-02' };
let projects: Project[], tasks: Task[];
beforeEach(() => {
  jest.resetAllMocks(); storage.clear(); projects = []; tasks = [];
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {storage.set(key, value);});
  jest.mocked(listProjects).mockImplementation(async () => [...projects]);
  jest.mocked(getTasksForSync).mockImplementation(async () => [...tasks]);
  jest.mocked(createProject).mockImplementation(async (local, clientId) => {
    expect(storage.get(SYNC_LEDGER_KEY)).toContain(clientId);
    const remote = projects.find(item => item.clientId === clientId) ?? { ...local, id: `rp-${projects.length}`, clientId };
    if (!projects.includes(remote)) {projects.push(remote);} return remote;
  });
  jest.mocked(importLocalTask).mockImplementation(async (local, projectId, clientId) => {
    expect(projects.some(item => item.id === projectId)).toBe(true);
    expect(storage.get(SYNC_LEDGER_KEY)).toContain(clientId);
    const remote = tasks.find(item => item.clientId === clientId) ?? { ...local, id: `rt-${tasks.length}`, remoteId: `rt-${tasks.length}`, projectId, clientId, subtasks: [] };
    if (!tasks.includes(remote)) {tasks.push(remote);} return remote;
  });
  jest.mocked(updateProject).mockImplementation(async (id, local) => {
    const remote = { ...local, id }; projects = projects.map(item => item.id === id ? remote : item); return remote;
  });
});
it('envia projetos primeiro, salva remoteId, resolve projectId e preserva identidade local do projeto', async () => {
  const result = await synchronize([project], [task]);
  expect(result.projects[0]).toMatchObject({ id: project.id, remoteId: 'rp-0' });
  expect(result.tasks[0]).toMatchObject({ id: 'rt-0', remoteId: 'rt-0', localId: task.id, projectId: 'rp-0' });
  expect(result).toMatchObject({ pending: 0, projectsSent: 1, tasksSent: 1 });
  expect(importLocalTask).toHaveBeenCalledWith(task, 'rp-0', expect.any(String));
});
it('duas execuções e reexecução com cache antigo não duplicam Projects/Tasks', async () => {
  const first = await synchronize([project], [task]);
  const second = await synchronize(first.projects, first.tasks);
  await synchronize([project], [task]);
  expect(projects).toHaveLength(1); expect(tasks).toHaveLength(1);
  expect(createProject).toHaveBeenCalledTimes(1); expect(importLocalTask).toHaveBeenCalledTimes(1);
  expect(second.projects).toEqual(first.projects);
  expect(second.tasks).toEqual(first.tasks);
});
it('homônimos com IDs distintos nunca são fundidos', async () => {
  const result = await synchronize([project, { ...project, id: 'p2' }], [task, { ...task, id: 't2', projectId: 'p2' }]);
  expect(projects).toHaveLength(2); expect(tasks).toHaveLength(2);
  expect(result.tasks.map(item => item.projectId)).toEqual(['rp-0', 'rp-1']);
});
it('registro já remoto por id não precisa de remoteId antigo nem de POST', async () => {
  projects = [{ ...project, id: 'rp' }]; tasks = [{ ...task, id: 'rt', projectId: 'rp', remoteId: 'rt' }];
  const result = await synchronize([{ ...project, remoteId: 'rp' }], [{ ...task, id: 'rt', projectId: 'rp' }]);
  expect(createProject).not.toHaveBeenCalled(); expect(importLocalTask).not.toHaveBeenCalled();
  expect(result.tasks[0].remoteId).toBe('rt');
});
it('projeto removido permanece referência legada, sem recriação nem upload de dependentes', async () => {
  const result = await synchronize([{ ...project, remoteId: 'removed' }], [task]);
  expect(result.projects[0]).toMatchObject({ id: project.id, remoteId: 'removed', syncPending: expect.any(String) });
  expect(result.tasks[0]).toMatchObject({ ...task, syncPending: expect.any(String) });
  expect(result.pending).toBe(2); expect(createProject).not.toHaveBeenCalled(); expect(importLocalTask).not.toHaveBeenCalled();
});
it.each([undefined, 'missing'])('tarefa sem vínculo resolvido (%s) fica intacta e pendente', async projectId => {
  const local = { ...task, projectId }; const result = await synchronize([project], [local]);
  expect(result.tasks[0]).toMatchObject({ id: local.id, title: local.title, syncPending: expect.any(String) });
  expect(importLocalTask).not.toHaveBeenCalled();
});
it('não usa nome como fallback quando falta projectId', async () => {
  const result = await synchronize([project], [{ ...task, projectId: undefined }]);
  expect(result.tasks[0].projectId).toBeUndefined(); expect(result.pending).toBe(1);
});
it('preserva subtarefas, notas/histórico antigos e lembretes sem enviar CRUD de filhos', async () => {
  const local = { ...task, subtasks: [{ id: 'old', title: 'Local', done: true }], reminders: ['Lembrar'], notes: [{ content: 'Nota' }], history: [{ action: 'Old' }] };
  const result = await synchronize([project], [normalizeReminderCache(local)]);
  expect(result.tasks[0]).toMatchObject({ subtasks: local.subtasks, reminders: [], legacyReminders: local.reminders, notes: local.notes, history: local.history });
  const ledger = JSON.parse(storage.get(SYNC_LEDGER_KEY)!);
  expect(ledger.snapshots['task:local-t'][0]).toEqual(normalizeReminderCache(local));
});
it('soft delete remoto prevalece, conserva snapshot e não envia nova criação', async () => {
  tasks = [{ ...task, id: 'rt', remoteId: 'rt', deletedAt: '2026-10-21' }];
  const local = { ...task, id: 'rt' }; const result = await synchronize([], [local]);
  expect(result.tasks).toEqual([]); expect(importLocalTask).not.toHaveBeenCalled();
  expect(JSON.parse(storage.get(SYNC_LEDGER_KEY)!).snapshots['task:rt']).toEqual([local]);
});
it('tarefa remota ausente ou UUID antigo não é recriada', async () => {
  const result = await synchronize([project], [{ ...task, remoteId: 'missing' }, { ...task, id: 'cf4af3a6-6058-4a51-9d3f-9fb1387fbcee' }]);
  expect(result.pending).toBe(2); expect(result.tasks).toHaveLength(2); expect(importLocalTask).not.toHaveBeenCalled();
});
it('servidor vence conflito e versão local permanece no ledger e snapshot', async () => {
  projects = [{ ...project, id: 'rp', name: 'Remoto' }]; tasks = [{ ...task, id: 'rt', title: 'Remota', projectId: 'rp' }];
  const result = await synchronize([{ ...project, remoteId: 'rp' }], [{ ...task, id: 'rt' }]);
  expect(result.projects[0].name).toBe('Remoto'); expect(result.tasks[0].title).toBe('Remota');
  expect(result.tasks[0].syncSnapshot?.title).toBe(task.title);
  expect(JSON.parse(storage.get(SYNC_LEDGER_KEY)!).snapshots['project:local-p'][0].name).toBe(project.name);
});
it('edição local de projeto sem alteração remota desde última sync usa PATCH', async () => {
  projects = [{ ...project, id: 'rp', updatedAt: 'v1' }];
  const result = await synchronize([{ ...project, remoteId: 'rp', name: 'Editado', dirty: true, updatedAt: 'v1' }], []);
  expect(updateProject).toHaveBeenCalledTimes(1); expect(result.projects[0]).toMatchObject({ name: 'Editado', dirty: false });
});
it('conflito concorrente de projeto preserva snapshot e não sobrescreve servidor', async () => {
  projects = [{ ...project, id: 'rp', name: 'Servidor novo', updatedAt: 'v2' }];
  const result = await synchronize([{ ...project, remoteId: 'rp', name: 'Local novo', dirty: true, updatedAt: 'v1' }], []);
  expect(updateProject).not.toHaveBeenCalled(); expect(result.projects[0].name).toBe('Servidor novo');
});
it('falha parcial guarda vínculo confirmado e retomada não repete projeto anterior', async () => {
  const create = jest.mocked(createProject).getMockImplementation()!;
  jest.mocked(createProject).mockImplementationOnce(create).mockRejectedValueOnce(new Error('offline'));
  const locals = [project, { ...project, id: 'p2' }];
  await expect(synchronize(locals, [task])).rejects.toThrow('offline');
  expect(importLocalTask).not.toHaveBeenCalled(); expect(projects).toHaveLength(1);
  expect(JSON.parse(storage.get(SYNC_LEDGER_KEY)!).entries['project:local-p'].remoteId).toBe('rp-0');
  await synchronize(locals, [task]); expect(projects).toHaveLength(2); expect(tasks).toHaveLength(1);
});
it.each(['project', 'task'])('POST %s confirmado com resposta perdida é recuperado por clientId após reabertura', async kind => {
  if (kind === 'project') {
    const create = jest.mocked(createProject).getMockImplementation()!;
    jest.mocked(createProject).mockImplementationOnce(async (...args) => {await create(...args); throw new Error('resposta perdida');});
  } else {
    const create = jest.mocked(importLocalTask).getMockImplementation()!;
    jest.mocked(importLocalTask).mockImplementationOnce(async (...args) => {await create(...args); throw new Error('resposta perdida');});
  }
  await expect(synchronize([project], [task])).rejects.toThrow('resposta perdida');
  await synchronize([project], [task]); expect(projects).toHaveLength(1); expect(tasks).toHaveLength(1);
});
it('falha ao gravar vínculo após commit é recuperada pela chave previamente persistida', async () => {
  const save = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(save).mockRejectedValueOnce(new Error('disco'));
  await expect(synchronize([project], [task])).rejects.toThrow('disco');
  await synchronize([project], [task]); expect(projects).toHaveLength(1); expect(tasks).toHaveLength(1);
});
it('storage falhou antes do POST: não envia nada', async () => {
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disco'));
  await expect(synchronize([project], [task])).rejects.toThrow('disco'); expect(createProject).not.toHaveBeenCalled();
});
it('offline no primeiro download não muda cache, ledger ou entradas', async () => {
  storage.set('@taskflow:tasks', JSON.stringify([task]));
  jest.mocked(listProjects).mockRejectedValueOnce(new Error('offline'));
  await expect(synchronize([project], [task])).rejects.toThrow('offline');
  expect(storage.get('@taskflow:tasks')).toBe(JSON.stringify([task])); expect(storage.has(SYNC_LEDGER_KEY)).toBe(false);
  expect(createProject).not.toHaveBeenCalled();
});
it('falha de upload de tarefa não confirma sync nem perde snapshot', async () => {
  jest.mocked(importLocalTask).mockRejectedValueOnce(new Error('offline'));
  await expect(synchronize([project], [task])).rejects.toThrow('offline');
  expect(JSON.parse(storage.get(SYNC_LEDGER_KEY)!).snapshots['task:local-t'][0]).toEqual(task);
});
it('falha no download final não confirma sync e permite retomar sem duplicar', async () => {
  jest.mocked(getTasksForSync).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('download'));
  await expect(synchronize([project], [task])).rejects.toThrow('download');
  await synchronize([project], [task]); expect(projects).toHaveLength(1); expect(tasks).toHaveLength(1);
});
it('ledger inválido é preservado sem iniciar POST', async () => {
  storage.set(SYNC_LEDGER_KEY, '{"entries":[]}');
  await expect(synchronize([project], [task])).rejects.toThrow(/inválido/); expect(createProject).not.toHaveBeenCalled();
});

it.each([{ startDate: 'inválida' }, { startDate: '2026-02-30' }, { dueDate: '2019-01-01' }, { title: '' }])('legado inválido %j fica pendente sem inventar dados nem bloquear os outros', async changes => {
  const result = await synchronize([project], [{ ...task, ...changes }, { ...task, id: 'valid' }]);
  expect(result.pending).toBe(1); expect(result.tasks.find(item => item.id === task.id)).toMatchObject({ ...changes, syncPending: expect.any(String) });
  expect(importLocalTask).toHaveBeenCalledTimes(1);
});

it('leituras sucessivas preservam todas as versões locais divergentes sem snapshots recursivos', () => {
  const first = preserveTask({ ...task, title: 'Servidor 1' }, task);
  const edited = { ...first, title: 'Edição local 2' };
  const second = preserveTask({ ...task, title: 'Servidor 2' }, edited);
  expect(second.syncSnapshots?.map(item => item.title)).toEqual([task.title, 'Edição local 2']);
  expect(second.syncSnapshots?.every(item => !('syncSnapshots' in item) && !('syncSnapshot' in item))).toBe(true);
});
it('reminders/fuso remotos prevalecem; [] autoritativo; timestamps não geram conflito artificial', async () => {
  const reminder = { id: 'r', taskId: 'rt', offsetMinutes: 15, createdAt: '2026-10-26T12:00:00Z', updatedAt: '2026-10-26T12:00:00Z', triggerAt: '2026-10-27T12:45:00Z' };
  const local = { ...task, id: 'rt', remoteId: 'rt', reminders: [reminder], reminderTimeZone: 'America/Sao_Paulo', legacyReminders: ['Lembrar'] };
  tasks = [{ ...local, reminders: [], reminderTimeZone: null }];
  const result = await synchronize([], [local]);
  expect(result.tasks[0]).toMatchObject({ reminders: [], reminderTimeZone: null, legacyReminders: ['Lembrar'] });
  expect(result.reminderSnapshot).toEqual(tasks);
  expect(importLocalTask).not.toHaveBeenCalled();
  const { taskFields } = require('../src/services/syncService') as typeof import('../src/services/syncService');
  expect(taskFields(local)).toBe(taskFields({ ...local, reminders: [{ ...reminder, updatedAt: '2026-10-26T13:00:00Z' }] }));
  expect(taskFields(local)).not.toBe(taskFields({ ...local, reminders: [{ ...reminder, id: 'new-id' }] }));
});
it('duas syncs com reminders canônicos conservam IDs e retornam somente snapshot consolidado', async () => {
  const reminder = { id: 'r', taskId: 'rt', offsetMinutes: 0, createdAt: '2026-10-26T12:00:00Z', updatedAt: '2026-10-26T12:00:00Z', triggerAt: '2026-10-27T13:00:00Z' };
  const remote = { ...task, id: 'rt', remoteId: 'rt', reminders: [reminder], reminderTimeZone: 'America/Sao_Paulo' };
  tasks = [remote];
  const first = await synchronize([], [remote]); const second = await synchronize(first.projects, first.tasks);
  expect(first.tasks[0].reminders).toEqual(second.tasks[0].reminders);
  expect(second.reminderSnapshot).toEqual([remote]); expect(importLocalTask).not.toHaveBeenCalled();
});
it('comparação usa o mesmo dia civil para cache ISO antigo e chaves canônicas', () => {
  const { taskFields } = require('../src/services/syncService') as typeof import('../src/services/syncService');
  const legacy = { ...task, startDate: new Date(2026, 9, 26).toISOString(), dueDate: new Date(2026, 9, 27).toISOString() };
  expect(taskFields(legacy)).toBe(taskFields({ ...legacy, startDateKey: '2026-10-26', dueDateKey: '2026-10-27' }));
});
