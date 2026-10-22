import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Alert,
  AppState,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import BottomNavigation from '../components/BottomNavigation';
import { useTasks, Task } from '../context/TaskContext';

import { useProjects } from '../context/ProjectContext';
import {
  dashboardDate,
  dashboardMetrics,
  greeting,
  isCompleted,
  percentage as completionPercentage,
  projectMetrics,
} from '../utils/dashboard';
import type { DashboardPeriod } from '../utils/dashboard';
import TaskListControls from '../components/TaskListControls';
import {
  DEFAULT_FILTERS,
  DEFAULT_SORTING,
  activeFilterCount,
  filterTasks,
  sortTasks,
  taskProjectOptions,
} from '../utils/taskFilters';
import type { TaskFilters, TaskSorting } from '../utils/taskFilters';

import { COLORS, RADIUS, SPACING } from '../styles/theme';

const priorityColors = {
  high: COLORS.danger,
  medium: COLORS.warning,
  low: COLORS.primary,
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  const { tasks, toggleTask, loading, readError } = useTasks();

  const { projects, hydrated } = useProjects();
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const [now, setNow] = useState(() => new Date());
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
  const [filters, setFilters] = useState<TaskFilters>({ ...DEFAULT_FILTERS });
  const [sorting, setSorting] = useState<TaskSorting>({ ...DEFAULT_SORTING });
  const visibleTasks = useMemo(
    () => sortTasks(filterTasks(tasks, filters, projects, now), sorting),
    [tasks, filters, projects, now, sorting],
  );
  const projectOptions = useMemo(
    () => taskProjectOptions(projects, tasks),
    [projects, tasks],
  );
  const sorted = sorting.criterion !== 'none';
  const doneTasks = sorted ? [] : visibleTasks.filter(isCompleted);
  const pendingTasks = sorted
    ? visibleTasks
    : visibleTasks.filter(task => !isCompleted(task));
  const noResults =
    tasks.length > 0 &&
    visibleTasks.length === 0 &&
    activeFilterCount(filters) > 0;
  const metrics = dashboardMetrics(tasks, period, now);
  const progress = metrics.progress;
  // Context appends newly created projects; show the last three with linked tasks.
  const activeProjects = projectMetrics(projects, tasks)
    .filter(project => project.total > 0)
    .reverse()
    .slice(0, 3);
  const progressTitle = {
    today: 'Progresso de hoje',
    week: 'Progresso da semana',
    month: 'Progresso do mês',
  }[period];

  async function handleToggle(id: string) {
    try {
      const result = await toggleTask(id);
      if (!result.cacheSaved) {
        Alert.alert(
          'Status salvo no servidor',
          'Não foi possível atualizar o cache local.',
        );
      }
    } catch (error) {
      Alert.alert(
        'Não foi possível alterar o status',
        error instanceof Error
          ? error.message
          : 'Verifique a conexão e tente novamente.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.date}>{dashboardDate(now)}</Text>

            <Text style={styles.greeting}>{greeting(now)}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir configurações"
            style={styles.profileButton}
            onPress={() => navigation.navigate('Configuracoes')}
          >
            <Text style={styles.profileIcon}>GD</Text>
          </Pressable>
        </View>

        <View style={styles.periodSelector}>
          {(
            [
              ['today', 'Hoje'],
              ['week', 'Semana'],
              ['month', 'Mês'],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: period === value }}
              onPress={() => setPeriod(value)}
              style={[
                styles.periodChip,
                period === value && styles.periodChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.periodText,
                  period === value && styles.periodTextSelected,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.metricsHint}>
          Por prazo · Atrasadas e projetos: total geral
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressContent}>
              <Text style={styles.progressLabel}>{progressTitle}</Text>
              <Text style={styles.progressSubtitle}>
                {metrics.completed} de {metrics.total} concluídas
              </Text>
            </View>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View
            style={styles.progressBackground}
            accessibilityRole="progressbar"
            accessibilityLabel={progressTitle}
            accessibilityValue={{ min: 0, max: 100, now: progress }}
          >
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <View style={styles.statsContainer}>
            <StatCard
              value={metrics.overdue}
              label="Atrasadas"
              background={COLORS.dangerSoft}
              color={COLORS.danger}
            />
            <StatCard
              value={metrics.pending}
              label="Pendentes"
              background={COLORS.primarySoft}
              color={COLORS.primary}
            />
            <StatCard
              value={metrics.completed}
              label="Concluídas"
              background={COLORS.successSoft}
              color={COLORS.success}
            />
          </View>
        </View>

        {/* Projetos */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Projetos Ativos</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver todos os projetos"
            style={styles.seeAllButton}
            onPress={() => navigation.navigate('Projetos')}
          >
            <Text style={styles.seeAll}>Ver todos →</Text>
          </Pressable>
        </View>

        {!hydrated ? (
          <Text style={styles.emptyStateText}>Carregando projetos…</Text>
        ) : activeProjects.length === 0 ? (
          <Text style={styles.emptyStateText}>
            Nenhum projeto com tarefas vinculadas.
          </Text>
        ) : (
          activeProjects.map(project => (
            <ProjectCard
              key={project.id}
              emoji={project.icon}
              name={project.name}
              completed={project.completed}
              total={project.total}
              color={project.color}
            />
          ))
        )}

        {/* Tarefas pendentes */}
        <TaskListControls
          filters={filters}
          sorting={sorting}
          projects={projectOptions}
          onApply={(nextFilters, nextSorting) => {
            setFilters(nextFilters);
            setSorting(nextSorting);
          }}
        />
        <Text style={styles.sectionTitle}>
          {sorted || activeFilterCount(filters) > 0 ? 'Tarefas' : 'Para fazer'}
        </Text>

        {loading && (
          <Text style={styles.emptyStateText} accessibilityRole="progressbar">
            Carregando tarefas…
          </Text>
        )}

        {readError && (
          <View
            style={styles.errorAlert}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.errorText}>{readError}</Text>
            {tasks.length > 0 && (
              <Text style={styles.errorText}>
                As tarefas disponíveis foram mantidas.
              </Text>
            )}
          </View>
        )}

        {!loading && noResults && (
          <Text style={styles.emptyStateText}>
            Nenhuma tarefa encontrada com esses filtros.
          </Text>
        )}
        {!loading &&
          !readError &&
          !noResults &&
          pendingTasks.length === 0 &&
          (tasks.length === 0 || activeFilterCount(filters) === 0) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>
                {tasks.length === 0
                  ? 'Nenhuma tarefa cadastrada'
                  : 'Tudo em dia!'}
              </Text>

              <Text style={styles.emptyStateText}>
                {tasks.length === 0
                  ? 'Crie uma tarefa para começar.'
                  : 'Você não possui tarefas pendentes.'}
              </Text>
            </View>
          )}

        {pendingTasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={handleToggle}
            onPress={() =>
              navigation.navigate('DetalheTarefa', {
                taskId: task.id,
              })
            }
          />
        ))}

        {/* Tarefas concluídas */}
        {doneTasks.length > 0 && (
          <>
            <Text style={styles.completedTitle}>Concluídas</Text>

            {doneTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onPress={() =>
                  navigation.navigate('DetalheTarefa', {
                    taskId: task.id,
                  })
                }
              />
            ))}
          </>
        )}
      </ScrollView>

      <BottomNavigation active="Home" />
    </SafeAreaView>
  );
}

