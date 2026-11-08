import React, { useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { toOffsetMinutes } from '../domain/reminders';
import type { ReminderUnit } from '../domain/reminders';
import type { ReminderInput } from '../models/reminder';
import { deviceReminderTimeZone } from '../models/reminder';
import {
  formatReminder,
  REMINDER_PRESETS,
} from '../models/reminderPresentation';
import { requestReminderPermission } from '../services/reminderPermission';
import { COLORS, RADIUS, SPACING } from '../styles/theme';
import { taskFormStyles } from '../styles/taskFormStyles';
type Props = {
  value: ReminderInput[];
  timeZone: string | null;
  legacy?: boolean;
  onChange: (value: ReminderInput[], zone: string | null) => void;
};
export default function TaskReminderSelector({
  value,
  timeZone,
  legacy,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<ReminderUnit>('minutes');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function add(offsetMinutes: number) {
    if (lock.current) {
      return;
    }
    if (value.some(item => item.offsetMinutes === offsetMinutes)) {
      Alert.alert('Lembretes', 'Esse lembrete já está configurado.');
      return;
    }
    if (value.length >= 5) {
      Alert.alert(
        'Lembretes',
        'Você pode configurar até 5 lembretes por tarefa.',
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const zone = timeZone ?? deviceReminderTimeZone();
      if (!value.length && !(await requestReminderPermission())) {
        Alert.alert(
          'Notificações desativadas',
          'A tarefa poderá ser salva, mas as notificações estão desativadas neste aparelho.',
        );
      }
      onChange(
        [...value, { offsetMinutes }].sort(
          (a, b) => a.offsetMinutes - b.offsetMinutes,
        ),
        zone,
      );
      setOpen(false);
      setCustom(false);
      setAmount('');
    } catch (error) {
      Alert.alert(
        'Lembretes',
        error instanceof Error
          ? error.message
          : 'Não foi possível configurar o lembrete.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function addCustom() {
    try {
      if (!/^\d+$/.test(amount)) {
        throw new Error('Informe uma quantidade inteira positiva.');
      }
      add(toOffsetMinutes(Number(amount), unit));
    } catch (error) {
      Alert.alert('Lembretes', (error as Error).message);
    }
  }
  return (
    <View style={styles.card}>
      {legacy && !value.length && (
        <Text style={styles.note}>
          Esta tarefa possui uma configuração antiga de lembrete. Configure
          novamente para ativar notificações.
        </Text>
      )}
      {[...value]
        .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
        .map(item => (
          <View key={item.offsetMinutes} style={styles.row}>
            <Text style={styles.text}>
              {formatReminder(item.offsetMinutes)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remover lembrete: ${formatReminder(
                item.offsetMinutes,
              )}`}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              style={styles.control}
              onPress={() => {
                const next = value.filter(
                  entry => entry.offsetMinutes !== item.offsetMinutes,
                );
                onChange(next, next.length ? timeZone : null);
              }}
            >
              <Text>Remover</Text>
            </Pressable>
          </View>
        ))}
      {!!value.length && (
        <Text style={styles.note}>Fuso do lembrete: {timeZone}</Text>
      )}
      {value.length >= 5 && (
        <Text style={styles.note}>
          Você pode configurar até 5 lembretes por tarefa.
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Adicionar lembrete"
        accessibilityState={{
          expanded: open,
          disabled: busy || value.length >= 5,
        }}
        disabled={busy || value.length >= 5}
        style={styles.control}
        onPress={() => setOpen(!open)}
      >
        <Text style={styles.link}>Adicionar lembrete</Text>
      </Pressable>
      {open && (
        <View>
          {REMINDER_PRESETS.map(offset => (
            <Pressable
              key={offset}
              accessibilityRole="button"
              accessibilityLabel={formatReminder(offset)}
              accessibilityState={{
                selected: value.some(item => item.offsetMinutes === offset),
                disabled: busy,
              }}
              disabled={busy}
              style={styles.control}
              onPress={() => add(offset)}
            >
              <Text>{formatReminder(offset)}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Personalizado"
            accessibilityState={{ expanded: custom }}
            style={styles.control}
            onPress={() => setCustom(!custom)}
          >
            <Text>Personalizado</Text>
          </Pressable>
          {custom && (
            <View>
              <TextInput
                accessibilityLabel="Quantidade do lembrete"
                style={styles.input}
                keyboardType="number-pad"
                value={amount}
                onChangeText={setAmount}
                placeholder="Quantidade"
              />
              <View style={styles.row}>
                {(
                  [
                    ['minutes', 'Minutos'],
                    ['hours', 'Horas'],
                    ['days', 'Dias'],
                  ] as const
                ).map(([key, label]) => (
                  <Pressable
                    key={key}
                    accessibilityRole="radio"
                    accessibilityLabel={label}
                    accessibilityState={{ checked: unit === key }}
                    style={styles.control}
                    onPress={() => setUnit(key)}
                  >
                    <Text>{unit === key ? `✓ ${label}` : label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adicionar personalizado"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                style={styles.control}
                onPress={addCustom}
              >
                <Text style={styles.link}>Adicionar personalizado</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderColor: COLORS.border,
    borderWidth: 1,
    padding: SPACING.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  text: { flex: 1, color: COLORS.textPrimary },
  control: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  note: { color: COLORS.textSecondary, padding: SPACING.sm, fontSize: 12 },
  link: { color: COLORS.primary },
  input: taskFormStyles.input,
});
