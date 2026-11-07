import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSavedFilter, deleteSavedFilter, loadSavedFilters, SAVED_TASK_FILTERS_KEY } from '../src/services/savedTaskFilterService';
import { DEFAULT_FILTERS, filterTasks } from '../src/utils/taskFilters';
import type { TaskFilters } from '../src/utils/taskFilters';
import type { Task } from '../src/context/TaskContext';
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
let raw: string | null;
const filters: TaskFilters = { ...DEFAULT_FILTERS, priority: 'high', projectId: 'remote-a', period: 'week' };
beforeEach(() => {
  raw = null; jest.clearAllMocks();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => key === SAVED_TASK_FILTERS_KEY ? raw : null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (_key, value) => { raw = value; });
});
it('trim, ID independente do nome, snapshot exato, reload e nomes iguais', async () => {
  const input = { ...filters };
  const pending = createSavedFilter('  Marketing  ', input);
  input.projectId = 'changed';
  const first = await pending;
  const second = await createSavedFilter('Marketing', filters);
  expect(first.name).toBe('Marketing'); expect(first.id).not.toBe(second.id);
  expect(first.filters).toEqual(filters); expect(first.createdAt).toBe(first.updatedAt);
  expect(await loadSavedFilters()).toEqual([first, second]);
  expect(Object.keys(first).sort()).toEqual(['createdAt', 'filters', 'id', 'name', 'updatedAt']);
  expect(Object.keys(first.filters).sort()).toEqual(['period', 'priority', 'projectId', 'status']);
});
it.each(['', '   ', 'x'.repeat(81)])('nome inválido %j não grava', async name => {
  await expect(createSavedFilter(name, filters)).rejects.toThrow('nome');
  expect(raw).toBeNull(); expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
it('Todos sem critério não pode ser salvo', async () => {
  await expect(createSavedFilter('Todos', DEFAULT_FILTERS)).rejects.toThrow('ao menos um filtro');
  expect(raw).toBeNull();
});
it('excluir por ID preserva homônimo e snapshot aplicado', async () => {
  const first = await createSavedFilter('Igual', filters);
  const second = await createSavedFilter('Igual', filters);
  const applied = { ...first.filters };
  await deleteSavedFilter(first.id);
  expect(await loadSavedFilters()).toEqual([second]); expect(applied).toEqual(filters);
});
it.each(['{', '{}', '[]', '{"version":2,"items":[]}', '{"version":1,"items":[{"id":"x"}]}'])('JSON/schema inválido preservado: %s', async value => {
  raw = value;
  await expect(loadSavedFilters()).rejects.toThrow('preservados');
  await expect(createSavedFilter('Novo', filters)).rejects.toThrow('preservados');
  await expect(deleteSavedFilter('x')).rejects.toThrow('preservados');
  expect(raw).toBe(value); expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
it('falha de escrita mantém registros anteriores e próximo retry funciona', async () => {
  const original = await createSavedFilter('Primeiro', filters);
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Disk'));
  await expect(deleteSavedFilter(original.id)).rejects.toThrow('Disk');
  expect(await loadSavedFilters()).toEqual([original]);
  await deleteSavedFilter(original.id); expect(await loadSavedFilters()).toEqual([]);
});
it('escritas concorrentes não perdem registros', async () => {
  const values = await Promise.all([createSavedFilter('A', filters), createSavedFilter('B', filters)]);
  expect(await loadSavedFilters()).toEqual(values);
});
it('projectId local/remoto, homônimos e projeto indisponível não mudam referência', async () => {
  const item = await createSavedFilter('Projeto', filters);
  const projects = ['a', 'b'].map(id => ({ id, remoteId: `remote-${id}`, name: 'Mesmo nome', color: '#fff', icon: 'P' }));
  const tasks = ['a', 'b'].map(id => ({ id, projectId: `remote-${id}`, status: 'todo', priority: 'high', dueDateKey: '2026-11-07' } as Task));
  expect(filterTasks(tasks, item.filters, projects, new Date(2026, 10, 7)).map(task => task.id)).toEqual(['a']);
  expect(filterTasks(tasks, item.filters, [], new Date(2026, 10, 7)).map(task => task.id)).toEqual(['a']);
  expect((await loadSavedFilters())[0].filters.projectId).toBe('remote-a');
});
it('snapshot com campos extras não persiste query ou sorting', async () => {
  const input = { ...filters, query: 'texto', sorting: { criterion: 'none' } };
  const item = await createSavedFilter('Limpo', input);
  expect(item.filters).toEqual(filters);
});
