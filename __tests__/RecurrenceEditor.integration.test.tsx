import React, { useState } from 'react';
import { Alert } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import TaskRecurrenceEditor from '../src/components/TaskRecurrenceEditor';
import type { RecurrenceDraft } from '../src/components/TaskRecurrenceEditor';
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
let pending: RecurrenceDraft | null;
function Editor() {
  const [draft, setDraft] = useState<RecurrenceDraft | null>(null);
  pending = draft;
  return <TaskRecurrenceEditor task={task} draft={draft} onChange={setDraft} />;
}
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
    renderer = TestRenderer.create(<Editor />);
  });
});
afterEach(async () => {
  await act(async () => renderer.unmount());
  jest.restoreAllMocks();
});
it('expõe intenção e revisão ao formulário sem salvar separadamente', async () => {
  expect(text()).toContain('Semanalmente');
  await press('Alterar regra de repetição');
  await press('Mensalmente');
  expect(pending).toMatchObject({ originalFrequency: 'WEEKLY', frequency: 'MONTHLY', seriesId: 's', expectedUpdatedAt: summary.updatedAt, timeZone: summary.timeZone });
  expect(text()).toContain(RECURRENCE_SCOPE);
  expect(text()).not.toContain('Salvar regra');
  expect(change).not.toHaveBeenCalled();
  expect(patch).not.toHaveBeenCalled();
});
it('cancelar descarta a intenção; NONE preserva explicação sobre tarefas existentes', async () => {
  await press('Alterar regra de repetição');
  await press('Não repetir');
  expect(pending?.frequency).toBe('NONE');
  expect(text()).toContain('As tarefas já criadas permanecem');
  await press('Cancelar alteração da regra');
  expect(pending).toBeNull();
});
it('falha de leitura permite recarregar a revisão explicitamente', async () => {
  load.mockRejectedValueOnce(new Error('Offline'));
  await press('Alterar regra de repetição');
  expect(text()).toContain('Offline');
  load.mockResolvedValue({ ...series, updatedAt: '2026-11-07T14:00:00Z' });
  await press('Recarregar regra de repetição');
  expect(pending?.expectedUpdatedAt).toBe('2026-11-07T14:00:00Z');
});
