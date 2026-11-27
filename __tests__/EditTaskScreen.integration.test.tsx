jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) }));
import React from 'react';
import { Alert, TextInput } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import EditTaskScreen from '../src/screens/EditTaskScreen';
import { useTasks } from '../src/context/TaskContext';
import { useProjects } from '../src/context/ProjectContext';

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn(), reset: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation, useRoute: () => ({ params: { taskId: 'task' } }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../src/context/TaskContext', () => ({ useTasks: jest.fn() }));
jest.mock('../src/context/ProjectContext', () => ({ useProjects: jest.fn() }));
const task = { id: 'task', title: 'Original', description: 'Descrição', projectId: 'remote-a', project: 'Mesmo nome', priority: 'medium' as const, status: 'todo' as const, done: false, startDate: new Date(2026, 8, 1).toISOString(), dueDate: new Date(2026, 8, 3).toISOString(), time: '10:00' };
const projects = [{ id: 'a', remoteId: 'remote-a', name: 'Mesmo nome', color: '#fff', icon: 'P' }, { id: 'b', remoteId: 'remote-b', name: 'Mesmo nome', color: '#000', icon: 'P' }];
const patch = jest.fn();
let renderer: ReactTestRenderer.ReactTestRenderer;
let alert: jest.SpyInstance;
const button = (text: string) => renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => node.findAll(child => String(child.type) === 'Text').some(child => child.props.children === text))!;
beforeEach(async () => {
  patch.mockReset().mockResolvedValue({ task, cacheSaved: true, scheduling: { state: 'not_required' } });
  jest.mocked(useTasks).mockReturnValue({ tasks: [task], updateTask: patch, deleteTask: jest.fn() } as unknown as ReturnType<typeof useTasks>);
  jest.mocked(useProjects).mockReturnValue({ projects } as ReturnType<typeof useProjects>);
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await act(async () => { renderer = ReactTestRenderer.create(<EditTaskScreen />); });
});
afterEach(async () => { await act(async () => renderer.unmount()); jest.restoreAllMocks(); jest.clearAllMocks(); });

it('aguarda PATCH e impede sucesso/navegação antecipados', async () => {
  let finish!: (result: { task: typeof task; cacheSaved: boolean; scheduling: { state: string } }) => void;
  patch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  let pending!: Promise<void>;
  await act(async () => { pending = button('✓ Salvar alterações').props.onPress(); });
  expect(alert).not.toHaveBeenCalled();
  expect(mockNavigation.goBack).not.toHaveBeenCalled();
  expect(button('Salvando…').props.disabled).toBe(true);
  await act(async () => { finish({ task, cacheSaved: true, scheduling: { state: 'not_required' } }); await pending; });
  expect(alert).toHaveBeenCalledWith('Alterações salvas', 'A tarefa foi atualizada com sucesso.', expect.any(Array));
  expect(mockNavigation.goBack).not.toHaveBeenCalled();
  alert.mock.calls[0][2][0].onPress();
  expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
});
it('falha de PATCH informa erro e não navega como se estivesse salvo', async () => {
  patch.mockRejectedValue(new Error('Backend indisponível'));
  await act(async () => { await button('✓ Salvar alterações').props.onPress(); });
  expect(alert).toHaveBeenCalledWith('Não foi possível salvar', 'Backend indisponível');
  expect(mockNavigation.goBack).not.toHaveBeenCalled();
  expect(button('✓ Salvar alterações').props.disabled).toBe(false);
});
it('seleção de projetos homônimos usa ID e preserva início antigo inalterado', async () => {
  const selector = renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => node.props.accessibilityLabel === 'Selecionar projeto: Mesmo nome')!;
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'Projeto: Mesmo nome')).toHaveLength(0);
  await act(async () => selector.props.onPress());
  const choices = renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === 'Projeto: Mesmo nome');
  expect(choices).toHaveLength(2);
  expect(choices[0].props.accessibilityState.selected).toBe(true);
  await act(async () => { choices[1].props.onPress(); });
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'Projeto: Mesmo nome')).toHaveLength(0);
  await act(async () => { await button('✓ Salvar alterações').props.onPress(); });
  expect(patch).toHaveBeenCalledWith('task', expect.objectContaining({ projectId: 'b', startDate: task.startDate }));
  expect(patch.mock.calls[0][1]).not.toHaveProperty('project');
});
it('horário inválido é rejeitado sem enviar PATCH', async () => {
  const input = renderer.root.findAllByType(TextInput).find(node => node.props.value === '10:00')!;
  await act(async () => { input.props.onChangeText('25:00'); });
  await act(async () => { await button('✓ Salvar alterações').props.onPress(); });
  expect(patch).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalledWith('Horário inválido', expect.any(String));
});

