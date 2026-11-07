import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTasks } from '../context/TaskContext';
import type { Task } from '../context/TaskContext';
import {
  deviceRecurrenceTimeZone,
  RECURRENCE_SCOPE,
  recurrenceLabel,
} from '../models/recurrence';
import type { RecurrenceFrequency } from '../models/recurrence';
import { newRecurrenceRequestId } from '../services/recurrenceService';
import RecurrenceFrequencySelector from './RecurrenceFrequencySelector';
import { COLORS, SPACING } from '../styles/theme';

export type RecurrenceDraft = {
  originalFrequency: RecurrenceFrequency;
  frequency: RecurrenceFrequency;
  seriesId: string | null;
  expectedUpdatedAt: string | null;
  timeZone: string;
  requestId: string;
};
export const recurrenceChanged = (draft: RecurrenceDraft | null) =>
  !!draft && draft.frequency !== draft.originalFrequency;

export default function TaskRecurrenceEditor({
  task,
  disabled = false,
  draft,
  onChange,
}: {
  task: Task;
  disabled?: boolean;
  draft: RecurrenceDraft | null;
  onChange: (draft: RecurrenceDraft | null) => void;
}) {
  const { loadRecurrenceSeries } = useTasks();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false),
    requestId = useRef<string | null>(null);
  async function editRule() {
    if (lock.current || disabled) {
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      if (task.recurrenceSeriesId) {
        const current = await loadRecurrenceSeries(task.recurrenceSeriesId);
        onChange({
          originalFrequency: current.frequency,
          frequency: current.frequency,
          seriesId: current.id,
          expectedUpdatedAt: current.updatedAt,
          timeZone: current.timeZone,
          requestId: '',
        });
      } else {
        if (!requestId.current) {
          requestId.current = newRecurrenceRequestId();
        }
        onChange({
          originalFrequency: 'NONE',
          frequency: 'NONE',
          seriesId: null,
          expectedUpdatedAt: null,
          timeZone: task.reminderTimeZone ?? deviceRecurrenceTimeZone(),
          requestId: requestId.current,
        });
      }
      setOpen(true);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Não foi possível carregar a regra.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <View>
      {task.recurrenceSeriesId && (
        <>
          <Text style={styles.text}>
            {recurrenceLabel(task.recurrence?.frequency ?? 'NONE')}
          </Text>
          <Text style={styles.note}>
            Os demais campos deste formulário alteram somente esta tarefa.
          </Text>
        </>
      )}
      {open && draft && (
        <>
          <RecurrenceFrequencySelector
            value={draft.frequency}
            onChange={frequency => onChange({ ...draft, frequency })}
            disabled={busy || disabled}
          />
          <Text style={styles.note}>{RECURRENCE_SCOPE}</Text>
          <Text style={styles.note}>
            As tarefas já criadas permanecem, inclusive ao selecionar Não
            repetir.
          </Text>
          <Text style={styles.note}>Fuso da série: {draft.timeZone}</Text>
          <Text style={styles.note}>
            Use Salvar alterações para confirmar a recorrência.
          </Text>
          {task.recurrenceSeriesId && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Recarregar regra de repetição"
              disabled={busy || disabled}
              style={styles.button}
              onPress={editRule}
            >
              <Text style={styles.link}>Recarregar regra</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar alteração da regra"
            disabled={busy || disabled}
            style={styles.button}
            onPress={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            <Text>Cancelar</Text>
          </Pressable>
        </>
      )}
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {(!open || error) && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            error
              ? 'Recarregar regra de repetição'
              : task.recurrenceSeriesId
              ? 'Alterar regra de repetição'
              : 'Configurar repetição'
          }
          accessibilityState={{ disabled: busy || disabled }}
          disabled={busy || disabled}
          style={styles.button}
          onPress={editRule}
        >
          <Text style={styles.link}>
            {error
              ? 'Recarregar regra'
              : task.recurrenceSeriesId
              ? 'Alterar regra de repetição'
              : 'Configurar repetição'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  text: { color: COLORS.textPrimary },
  note: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginVertical: SPACING.xs,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  link: { color: COLORS.primary },
  error: { color: COLORS.danger },
});
