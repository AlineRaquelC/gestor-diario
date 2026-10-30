import React from 'react';
import { Alert } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import TaskRecurrenceEditor from '../src/components/TaskRecurrenceEditor';
import { useTasks } from '../src/context/TaskContext';
import type { Task } from '../src/context/TaskContext';
import { RECURRENCE_SCOPE } from '../src/models/recurrence';
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('../src/context/TaskContext', () => ({ useTasks: jest.fn() }));
const summary = {
  frequency: 'WEEKLY' as const,
  timeZone: 'America/Sao_Paulo',
  anchorDate: '2026-10-29',
  materializedThrough: '2026-11-29',
  updatedAt: '2026-10-29T13:00:00Z',
};
const series = {
  ...summary,
  id: 's',
  clientId: 'c',
  firstOccurrenceKey: summary.anchorDate,
  createdAt: summary.updatedAt,
  template: {
    title: 'T',
    projectId: 'p',
    priority: 'LOW' as const,
    description: null,
    time: null,
    startOffsetDays: 0,
    subtasks: [],
    reminders: [],
  },
};
const task: Task = {
  id: 't',
  title: 'T',
  project: 'P',
  priority: 'low',
  status: 'todo',
  done: false,
  recurrenceSeriesId: 's',
  occurrenceKey: summary.anchorDate,
  recurrence: summary,
};
const load = jest.fn(),
  change = jest.fn(),
  activate = jest.fn(),
  patch = jest.fn();
let renderer: TestRenderer.ReactTestRenderer;
const text = () => JSON.stringify(renderer.toJSON());
const press = async (label: string) => {
  const control = renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.props.accessibilityLabel === label,
  )[0];
  expect(control).toBeDefined();
  await act(async () => control.props.onPress());
};
beforeEach(async () => {
  jest.resetAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  load.mockResolvedValue(series);
  change.mockResolvedValue({ series, cacheSaved: true });
  activate.mockResolvedValue({ series, cacheSaved: true });
  jest
    .mocked(useTasks)
    .mockReturnValue({
      loadRecurrenceSeries: load,
      changeRecurrenceRule: change,
      activateTaskRecurrence: activate,
      updateTask: patch,
    } as unknown as ReturnType<typeof useTasks>);
  await act(async () => {
    renderer = TestRenderer.create(<TaskRecurrenceEditor task={task} />);
  });
});
afterEach(async () => {
  await act(async () => renderer.unmount());
  jest.restoreAllMocks();
});
it('mostra regra, escopo e só altera série mediante comando separado', async () => {
  expect(text()).toContain('Semanalmente');
  expect(load).not.toHaveBeenCalled();
  await press('Alterar regra de repetição');
  expect(load).toHaveBeenCalledWith('s');
  expect(text()).toContain(RECURRENCE_SCOPE);
  await press('Mensalmente');
  await press('Salvar regra de repetição');
  expect(change).toHaveBeenCalledWith('t', 's', summary.updatedAt, 'MONTHLY');
  expect(patch).not.toHaveBeenCalled();
  expect(activate).not.toHaveBeenCalled();
});
it('Não repetir deixa claro que Tasks criadas permanecem', async () => {
  await press('Alterar regra de repetição');
  await press('Não repetir');
  expect(text()).toContain('As tarefas já criadas permanecem');
  await press('Salvar regra de repetição');
  expect(change).toHaveBeenCalledWith('t', 's', summary.updatedAt, 'NONE');
  expect(Alert.alert).toHaveBeenCalledWith(
    'Regra salva',
    expect.stringContaining('As tarefas existentes permanecem'),
  );
});
it('conflito não repete PATCH; recarregar é ação explícita e usa nova revisão', async () => {
  change.mockRejectedValueOnce(
    new Error('A regra foi alterada. Recarregue antes de salvar.'),
  );
  await press('Alterar regra de repetição');
  await press('Diariamente');
  await press('Salvar regra de repetição');
  expect(change).toHaveBeenCalledTimes(1);
  expect(load).toHaveBeenCalledTimes(1);
  expect(text()).toContain('Recarregue antes de salvar');
  const updatedAt = '2026-10-29T14:00:00Z';
  load.mockResolvedValue({ ...series, updatedAt });
  await press('Recarregar regra de repetição');
  await press('Diariamente');
  await press('Salvar regra de repetição');
  expect(change).toHaveBeenLastCalledWith('t', 's', updatedAt, 'DAILY');
});
it('Task comum ativa a mesma ocorrência por operação própria, com retry estável', async () => {
  await act(async () =>
    renderer.update(
      <TaskRecurrenceEditor
        task={{
          ...task,
          recurrenceSeriesId: null,
          occurrenceKey: null,
          recurrence: null,
          reminderTimeZone: summary.timeZone,
        }}
      />,
    ),
  );
  activate.mockRejectedValueOnce(new Error('Resposta perdida'));
  await press('Configurar repetição');
  await press('Diariamente');
  await press('Salvar regra de repetição');
  const requestId = activate.mock.calls[0][3];
  await press('Salvar regra de repetição');
  expect(activate).toHaveBeenLastCalledWith(
    't',
    'DAILY',
    summary.timeZone,
    requestId,
  );
  expect(change).not.toHaveBeenCalled();
  expect(patch).not.toHaveBeenCalled();
});
it('falha de cache após API salva é aviso, sem novo PATCH', async () => {
  change.mockResolvedValue({ series, cacheSaved: false });
  await press('Alterar regra de repetição');
  await press('Salvar regra de repetição');
  expect(change).toHaveBeenCalledTimes(1);
  expect(Alert.alert).toHaveBeenCalledWith(
    'Regra salva',
    expect.stringContaining('não envie novamente'),
  );
});