it('mantém campo/lista e adiciona subtarefa pela API sem sucesso antecipado', async () => {
  const create = jest.fn(); let finish!: (value: unknown) => void;
  create.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => renderer.unmount());
  jest.mocked(useTasks).mockReturnValue({ tasks: [task], updateTask: patch, deleteTask: jest.fn(), addSubtask: create, toggleSubtask: jest.fn(), removeSubtask: jest.fn() } as unknown as ReturnType<typeof useTasks>);
  await act(async () => { renderer = ReactTestRenderer.create(<EditTaskScreen />); });
  const add = renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => node.findAll(child => String(child.type) === 'Text').some(child => String(child.props.children).includes('Adicionar subtarefa')))!;
  await act(async () => add.props.onPress());
  const input = renderer.root.findAllByType(TextInput).find(node => node.props.placeholder === 'Nome da subtarefa...')!;
  await act(async () => input.props.onChangeText('Nova filha'));
  let pending!: Promise<void>; await act(async () => { pending = input.props.onSubmitEditing(); });
  expect(create).toHaveBeenCalledWith('task', 'Nova filha'); expect(JSON.stringify(renderer.toJSON())).not.toContain('Feita');
  await act(async () => { finish({ task: { ...task, subtasks: [{ id: 'server-id', title: 'Nova filha', done: false, remote: true }] }, cacheSaved: true }); await pending; });
  expect(JSON.stringify(renderer.toJSON())).toContain('Nova filha'); expect(patch).not.toHaveBeenCalled();
});
it('remover e marcar filho usam Context remoto; erro mantém lista', async () => {
  const remove = jest.fn().mockRejectedValue(new Error('offline'));
  const toggle = jest.fn().mockRejectedValue(new Error('offline'));
  await act(async () => renderer.unmount());
  jest.mocked(useTasks).mockReturnValue({ tasks: [{ ...task, subtasks: [{ id: 's', title: 'Filha', done: false, remote: true }] }], updateTask: patch, deleteTask: jest.fn(), removeSubtask: remove, toggleSubtask: toggle } as unknown as ReturnType<typeof useTasks>);
  await act(async () => { renderer = ReactTestRenderer.create(<EditTaskScreen />); });
  await act(async () => { await button('✕').props.onPress(); });
  expect(remove).toHaveBeenCalledWith('task', 's'); expect(alert).toHaveBeenCalledWith('Não foi possível alterar a subtarefa', 'offline');
  expect(JSON.stringify(renderer.toJSON())).toContain('Filha');
  const checkbox = renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => !node.findAll(child => String(child.type) === 'Text').length)!;
  await act(async () => { await checkbox.props.onPress(); }); expect(toggle).toHaveBeenCalledWith('task', 's');
});


it.each(['a', 'remote-a'])('mostra projeto atual resolvido por ID %s e preserva vínculo sem troca', async projectId => {
  await act(async () => renderer.unmount());
  jest.mocked(useTasks).mockReturnValue({ tasks: [{ ...task, projectId, project: 'Nome antigo' }], updateTask: patch } as unknown as ReturnType<typeof useTasks>);
  await act(async () => { renderer = ReactTestRenderer.create(<EditTaskScreen />); });
  expect(renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === 'Selecionar projeto: Mesmo nome')).toHaveLength(1);
  expect(JSON.stringify(renderer.toJSON())).toContain('P');
  await act(async () => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Título')!.props.onChangeText('Outro título'));
  await act(async () => { await button('✓ Salvar alterações').props.onPress(); });
  expect(patch).toHaveBeenCalledWith('task', expect.objectContaining({ title: 'Outro título' }));
  expect(patch.mock.calls[0][1]).not.toHaveProperty('projectId');
  expect(patch.mock.calls[0][1]).not.toHaveProperty('remoteId');
});

