import React, { useEffect, useState } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import BottomNavigation from '../components/BottomNavigation';
import { useTasks } from '../context/TaskContext';
import type { Task } from '../context/TaskContext';
import { isCompleted, isOverdue, periodBounds } from '../utils/dashboard';
import {
  calendarKey,
  dateFromKey,
  groupDayTasks,
  isDueSoon,
  monthGrid,
  shiftDay,
  shiftMonth,
  taskCountsByDay,
  tasksForDay,
  validTime,
  weekDays,
} from '../utils/calendar';

type Mode = 'day' | 'week' | 'month';
const priority = {
  high: { label: 'Alta', style: 'high' },
  medium: { label: 'Média', style: 'medium' },
  low: { label: 'Baixa', style: 'low' },
} as const;
const dayLabel = (date: Date) =>
  date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });

export default function CalendarScreen() {
  const navigation = useNavigation<any>();
  const { tasks, loading, readError } = useTasks();
  const [mode, setMode] = useState<Mode>('month');
  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState(() => calendarKey(new Date()));
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh();
      }
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  const date = dateFromKey(selected);
  const today = calendarKey(now);
  const counts = taskCountsByDay(tasks);
  const selectedTasks = tasksForDay(tasks, selected);
  const days = mode === 'month' ? monthGrid(date) : weekDays(date);
  const bounds = periodBounds(mode === 'month' ? 'month' : 'week', date);
  const periodHasTasks = Object.keys(counts).some(
    key => key >= bounds.start && key <= bounds.end,
  );
  const monthLabel = date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  const title =
    mode === 'month'
      ? monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
      : mode === 'day'
      ? dayLabel(date)
      : `${dateFromKey(days[0]!).toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'short',
        })} – ${dateFromKey(days[6]!).toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`;

  function move(amount: number) {
    setSelected(
      calendarKey(
        mode === 'month'
          ? shiftMonth(date, amount)
          : shiftDay(date, amount * (mode === 'week' ? 7 : 1)),
      ),
    );
  }
  function renderTask(task: Task) {
    const completed = isCompleted(task),
      overdue = isOverdue(task, now),
      soon = isDueSoon(task, now);
    const level = priority[task.priority] ?? priority.low;
    return (
      <Pressable
        key={task.id}
        accessibilityRole="button"
        accessibilityLabel={`Abrir tarefa ${task.title}`}
        onPress={() =>
          navigation.navigate('DetalheTarefa', { taskId: task.id })
        }
        style={[
          styles.taskCard,
          styles[level.style],
          completed && styles.completedCard,
        ]}
      >
        <View style={styles.taskTop}>
          <Text style={styles.time}>
            {validTime(task.time) ?? 'Sem horário'}
          </Text>
          <Text style={styles.priority}>{level.label} prioridade</Text>
        </View>
        <Text style={[styles.taskTitle, completed && styles.completedTitle]}>
          {completed ? '✓ ' : ''}
          {task.title}
        </Text>
        <Text style={styles.project}>
          {task.project || 'Projeto não disponível'}
        </Text>
        <Text
          style={[
            styles.status,
            overdue && styles.overdue,
            soon && styles.soon,
            completed && styles.completedStatus,
          ]}
        >
          {completed
            ? 'Concluída'
            : overdue
            ? 'ATRASADA'
            : soon
            ? 'PRAZO PRÓXIMO'
            : task.status === 'in_progress'
            ? 'Em andamento'
            : 'A fazer'}
        </Text>
      </Pressable>
    );
  }
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>Calendário</Text>
            <Text style={styles.subtitle}>Sua rotina, um dia de cada vez</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSelected(today)}
            style={styles.todayButton}
          >
            <Text style={styles.todayText}>Hoje</Text>
          </Pressable>
        </View>
        <View style={styles.modes}>
          {(
            [
              ['day', 'Dia'],
              ['week', 'Semana'],
              ['month', 'Mês'],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === value }}
              onPress={() => setMode(value)}
              style={[styles.mode, mode === value && styles.selectedMode]}
            >
              <Text
                style={[styles.modeText, mode === value && styles.selectedText]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.calendarCard}>
          <View style={styles.periodHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Período anterior"
              onPress={() => move(-1)}
              style={styles.arrow}
            >
              <Text style={styles.arrowText}>‹</Text>
            </Pressable>
            <Text style={styles.periodTitle}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Próximo período"
              onPress={() => move(1)}
              style={styles.arrow}
            >
              <Text style={styles.arrowText}>›</Text>
            </Pressable>
          </View>
          {mode !== 'day' && (
            <>
              <View style={styles.weekdays}>
                {(mode === 'month'
                  ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
                  : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
                ).map(label => (
                  <Text key={label} style={styles.weekday}>
                    {label}
                  </Text>
                ))}
              </View>
              <View style={styles.grid}>
                {days.map((key, index) => (
                  <View key={key ?? `blank-${index}`} style={styles.dayCell}>
                    {key && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${dayLabel(dateFromKey(key))}, ${
                          counts[key] ?? 0
                        } tarefas${key === today ? ', hoje' : ''}`}
                        accessibilityState={{ selected: key === selected }}
                        onPress={() => setSelected(key)}
                        style={[
                          styles.dayButton,
                          key === today && styles.todayDay,
                          key === selected && styles.selectedDay,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumber,
                            key === today && styles.todayText,
                            key === selected && styles.selectedText,
                          ]}
                        >
                          {dateFromKey(key).getDate()}
                        </Text>
                        <View
                          style={[
                            styles.dot,
                            counts[key] ? styles.taskDot : styles.noDot,
                            key === selected &&
                              counts[key] > 0 &&
                              styles.selectedDot,
                          ]}
                        />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
              <Text style={styles.legend}>
                ● Dias com tarefas · Contorno: hoje
              </Text>
              {!loading && !periodHasTasks && (
                <Text style={styles.empty}>
                  {mode === 'month'
                    ? 'Nenhuma tarefa neste mês.'
                    : 'Nenhuma tarefa nesta semana.'}
                </Text>
              )}
            </>
          )}
        </View>
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>{dayLabel(date)}</Text>
          <Text style={styles.count}>{selectedTasks.length} tarefas</Text>
        </View>
        {loading && (
          <Text style={styles.empty} accessibilityRole="progressbar">
            Carregando tarefas…
          </Text>
        )}
        {readError && (
          <Text style={styles.error} accessibilityRole="alert">
            {readError} As tarefas disponíveis foram mantidas.
          </Text>
        )}
        {!loading && selectedTasks.length === 0 && (
          <Text style={styles.empty}>Nenhuma tarefa para este dia.</Text>
        )}
        {mode === 'day'
          ? groupDayTasks(selectedTasks)
              .filter(group => group.tasks.length > 0)
              .map(group => (
                <View key={group.label}>
                  <Text style={styles.groupTitle}>{group.label}</Text>
                  {group.tasks.map(renderTask)}
                </View>
              ))
          : selectedTasks.map(renderTask)}
      </ScrollView>
      <BottomNavigation active="Calendario" />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  heading: { fontSize: 28, fontWeight: '700', color: '#1E1B3A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },
  todayButton: {
    backgroundColor: '#EEF0FF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  todayText: { color: '#5C4DFF', fontWeight: '700' },
  modes: {
    flexDirection: 'row',
    backgroundColor: '#EEEDF8',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  mode: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  selectedMode: { backgroundColor: '#5C4DFF' },
  modeText: { fontWeight: '600', color: '#64748B' },
  selectedText: { color: '#FFFFFF' },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 24,
    marginBottom: 24,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  periodTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#1E1B3A',
    fontSize: 16,
    fontWeight: '700',
  },
  arrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F7FF',
    borderRadius: 14,
  },
  arrowText: { fontSize: 28, color: '#5C4DFF' },
  weekdays: { flexDirection: 'row', marginBottom: 8 },
  weekday: {
    width: '14.285714%',
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.285714%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    width: '90%',
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDay: { borderColor: '#5C4DFF' },
  selectedDay: { backgroundColor: '#5C4DFF' },
  dayNumber: { fontSize: 14, fontWeight: '600', color: '#334155' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  taskDot: { backgroundColor: '#5C4DFF' },
  noDot: { backgroundColor: 'transparent' },
  selectedDot: { backgroundColor: '#FFFFFF' },
  legend: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1E1B3A' },
  count: { fontSize: 12, color: '#64748B' },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5C4DFF',
    marginVertical: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  high: { borderLeftColor: '#F43F5E' },
  medium: { borderLeftColor: '#F59E0B' },
  low: { borderLeftColor: '#5C4DFF' },
  completedCard: { backgroundColor: '#FBFDFB' },
  taskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  time: { fontSize: 12, fontWeight: '600', color: '#5C4DFF' },
  priority: { fontSize: 11, color: '#64748B' },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#1E1B3A' },
  completedTitle: { color: '#64748B' },
  project: { fontSize: 12, color: '#94A3B8', marginTop: 5 },
  status: {
    alignSelf: 'flex-start',
    color: '#64748B',
    backgroundColor: '#F6F7FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 10,
  },
  overdue: { color: '#E11D48', backgroundColor: '#FFF1F3' },
  soon: { color: '#B45309', backgroundColor: '#FFFBEB' },
  completedStatus: { color: '#16A34A', backgroundColor: '#F0FDF4' },
  empty: {
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
  },
  error: { color: '#E11D48', marginBottom: 12 },
});
