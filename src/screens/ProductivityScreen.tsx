import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTasks } from '../context/TaskContext';
import {
  emptyGoals,
  GOAL_LIMIT,
  parseGoalInput,
} from '../models/productivityGoals';
import type { GoalPeriod } from '../models/productivityGoals';
import {
  loadGoals,
  removeGoal,
  setGoal,
} from '../services/productivityGoalsService';
import {
  PRODUCTIVITY_PERIODS,
  productivityBars,
  productivityMetrics,
  productivityText,
} from '../utils/productivity';
import { COLORS, RADIUS, SPACING } from '../styles/theme';

export default function ProductivityScreen() {
  const navigation = useNavigation();
  const { tasks, loading, readError } = useTasks();
  const [period, setPeriod] = useState<GoalPeriod>('daily');
  const [goals, setGoals] = useState(emptyGoals);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [now, setNow] = useState(() => new Date());
  const mounted = useRef(false);
  const reload = useCallback(async () => {
    setGoalsLoading(true);
    setReady(false);
    setError('');
    try {
      const confirmed = await loadGoals();
      if (mounted.current) {
        setGoals(confirmed);
        setReady(true);
      }
    } catch (failure) {
      if (mounted.current) {
        setError(
          failure instanceof Error
            ? failure.message
            : 'Não foi possível ler as metas.',
        );
      }
    } finally {
      if (mounted.current) {
        setGoalsLoading(false);
      }
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    reload();
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh();
      }
    });
    const focus = navigation.addListener('focus', refresh);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      subscription.remove();
      focus();
    };
  }, [navigation, reload]);
  const metrics = productivityMetrics(tasks, period, goals, now);
  const selected = PRODUCTIVITY_PERIODS.find(item => item.value === period)!;
  async function save(remove = false) {
    if (busyRef.current || !ready) {
      return;
    }
    setError('');
    let value: number | null = null;
    try {
      if (!remove) {
        value = parseGoalInput(input);
      }
    } catch (failure) {
      setError((failure as Error).message);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      const confirmed = await (remove
        ? removeGoal(period)
        : setGoal(period, value));
      if (mounted.current) {
        setGoals(confirmed);
        setEditing(false);
      }
    } catch (failure) {
      if (mounted.current) {
        setError(
          failure instanceof Error
            ? failure.message
            : 'Não foi possível salvar a meta.',
        );
      }
    } finally {
      busyRef.current = false;
      if (mounted.current) {
        setBusy(false);
      }
    }
  }
  const button = (label: string, action: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={action}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {button('Voltar', () => navigation.goBack(), busy)}
        <Text style={styles.title}>Metas e relatórios</Text>
        <View style={styles.row}>
          {PRODUCTIVITY_PERIODS.map(item => (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{
                selected: period === item.value,
                disabled: busy,
              }}
              disabled={busy}
              style={[styles.chip, period === item.value && styles.selected]}
              onPress={() => {
                setPeriod(item.value);
                setEditing(false);
                setError('');
              }}
            >
              <Text style={styles.label}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        {!!error && (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.error}
          >
            {error}
          </Text>
        )}
        <View style={styles.card}>
          <Text style={styles.heading}>{selected.title}</Text>
          {goalsLoading ? (
            <Text style={styles.label}>Carregando metas...</Text>
          ) : !ready ? (
            <>
              {
                <Text style={styles.label}>
                  Metas indisponíveis. Os dados foram preservados.
                </Text>
              }
              {button('Tentar novamente', reload)}
            </>
          ) : (
            <>
              <Text style={styles.label}>
                {metrics.goal === null
                  ? 'Meta não definida'
                  : loading
                  ? 'Aguardando tarefas para calcular o progresso da meta.'
                  : `${metrics.completed} de ${metrics.goal} concluídas`}
              </Text>
              {metrics.goal !== null && !loading && (
                <>
                  <Text
                    accessibilityLabel={`Progresso da meta: ${metrics.goalProgress}%`}
                    style={styles.heading}
                  >
                    Progresso da meta: {metrics.goalProgress}%
                  </Text>
                  {metrics.goalReached && (
                    <Text style={styles.label}>Meta atingida.</Text>
                  )}
                </>
              )}
              {!editing ? (
                <>
                  {button(
                    metrics.goal === null ? 'Definir meta' : 'Editar meta',
                    () => {
                      setInput(
                        metrics.goal === null ? '' : String(metrics.goal),
                      );
                      setEditing(true);
                      setError('');
                    },
                    busy,
                  )}
                  {metrics.goal !== null &&
                    button(
                      'Remover meta',
                      () => {
                        save(true);
                      },
                      busy,
                    )}
                </>
              ) : (
                <>
                  <Text style={styles.label}>
                    Quantidade concluída (1 a {GOAL_LIMIT})
                  </Text>
                  <TextInput
                    accessibilityLabel="Quantidade da meta"
                    keyboardType="number-pad"
                    value={input}
                    editable={!busy}
                    onChangeText={setInput}
                    style={styles.input}
                    autoFocus
                  />
                  {button(
                    busy ? 'Salvando...' : 'Salvar meta',
                    () => {
                      save();
                    },
                    busy,
                  )}
                  {button(
                    'Cancelar',
                    () => {
                      setEditing(false);
                      setError('');
                    },
                    busy,
                  )}
                </>
              )}
            </>
          )}
        </View>
        <Text style={styles.caption}>
          Dados atuais das tarefas disponíveis neste dispositivo, por prazo. Não
          representa a data de conclusão.
        </Text>
        {!!readError && (
          <Text accessibilityRole="alert" style={styles.error}>
            Não foi possível atualizar todas as tarefas. Dados disponíveis
            mantidos. {readError}
          </Text>
        )}
        {loading ? (
          <Text style={styles.label}>Carregando tarefas...</Text>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.heading}>Tarefas do período</Text>
              {(
                [
                  ['Total', metrics.total],
                  ['Concluídas', metrics.completed],
                  ['Pendentes', metrics.pending],
                  ['Atrasadas', metrics.overdue],
                ] as const
              ).map(([label, value]) => (
                <View
                  key={label}
                  style={styles.metric}
                  accessible
                  accessibilityLabel={`${label}: ${value}`}
                >
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.heading}>{value}</Text>
                </View>
              ))}
              <Text style={styles.label}>
                Progresso das tarefas: {metrics.taskProgress}%
              </Text>
              <Text style={styles.caption}>
                Atrasadas fazem parte das pendentes e pertencem ao período
                selecionado.
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.heading}>Resumo do período</Text>
              <Text style={styles.label}>{productivityText(metrics)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.heading}>Distribuição</Text>
              {!metrics.total ? (
                <Text style={styles.label}>
                  Sem tarefas para exibir no gráfico.
                </Text>
              ) : (
                productivityBars(metrics).map(bar => (
                  <View
                    key={bar.label}
                    accessible
                    accessibilityLabel={`${bar.label}: ${bar.value}`}
                    style={styles.barRow}
                  >
                    <Text style={styles.label}>
                      {bar.label}: {bar.value}
                    </Text>
                    <View style={styles.track}>
                      <View style={[styles.bar, { width: `${bar.width}%` }]} />
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.textPrimary },
  heading: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  label: { fontSize: 15, lineHeight: 23, color: COLORS.textPrimary },
  caption: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  row: { flexDirection: 'row', gap: SPACING.sm },
  chip: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  button: {
    minHeight: 48,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  error: { color: COLORS.danger, fontSize: 14, lineHeight: 22 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    minHeight: 48,
    padding: SPACING.md,
    color: COLORS.textPrimary,
  },
  metric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barRow: { gap: SPACING.xs },
  track: {
    height: 12,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  bar: { height: 12, backgroundColor: COLORS.primary },
});