it('resolve remoteId após hidratação sem congelar seleção e mantém escolha explícita', async () => {
  await act(async () => renderer.unmount());
  jest.mocked(useProjects).mockReturnValue({ projects: [] } as unknown as ReturnType<typeof useProjects>);
  await act(async () => { renderer = ReactTestRenderer.create(<EditTaskScreen />); });
  jest.mocked(useProjects).mockReturnValue({ projects } as ReturnType<typeof useProjects>);
  await act(async () => renderer.update(<EditTaskScreen />));
  await act(async () => renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === 'Selecionar projeto: Mesmo nome')[0].props.onPress());
  const choices = renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === 'Projeto: Mesmo nome');
  expect(choices[0].props.accessibilityState.selected).toBe(true);
  await act(async () => choices[1].props.onPress());
  await act(async () => renderer.update(<EditTaskScreen />));
  await act(async () => { await button('✓ Salvar alterações').props.onPress(); });
  expect(patch).toHaveBeenCalledWith('task', expect.objectContaining({ projectId: 'b' }));
});

it('legado sem projectId não recebe associação por nome', async () => {
  const projectId = undefined;
  await act(async () => renderer.unmount());
  jest.mocked(useTasks).mockReturnValue({ tasks: [{ ...task, projectId }], updateTask: patch } as unknown as ReturnType<typeof useTasks>);
  await act(async () => { renderer = ReactTestRenderer.create(<EditTaskScreen />); });
  expect(renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === 'Selecionar projeto: Selecionar projeto')).toHaveLength(1);
  await act(async () => { await button('✓ Salvar alterações').props.onPress(); });
  expect(patch).toHaveBeenCalledTimes(1);
  expect(patch.mock.calls[0][1]).not.toHaveProperty('projectId');
});


it('troca mostra nome e ícone novos imediatamente e envia o ID escolhido', async () => {
  jest.mocked(useProjects).mockReturnValue({ projects: [projects[0], { ...projects[1], name: 'Produto', icon: '📦' }] } as ReturnType<typeof useProjects>);
  await act(async () => renderer.update(<EditTaskScreen />));
  await act(async () => renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === 'Selecionar projeto: Mesmo nome')[0].props.onPress());
  await act(async () => renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === 'Projeto: Produto')[0].props.onPress());
  expect(renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === 'Selecionar projeto: Produto')).toHaveLength(1);
  expect(JSON.stringify(renderer.toJSON())).toContain('📦');
  await act(async () => { await button('✓ Salvar alterações').props.onPress(); });
  expect(patch).toHaveBeenCalledWith('task', expect.objectContaining({ projectId: 'b' }));
});


const marketingTask = { ...task, projectId: 'remote-marketing', project: 'Marketing' };
const marketing = { id: 'p1', name: 'Marketing', color: '#fff', icon: '🚩' };
const development = { id: 'p2', remoteId: 'remote-dev', name: 'Desenvolvimento', color: '#000', icon: '💻' };
const projectButtons = (label: string) => renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label);
async function renderMarketing(options: Array<typeof marketing & { remoteId?: string }>) {
  await act(async () => renderer.unmount());
  jest.mocked(useTasks).mockReturnValue({ tasks: [marketingTask], updateTask: patch } as unknown as ReturnType<typeof useTasks>);
  jest.mocked(useProjects).mockReturnValue({ projects: options } as ReturnType<typeof useProjects>);
  await act(async () => { renderer = ReactTestRenderer.create(<EditTaskScreen />); });
}