function StatCard({
  value,
  label,
  background,
  color,
}: {
  value: number;
  label: string;
  background: string;
  color: string;
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: background,
        },
      ]}
    >
      <Text
        style={[
          styles.statValue,
          {
            color,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.statLabel,
          {
            color,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ProjectCard({
  emoji,
  name,
  completed,
  total,
  color,
}: {
  emoji: string;
  name: string;
  completed: number;
  total: number;
  color: string;
}) {
  const percentage = completionPercentage(completed, total);

  return (
    <View style={styles.projectCard}>
      <Text style={styles.projectEmoji}>{emoji}</Text>

      <View style={styles.projectContent}>
        <View style={styles.projectHeader}>
          <Text style={styles.projectName}>{name}</Text>

          <Text
            style={[
              styles.projectPercent,
              {
                color,
              },
            ]}
          >
            {percentage}%
          </Text>
        </View>

        <View style={styles.projectProgressBackground}>
          <View
            style={[
              styles.projectProgress,
              {
                backgroundColor: color,
                width: `${percentage}%`,
              },
            ]}
          />
        </View>

        <Text style={styles.projectSubtitle}>
          {completed} de {total} concluídas
        </Text>
      </View>
    </View>
  );
}

function TaskCard({
  task,
  onToggle,
  onPress,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.taskCard, task.done && styles.taskCardDone]}
      accessibilityRole="button"
      accessibilityLabel={`Abrir tarefa: ${task.title}`}
      onPress={onPress}
    >
      {/* Faixa prioridade */}
      <View
        style={[
          styles.priorityStripe,
          {
            backgroundColor: task.done
              ? COLORS.border
              : priorityColors[task.priority],
          },
        ]}
      />

      <Pressable
        style={styles.checkboxTarget}
        accessibilityRole="checkbox"
        accessibilityLabel={`Concluir tarefa: ${task.title}`}
        accessibilityState={{ checked: task.done }}
        onPress={event => {
          event?.stopPropagation();
          onToggle(task.id);
        }}
      >
        <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
          {task.done && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>

      {/* Conteúdo */}
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>
          {task.title}
        </Text>

        <Text style={styles.taskMetadata}>
          {task.project}
          {task.time ? ` · ${task.time}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerTextContainer: { flex: 1, paddingRight: SPACING.md },
  date: { fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  greeting: { fontSize: 26, fontWeight: '700', color: COLORS.textPrimary },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  periodSelector: {
    flexDirection: 'row',
    padding: SPACING.xs,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  periodChip: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  periodChipSelected: { backgroundColor: COLORS.surface },
  periodText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  periodTextSelected: { color: COLORS.primary },
  metricsHint: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  progressContent: { flex: 1 },
  progressLabel: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  progressSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  progressPercent: { color: COLORS.primary, fontSize: 24, fontWeight: '700' },
  progressBackground: {
    height: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  statCard: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  seeAllButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  seeAll: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  projectEmoji: { fontSize: 22, marginRight: SPACING.md },
  projectContent: { flex: 1 },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  projectName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  projectPercent: { fontSize: 12, fontWeight: '700' },
  projectProgressBackground: {
    height: 4,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  projectProgress: { height: 4, borderRadius: RADIUS.sm },
  projectSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.md,
    paddingLeft: SPACING.sm,
    marginBottom: SPACING.sm,
    minHeight: 68,
  },
  taskCardDone: { backgroundColor: COLORS.surfaceSecondary },
  priorityStripe: { width: 3, alignSelf: 'stretch', borderRadius: RADIUS.sm },
  checkboxTarget: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDone: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkmark: { color: COLORS.surface, fontWeight: '700' },
  taskContent: { flex: 1, paddingVertical: SPACING.xs },
  taskTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  taskTitleDone: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  taskMetadata: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  completedTitle: {
    color: COLORS.textSecondary,
    fontSize: 17,
    fontWeight: '700',
    marginVertical: SPACING.md,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyStateTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyStateText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  errorAlert: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.danger,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.danger, fontSize: 13, lineHeight: 19 },
});
