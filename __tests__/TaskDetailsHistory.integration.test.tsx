import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import TaskDetailsScreen from '../src/screens/TaskDetailsScreen';
import { useTasks } from '../src/context/TaskContext';
const mockNavigation = { navigate: jest.fn(), goBack: jest.fn(), reset: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation, useRoute: () => ({ params: { taskId: 'task' } }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../src/context/TaskContext', () => ({ useTasks: jest.fn() }));
jest.mock('../src/context/ProjectContext', () => ({ useProjects: () => ({projects: [{id: 'project-local', remoteId: 'project-remote', name: 'Projeto real', icon: '💻'}]}) }));
const task = { id: 'task', title: 'Tarefa real', project: 'Projeto real', projectId: 'project-remote', description: 'Contexto da tarefa', startDate: '2026-10-22T12:00:00Z', dueDate: '2026-10-25T12:00:00Z', time: '09:00', priority: 'low', status: 'todo', done: false, progress: 0, updatedAt: '2026-10-04T12:00:00Z' };
const load = jest.fn();
const toggle = jest.fn();
let renderer: ReactTestRenderer.ReactTestRenderer;
const text = () => JSON.stringify(renderer.toJSON());
async function mount(events: unknown[] = []) {
  jest.mocked(useTasks).mockReturnValue({ tasks: [task], loading: false, taskHistory: { task: events }, loadTaskHistory: load, taskNotes: {}, loadTaskNotes: jest.fn().mockResolvedValue(undefined), toggleTask: toggle, updateTaskLocal: jest.fn(), deleteTask: jest.fn(), loadTaskById: jest.fn() } as unknown as ReturnType<typeof useTasks>);
  await act(async () => { renderer = ReactTestRenderer.create(<TaskDetailsScreen />); });
}
beforeEach(() => { load.mockReset().mockResolvedValue(undefined); toggle.mockReset(); });
afterEach(async () => { await act(async () => renderer.unmount()); jest.restoreAllMocks(); jest.clearAllMocks(); });
it('mostra eventos reais e suas datas; não usa atividade fictícia', async () => {
  const date = '2026-10-04T12:34:00Z';
  await mount([{ id: 'h', taskId: 'task', action: 'CREATED', metadata: {}, createdAt: date }]);
  expect(load).toHaveBeenCalledWith('task');
  expect(text()).toContain('Tarefa criada');
  expect(text()).toContain(new Date(date).toLocaleString('pt-BR'));
  expect(text()).not.toContain('Configurar ambiente');
  expect(text()).not.toContain('Criar backlog');
  expect(text()).not.toContain('por Aline');
  expect(text()).not.toContain('Hoje, 14:22');
});
it('histórico vazio apresenta estado vazio, mantendo detalhes', async () => {
  await mount();
  expect(text()).toContain('Nenhuma atividade registrada.');
  expect(text()).toContain('Tarefa real');
});
it('falha de histórico não esconde tarefa nem inventa estado vazio', async () => {
  load.mockRejectedValue(new Error('offline'));
  await mount();
  expect(text()).toContain('Não foi possível carregar a atividade.');
  expect(text()).toContain('Tarefa real');
  expect(text()).not.toContain('Nenhuma atividade registrada.');
});
it('histórico mostra loading enquanto aguarda consulta', async () => {
  let finish!: () => void;
  load.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  await mount();
  expect(text()).toContain('Carregando atividade…');
  await act(async () => { finish(); });
  expect(text()).toContain('Nenhuma atividade registrada.');
});
it('falha de conclusão informa erro e não exibe conclusão falsa', async () => {
  toggle.mockRejectedValue(new Error('offline'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await mount();
  const button = renderer.root.findAll(node => typeof node.props.onPress === 'function')
    .find(node => node.findAll(child => String(child.type) === 'Text').some(child => child.props.children === '✓ Concluir tarefa'))!;
  await act(async () => { await button.props.onPress(); });
  expect(toggle).toHaveBeenCalledWith('task');
  expect(alert).toHaveBeenCalledWith('Não foi possível alterar o status', 'offline');
  expect(text()).not.toContain('Tarefa concluída!');
  expect(mockNavigation.navigate).not.toHaveBeenCalled();
});

it('toque no filho usa operação remota, aguarda confirmação e informa falha', async () => {
  const change = jest.fn();
  let finish!: () => void;
  change.mockImplementation(() => new Promise<{ cacheSaved: boolean }>(resolve => { finish = () => resolve({ cacheSaved: true }); }));
  await mount(); await act(async () => renderer.unmount());
  jest.mocked(useTasks).mockReturnValue({ ...useTasks(), tasks: [{ ...task, subtasks: [{ id: 's', title: 'Filha real', done: false, remote: true }] }], toggleSubtask: change } as unknown as ReturnType<typeof useTasks>);
  await act(async () => { renderer = ReactTestRenderer.create(<TaskDetailsScreen />); });
  const row = () => renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => node.findAll(child => String(child.type) === 'Text').some(child => child.props.children === 'Filha real'))!;
  let pending!: Promise<void>;
  await act(async () => { pending = row().props.onPress(); });
  expect(change).toHaveBeenCalledWith('task', 's'); expect(row().props.disabled).toBe(true);
  await act(async () => { finish(); await pending; });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  change.mockRejectedValue(new Error('offline'));
  await act(async () => { await row().props.onPress(); });
  expect(alert).toHaveBeenCalledWith('Não foi possível alterar a subtarefa', 'offline');
  expect(text()).toContain('Filha real'); expect(row().props.disabled).toBe(false);
});

it('mantém informações, ícone real por ID, progresso e editar no layout simplificado', async () => {
  await mount();
  const labels = renderer.root.findAll(node => String(node.type) === 'Text').map(node => [node.props.children].flat().join(''));
  expect(labels).toEqual(expect.arrayContaining(['Tarefa real', 'Contexto da tarefa', 'Baixa prioridade', '💻 Projeto real', 'Informações', 'Início', 'Prazo', 'Horário', '09:00', 'Status', 'A fazer', 'Nenhuma subtarefa cadastrada.']));
  expect(labels).toContain(new Date(task.startDate).toLocaleDateString('pt-BR'));
  expect(labels).toContain(new Date(task.dueDate).toLocaleDateString('pt-BR'));
  const progress = renderer.root.findAll(node => node.props.accessibilityRole === 'progressbar')[0];
  expect(progress.props.accessibilityValue).toEqual({min: 0, max: 100, now: 0});
  expect(labels.join('')).not.toMatch(/[📅🕒🗑🆕⭐★]/u);
  const edit = renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === 'Editar tarefa')[0];
  await act(async () => edit.props.onPress());
  expect(mockNavigation.navigate).toHaveBeenCalledWith('EditarTarefa', {taskId: 'task'});
});

import type { SchedulingResult } from '../src/services/reminderScheduler';
async function showReminders(offsets: number[], scheduling?: SchedulingResult, completed = false, legacyReminders?: string[]) {
  const reminders = offsets.map(offsetMinutes => ({ id: `r-${offsetMinutes}`, taskId: 'task', offsetMinutes, createdAt: task.updatedAt, updatedAt: task.updatedAt, triggerAt: task.dueDate }));
  jest.mocked(useTasks).mockReturnValue({ ...jest.mocked(useTasks).mock.results.at(-1)?.value, tasks: [{ ...task, reminders, legacyReminders, status: completed ? 'completed' : 'todo', done: completed }], reminderScheduling: scheduling ? { task: scheduling } : {} } as unknown as ReturnType<typeof useTasks>);
  await act(async () => renderer.update(<TaskDetailsScreen />));
}
it.each([undefined, ['15 min antes']])('sem canônicos não mostra seção nem trata legado %j como ativo', async legacy => {
  await mount(); await showReminders([], undefined, false, legacy);
  expect(text()).not.toContain('Lembretes'); expect(text()).not.toContain('15 min antes');
});
it.each([[0, 'No horário'], [15, '15 min antes'], [60, '1 hora antes']] as const)('formata offset %s com helper compartilhado', async (offset, label) => {
  await mount(); await showReminders([offset]); expect(text()).toContain('Lembretes'); expect(text()).toContain(label);
  expect(text()).toContain('Agendamento ainda não confirmado'); expect(text()).not.toContain('Lembrete agendado neste aparelho');
});
it('exibe todos os reminders em ordem de antecedência', async () => {
  await mount(); await showReminders([60, 0, 15]);
  const content = text(); expect(content.indexOf('No horário')).toBeLessThan(content.indexOf('15 min antes')); expect(content.indexOf('15 min antes')).toBeLessThan(content.indexOf('1 hora antes'));
});
it.each([
  ['scheduled', 'Lembrete agendado neste aparelho'],
  ['pending', 'Agendamento pendente'],
  ['unavailable', 'Notificações indisponíveis neste aparelho'],
  ['error', 'Não foi possível confirmar o agendamento'],
  ['not_required', 'Nenhum agendamento ativo neste aparelho'],
] as const)('estado %s vem do Context', async (state, label) => {
  await mount(); await showReminders([15], { state }); expect(text()).toContain(label); expect(text()).toContain('Configuração'); expect(text()).toContain('Neste aparelho');
});
it('concluída mantém configuração com cancelamento; restauração usa estado atualizado do Context', async () => {
  await mount(); await showReminders([15], { state: 'not_required' }, true);
  expect(text()).toContain('15 min antes'); expect(text()).toContain('Nenhum agendamento ativo neste aparelho'); expect(text()).not.toContain('Lembrete agendado neste aparelho');
  await showReminders([15], { state: 'pending' }); expect(text()).toContain('Agendamento pendente');
  await showReminders([15], { state: 'scheduled' }); expect(text()).toContain('Lembrete agendado neste aparelho'); expect(text()).not.toContain('Agendamento pendente');
});