it.each([
  [marketing],
  [marketing, { ...marketing, id: 'homonimo' }],
  [],
])('representa vínculo remoto confirmado sem associar aos homônimos locais: %j', async (...options) => {
  await renderMarketing(options);
  expect(projectButtons('Selecionar projeto: Marketing')).toHaveLength(1);
  await act(async () => projectButtons('Selecionar projeto: Marketing')[0].props.onPress());
  const choices = projectButtons('Projeto: Marketing');
  expect(choices).toHaveLength(options.length + 1);
  choices.slice(0, -1).forEach(choice => expect(choice.props.accessibilityState.selected).toBe(false));
  expect(choices[choices.length - 1].props.accessibilityState.selected).toBe(true);
  await act(async () => choices[choices.length - 1].props.onPress());
  await act(async () => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Descrição')!.props.onChangeText('Outra descrição'));
  await act(async () => { await button('✓ Salvar alterações').props.onPress(); });
  expect(patch).toHaveBeenCalledWith('task', expect.objectContaining({ description: 'Outra descrição' }));
  expect(patch.mock.calls[0][1]).not.toHaveProperty('projectId');
});

it('usa projeto local por remoteId e substitui opção remota sem duplicata após hidratação', async () => {
  await renderMarketing([marketing]);
  await act(async () => projectButtons('Selecionar projeto: Marketing')[0].props.onPress());
  await act(async () => projectButtons('Projeto: Marketing')[1].props.onPress());
  jest.mocked(useProjects).mockReturnValue({ projects: [{ ...marketing, remoteId: 'remote-marketing', name: 'Marketing atualizado' }] } as ReturnType<typeof useProjects>);
  await act(async () => renderer.update(<EditTaskScreen />));
  expect(projectButtons('Selecionar projeto: Marketing atualizado')).toHaveLength(1);
  await act(async () => projectButtons('Selecionar projeto: Marketing atualizado')[0].props.onPress());
  expect(projectButtons('Projeto: Marketing atualizado')).toHaveLength(1);
  expect(projectButtons('Projeto: Marketing')).toHaveLength(0);
  expect(projectButtons('Projeto: Marketing atualizado')[0].props.accessibilityState.selected).toBe(true);
});

it('salva outro campo sem tocar no vínculo remoto não mapeado', async () => {
  await renderMarketing([marketing]);
  await act(async () => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Descrição')!.props.onChangeText('Nova descrição'));
  await act(async () => { await button('✓ Salvar alterações').props.onPress(); });
  expect(patch).toHaveBeenCalledWith('task', expect.objectContaining({ description: 'Nova descrição' }));
  expect(patch.mock.calls[0][1]).not.toHaveProperty('projectId');
});

it('troca vínculo remoto não mapeado por Desenvolvimento usando id local', async () => {
  await renderMarketing([marketing, development]);
  await act(async () => projectButtons('Selecionar projeto: Marketing')[0].props.onPress());
  await act(async () => projectButtons('Projeto: Desenvolvimento')[0].props.onPress());
  expect(projectButtons('Selecionar projeto: Desenvolvimento')).toHaveLength(1);
  await act(async () => { await button('✓ Salvar alterações').props.onPress(); });
  expect(patch).toHaveBeenCalledWith('task', expect.objectContaining({ projectId: 'p2' }));
});

jest.mock('../src/services/reminderPermission', () => ({
  requestReminderPermission: jest.fn().mockResolvedValue(true),
}));
jest.mock('../src/models/reminder', () => ({
  ...jest.requireActual('../src/models/reminder'),
  deviceReminderTimeZone: jest.fn(() => 'Europe/Lisbon'),
}));
import { deviceReminderTimeZone } from '../src/models/reminder';
import type { Task } from '../src/context/TaskContext';
const reminderButtons = (label: string) =>
  renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel === label,
  );
async function clickReminder(label: string) {
  await act(async () => reminderButtons(label)[0].props.onPress());
}
const storedReminder = {
  id: 'r',
  taskId: 'task',
  offsetMinutes: 60,
  triggerAt: '2026-09-03T12:00:00Z',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};
async function renderReminders(overrides: Partial<Task> = {}) {
  await act(async () => renderer.unmount());
  jest
    .mocked(useTasks)
    .mockReturnValue({
      tasks: [
        {
          ...task,
          reminders: [storedReminder],
          reminderTimeZone: 'America/Sao_Paulo',
          ...overrides,
        },
      ],
      updateTask: patch,
    } as unknown as ReturnType<typeof useTasks>);
  await act(async () => {
    renderer = ReactTestRenderer.create(<EditTaskScreen />);
  });
}
it('exibe canônicos, preserva configuração concluída e omite no PATCH sem toque', async () => {
  await renderReminders({ status: 'completed', done: true });
  expect(reminderButtons('Remover lembrete: 1 hora antes')).toHaveLength(1);
  expect(JSON.stringify(renderer.toJSON())).toContain('America/Sao_Paulo');
  await act(async () => {
    await button('✓ Salvar alterações').props.onPress();
  });
  expect(patch.mock.calls[0][1]).not.toHaveProperty('reminders');
  expect(patch.mock.calls[0][1]).not.toHaveProperty('reminderTimeZone');
  expect(deviceReminderTimeZone).not.toHaveBeenCalled();
});
it('adiciona e remove preservando fuso salvo mesmo em outro aparelho', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(0);
  await renderReminders();
  await clickReminder('Adicionar lembrete');
  await clickReminder('15 min antes');
  await clickReminder('Remover lembrete: 1 hora antes');
  await act(async () => {
    await button('✓ Salvar alterações').props.onPress();
  });
  expect(patch).toHaveBeenCalledWith(
    'task',
    expect.objectContaining({
      reminders: [{ offsetMinutes: 15 }],
      reminderTimeZone: 'America/Sao_Paulo',
    }),
  );
  expect(deviceReminderTimeZone).not.toHaveBeenCalled();
});
it('remover todos envia coleção vazia e fuso null', async () => {
  await renderReminders();
  await clickReminder('Remover lembrete: 1 hora antes');
  await act(async () => {
    await button('✓ Salvar alterações').props.onPress();
  });
  expect(patch).toHaveBeenCalledWith(
    'task',
    expect.objectContaining({ reminders: [], reminderTimeZone: null }),
  );
});
it('legado não converte; primeira seleção manual captura fuso atual e aceita personalizado', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(0);
  await renderReminders({
    reminders: [],
    reminderTimeZone: null,
    legacyReminders: ['15 min antes'],
  });
  expect(JSON.stringify(renderer.toJSON())).toContain(
    'configuração antiga de lembrete',
  );
  await act(async () => {
    await button('✓ Salvar alterações').props.onPress();
  });
  expect(patch.mock.calls[0][1]).not.toHaveProperty('reminders');
  patch.mockClear();
  await clickReminder('Adicionar lembrete');
  await clickReminder('Personalizado');
  await act(async () =>
    renderer.root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === 'Quantidade do lembrete')!
      .props.onChangeText('2'),
  );
  await clickReminder('Horas');
  await clickReminder('Adicionar personalizado');
  await act(async () => {
    await button('✓ Salvar alterações').props.onPress();
  });
  expect(patch).toHaveBeenCalledWith(
    'task',
    expect.objectContaining({
      reminders: [{ offsetMinutes: 120 }],
      reminderTimeZone: 'Europe/Lisbon',
    }),
  );
});
it('alterar horário revalida configuração existente antes de PATCH', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-03T12:30:00Z'));
  await renderReminders();
  await act(async () =>
    renderer.root
      .findAllByType(TextInput)
      .find(node => node.props.accessibilityLabel === 'Horário')!
      .props.onChangeText('09:00'),
  );
  await act(async () => {
    await button('✓ Salvar alterações').props.onPress();
  });
  expect(patch).not.toHaveBeenCalled();
  expect(alert.mock.calls.at(-1)?.[1]).toContain(
    'O horário da tarefa já passou',
  );
});
it.each(['pending', 'unavailable', 'error'])(
  'scheduler %s com API confirmada não repete PATCH e mantém feedback de cache',
  async state => {
    patch.mockResolvedValue({ task, cacheSaved: false, scheduling: { state } });
    await act(async () => {
      await button('✓ Salvar alterações').props.onPress();
    });
    expect(patch).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls.at(-1)?.[1]).toContain(
      'Alterações salvas, mas o lembrete não foi agendado',
    );
    expect(alert.mock.calls.at(-1)?.[1]).toContain('cache local falhou');
  },
);

