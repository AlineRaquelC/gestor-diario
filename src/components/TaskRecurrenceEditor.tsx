import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTasks } from '../context/TaskContext';
import type { Task } from '../context/TaskContext';
import {
  deviceRecurrenceTimeZone,
  RECURRENCE_SCOPE,
  recurrenceLabel,
} from '../models/recurrence';
import type {
  RecurrenceFrequency,
  RecurrenceSeries,
} from '../models/recurrence';
import { newRecurrenceRequestId } from '../services/recurrenceService';
import RecurrenceFrequencySelector from './RecurrenceFrequencySelector';
import { COLORS, SPACING } from '../styles/theme';

export default function TaskRecurrenceEditor({
  task,
  disabled = false,
}: {
  task: Task;
  disabled?: boolean;
}) {
  const { loadRecurrenceSeries, changeRecurrenceRule, activateTaskRecurrence } =
    useTasks();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const [series, setSeries] = useState<RecurrenceSeries | null>(null);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    task.recurrence?.frequency ?? 'NONE',
  );
  const [zone, setZone] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null);
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
        setSeries(current);
        setFrequency(current.frequency);
        setZone(current.timeZone);
      } else {
        setFrequency('NONE');
        setZone(task.reminderTimeZone ?? deviceRecurrenceTimeZone());
        if (!requestId.current) {
          requestId.current = newRecurrenceRequestId();
        }
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
  async function saveRule() {
    if (lock.current || disabled || !zone) {
      return;
    }
    if (!task.recurrenceSeriesId && frequency === 'NONE') {
      setOpen(false);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result =
        task.recurrenceSeriesId && series
          ? await changeRecurrenceRule(
              task.id,
              series.id,
              series.updatedAt,
              frequency,
            )
          : await activateTaskRecurrence(
              task.id,
              frequency,
              zone,
              requestId.current!,
            );
      setSeries(result.series);
      setOpen(false);
      Alert.alert(
        'Regra salva',
        (frequency === 'NONE'
          ? 'Novas ocorrências não serão criadas. As tarefas existentes permanecem.'
          : RECURRENCE_SCOPE) +
          (result.cacheSaved
            ? ''
            : ' O cache local falhou. A regra foi salva no servidor; não envie novamente.'),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Não foi possível confirmar a alteração da regra.',
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
      {open && (
        <>
          <RecurrenceFrequencySelector
            value={frequency}
            onChange={setFrequency}
            disabled={busy || disabled}
          />
          <Text style={styles.note}>{RECURRENCE_SCOPE}</Text>
          <Text style={styles.note}>
            As tarefas já criadas permanecem, inclusive ao selecionar Não
            repetir.
          </Text>
          <Text style={styles.note}>Fuso da série: {zone}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Salvar regra de repetição"
            accessibilityState={{ disabled: busy || disabled }}
            disabled={busy || disabled}
            style={styles.button}
            onPress={saveRule}
          >
            <Text style={styles.link}>
              {busy ? 'Salvando regra…' : 'Salvar regra'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar alteração da regra"
            disabled={busy}
            style={styles.button}
            onPress={() => setOpen(false)}
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