it('alterar prazo revalida trigger passado sem tocar nos lembretes', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-04T12:30:00Z'));
  await renderReminders();
  await act(async () => renderer.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === 'Selecionar prazo')[0].props.onPress());
  const picker = renderer.root.findAll(node => String(node.type) === 'DateTimePicker')[0];
  await act(async () => picker.props.onChange({}, new Date(2026, 8, 4)));
  await act(async () => {await button('✓ Salvar alterações').props.onPress();});
  expect(patch).not.toHaveBeenCalled(); expect(alert.mock.calls.at(-1)?.[1]).toContain('O lembrete precisa ser agendado');
});
it.each(['', '25:00'])('reminder existente exige horário válido %s', async time => {
  await renderReminders();
  await act(async () => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Horário')!.props.onChangeText(time));
  await act(async () => {await button('✓ Salvar alterações').props.onPress();});
  expect(patch).not.toHaveBeenCalled(); expect(alert.mock.calls.at(-1)?.[1]).toBe('Defina um horário válido para configurar lembretes.');
});
it('edição confirma agendamento somente quando scheduler confirma', async () => {
  patch.mockResolvedValue({ task, cacheSaved: true, scheduling: { state: 'scheduled' } });
  await act(async () => {await button('✓ Salvar alterações').props.onPress();});
  expect(alert.mock.calls.at(-1)?.[1]).toBe('Alterações salvas e lembrete agendado.');
});

it('preserva data civil canônica quando ISO do cache corresponde a outro dia local', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(0);
  await renderReminders({ dueDateKey: '2026-09-04', dueDate: new Date(2026, 8, 3).toISOString() });
  await act(async () => {await button('✓ Salvar alterações').props.onPress();});
  expect(new Date(patch.mock.calls[0][1].dueDate).getDate()).toBe(4);
  expect(patch.mock.calls[0][1]).not.toHaveProperty('reminderTimeZone');
});
it('remover e reconfigurar antes de salvar preserva fuso existente', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(0); await renderReminders();
  await clickReminder('Remover lembrete: 1 hora antes'); await clickReminder('Adicionar lembrete'); await clickReminder('No horário');
  await act(async () => {await button('✓ Salvar alterações').props.onPress();});
  expect(patch.mock.calls[0][1].reminderTimeZone).toBe('America/Sao_Paulo'); expect(deviceReminderTimeZone).not.toHaveBeenCalled();
});
it('tarefa legada sem prazo nem reminders mantém edição normal', async () => {
  await renderReminders({ dueDate: undefined, startDate: undefined, reminders: [], reminderTimeZone: null });
  await act(async () => {await button('✓ Salvar alterações').props.onPress();});
  expect(patch).toHaveBeenCalledTimes(1); expect(patch.mock.calls[0][1]).not.toHaveProperty('reminders');
});

it('editar ocorrência mantém regra informativa e PATCH somente da Task atual', async () => {
  await act(async () => renderer.unmount());
  const changeRule = jest.fn(), activate = jest.fn();
  const occurrence = { ...task, recurrenceSeriesId: 'series', occurrenceKey: '2026-09-03', recurrence: { frequency: 'WEEKLY' as const, timeZone: 'America/Sao_Paulo', anchorDate: '2026-09-03', materializedThrough: '2026-10-04', updatedAt: '2026-09-01T13:00:00Z' } };
  jest.mocked(useTasks).mockReturnValue({ tasks: [occurrence], updateTask: patch, changeRecurrenceRule: changeRule, activateTaskRecurrence: activate, deleteTask: jest.fn() } as unknown as ReturnType<typeof useTasks>);
  await act(async () => {renderer = ReactTestRenderer.create(<EditTaskScreen />);});
  expect(JSON.stringify(renderer.toJSON())).toContain('Semanalmente');
  expect(JSON.stringify(renderer.toJSON())).toContain('somente esta tarefa');
  await act(async () => {await button('✓ Salvar alterações').props.onPress();});
  expect(patch).toHaveBeenCalledTimes(1);
  expect(patch.mock.calls[0][1]).not.toHaveProperty('recurrence');
  expect(patch.mock.calls[0][1]).not.toHaveProperty('recurrenceSeriesId');
  expect(changeRule).not.toHaveBeenCalled(); expect(activate).not.toHaveBeenCalled();
});


it('DAILY → WEEKLY salva no botão principal sem PATCH da ocorrência', async () => {
  const loadRecurrenceSeries = jest.fn().mockResolvedValue({ id: 'series', frequency: 'DAILY', updatedAt: '2026-09-01T13:00:00Z', timeZone: 'America/Sao_Paulo' });
  const changeRecurrenceRule = jest.fn().mockResolvedValue({ series: { id: 'series', frequency: 'WEEKLY', updatedAt: '2026-11-07T13:00:00Z', timeZone: 'America/Sao_Paulo' }, cacheSaved: true });
  jest.mocked(useTasks).mockReturnValue({ tasks: [{ ...task, recurrenceSeriesId: 'series', recurrence: { frequency: 'DAILY' } }], updateTask: patch, loadRecurrenceSeries, changeRecurrenceRule } as unknown as ReturnType<typeof useTasks>);
  await act(async () => renderer.update(<EditTaskScreen />));
  await clickReminder('Alterar regra de repetição');
  await clickReminder('Semanalmente');
  await act(async () => { await button('✓ Salvar alterações').props.onPress(); });
  expect(patch).not.toHaveBeenCalled();
  expect(changeRecurrenceRule).toHaveBeenCalledWith('task', 'series', '2026-09-01T13:00:00Z', 'WEEKLY');
});

async function prepareRule(frequency = 'WEEKLY') {
  const summary = { frequency: 'DAILY', timeZone: 'America/Sao_Paulo', updatedAt: '2026-09-01T13:00:00Z' };
  const change = jest.fn().mockResolvedValue({ series: { ...summary, frequency, id: 'series', updatedAt: '2026-11-07T14:00:00Z' }, cacheSaved: true });
  const load = jest.fn().mockResolvedValue({ ...summary, id: 'series' });
  jest.mocked(useTasks).mockReturnValue({ tasks: [{ ...task, recurrenceSeriesId: 'series', recurrence: summary }], updateTask: patch, loadRecurrenceSeries: load, changeRecurrenceRule: change } as unknown as ReturnType<typeof useTasks>);
  await act(async () => renderer.update(<EditTaskScreen />));
  await clickReminder('Alterar regra de repetição');
  await clickReminder(frequency === 'NONE' ? 'Não repetir' : 'Semanalmente');
  return change;
}
async function editTitle() {
  await act(async () => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Título')!.props.onChangeText('Alterado'));
}
async function saveForm() { await act(async () => { await button('✓ Salvar alterações').props.onPress(); }); }
it('ambos mudaram: confirma ocorrência e depois série sem misturar contratos', async () => {
  const change = await prepareRule(); await editTitle(); await saveForm();
  expect(patch).toHaveBeenCalledTimes(1); expect(change).toHaveBeenCalledTimes(1);
  expect(patch.mock.invocationCallOrder[0]).toBeLessThan(change.mock.invocationCallOrder[0]);
  expect(patch.mock.calls[0][1]).not.toHaveProperty('recurrence');
});
it('Task confirma, regra falha: retry não repete PATCH confirmado', async () => {
  const change = await prepareRule(); await editTitle();
  change.mockRejectedValueOnce(new Error('Conflito'));
  await saveForm();
  expect(alert.mock.calls.at(-1)?.[1]).toContain('As alterações da tarefa foram salvas, mas não foi possível alterar a recorrência.');
  expect(mockNavigation.goBack).not.toHaveBeenCalled();
  await saveForm();
  expect(patch).toHaveBeenCalledTimes(1); expect(change).toHaveBeenCalledTimes(2);
});
it('regra confirma, Task falha: retry não repete regra confirmada', async () => {
  const change = await prepareRule(); await editTitle();
  patch.mockRejectedValueOnce(new Error('Offline'));
  await saveForm();
  expect(alert.mock.calls.at(-1)?.[1]).toContain('A recorrência foi alterada, mas as demais alterações da tarefa não foram salvas.');
  await saveForm();
  expect(change).toHaveBeenCalledTimes(1); expect(patch).toHaveBeenCalledTimes(2);
});
it('NONE confirma sem PATCH da Task e informa preservação', async () => {
  const change = await prepareRule('NONE'); await saveForm();
  expect(change).toHaveBeenCalledWith('task', 'series', '2026-09-01T13:00:00Z', 'NONE');
  expect(patch).not.toHaveBeenCalled();
  expect(alert.mock.calls.at(-1)?.[1]).toContain('As tarefas existentes permanecem');
});
it('cache falha depois da confirmação: revisão avança e regra não é reenviada', async () => {
  const change = await prepareRule();
  change.mockResolvedValue({ series: { id: 'series', frequency: 'WEEKLY', updatedAt: '2026-11-07T14:00:00Z', timeZone: 'America/Sao_Paulo' }, cacheSaved: false });
  await saveForm();
  expect(alert.mock.calls.at(-1)?.[1]).toContain('cache local falhou');
  await saveForm(); expect(change).toHaveBeenCalledTimes(1); expect(patch).not.toHaveBeenCalled();
});

it('nova edição da regra usa revisão confirmada, mesmo após falha de cache', async () => {
  const change = await prepareRule(); await saveForm();
  await clickReminder('Mensalmente'); await saveForm();
  expect(change).toHaveBeenLastCalledWith('task', 'series', '2026-11-07T14:00:00Z', 'MONTHLY');
  expect(patch).not.toHaveBeenCalled();
});
it('ambos falham: preserva pendências e não navega', async () => {
  const change = await prepareRule(); await editTitle();
  patch.mockRejectedValueOnce(new Error('Task offline')); change.mockRejectedValueOnce(new Error('Regra offline'));
  await saveForm();
  expect(alert.mock.calls.at(-1)?.[1]).not.toContain('foram salvas');
  expect(mockNavigation.goBack).not.toHaveBeenCalled();
  await saveForm(); expect(patch).toHaveBeenCalledTimes(2); expect(change).toHaveBeenCalledTimes(2);
});
it('ativação no formulário mantém identidade estável em retry sem PATCH de Task', async () => {
  const activate = jest.fn().mockRejectedValueOnce(new Error('Resposta perdida')).mockResolvedValue({ series: { id: 'series', frequency: 'DAILY', updatedAt: '2026-11-07T14:00:00Z', timeZone: 'America/Sao_Paulo' }, cacheSaved: true });
  jest.mocked(useTasks).mockReturnValue({ tasks: [task], updateTask: patch, activateTaskRecurrence: activate } as unknown as ReturnType<typeof useTasks>);
  await act(async () => renderer.update(<EditTaskScreen />));
  await clickReminder('Configurar repetição'); await clickReminder('Diariamente');
  await saveForm(); const requestId = activate.mock.calls[0][3];
  await saveForm(); expect(activate.mock.calls[1][3]).toBe(requestId);
  expect(patch).not.toHaveBeenCalled();
});
it('cancelar seleção pendente não altera a série', async () => {
  const change = await prepareRule(); await clickReminder('Cancelar alteração da regra');
  await editTitle(); await saveForm();
  expect(change).not.toHaveBeenCalled(); expect(patch).toHaveBeenCalledTimes(1);
});


it('issue 58: ativação confirmada com refresh pendente informa sucesso parcial', async () => {
  const activate = jest.fn().mockResolvedValue({ series: { id: 'series', frequency: 'DAILY', updatedAt: '2026-11-10T14:00:00Z', timeZone: 'America/Sao_Paulo' }, cacheSaved: true, recurrenceRefreshFailed: true });
  jest.mocked(useTasks).mockReturnValue({ tasks: [task], updateTask: patch, activateTaskRecurrence: activate } as unknown as ReturnType<typeof useTasks>);
  await act(async () => renderer.update(<EditTaskScreen />));
  await clickReminder('Configurar repetição'); await clickReminder('Diariamente'); await saveForm();
  expect(alert.mock.calls.at(-1)?.[1]).toContain('Recorrência salva; atualização das ocorrências pendente');
  expect(patch).not.toHaveBeenCalled();
});
