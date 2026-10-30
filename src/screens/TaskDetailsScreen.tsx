import { recurrenceLabel } from '../models/recurrence';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useTaskDeletion } from '../hooks/useTaskDeletion';

import { useTasks } from '../context/TaskContext';
import { formatReminder } from '../models/reminderPresentation';
import type { SchedulingState } from '../services/reminderScheduler';
import { presentTaskHistory } from '../models/taskHistory';
import TaskNotesSection from '../components/TaskNotesSection';
import { useProjects } from '../context/ProjectContext';
import { COLORS, RADIUS, SPACING } from '../styles/theme';

const schedulingLabels: Record<SchedulingState, string> = {
  not_required: 'Nenhum agendamento ativo neste aparelho',
  scheduled: 'Lembrete agendado neste aparelho',
  pending: 'Agendamento pendente',
  unavailable: 'Notificações indisponíveis neste aparelho',
  error: 'Não foi possível confirmar o agendamento',
};

export default function TaskDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const taskId = route.params?.taskId;
  const { projects } = useProjects();

  const {
    tasks,
    toggleTask,
    toggleSubtask: toggleChild,
    loading,
    loadTaskById,
    taskHistory,
    reminderScheduling,
    loadTaskHistory,
  } = useTasks();

  const handleDeleteTask = useTaskDeletion(taskId, () => {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  });

  const task = tasks.find(item => item.id === taskId);

  const selectedProject = task?.projectId
    ? projects.find(
        project =>
          project.id === task.projectId || project.remoteId === task.projectId,
      )
    : undefined;
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const hasTask = Boolean(task);
  const [statusSaving, setStatusSaving] = useState(false);
  const [subtaskSaving, setSubtaskSaving] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const updatedAt = task?.updatedAt;
  useEffect(() => {
    if (!hasTask || loading) {
      return;
    }
    let active = true;
    setHistoryLoading(true);
    setHistoryError(null);
    loadTaskHistory(taskId)
      .catch(() => {
        if (active) {
          setHistoryError('Não foi possível carregar a atividade.');
        }
      })
      .finally(() => {
        if (active) {
          setHistoryLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [taskId, hasTask, loading, updatedAt, loadTaskHistory]);
  useEffect(() => {
    if (loading) {
      return;
    }
    setDetailError(null);
    if (hasTask || typeof taskId !== 'string' || !taskId.trim()) {
      setDetailLoading(false);
      return;
    }
    let active = true;
    setDetailLoading(true);
    loadTaskById(taskId)
      .catch(error => {
        if (active) {
          setDetailError(
            error instanceof Error
              ? error.message
              : 'Erro ao consultar tarefa.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setDetailLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [taskId, hasTask, loading, loadTaskById]);

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>
            {loading || detailLoading
              ? 'Carregando tarefa…'
              : detailError ?? 'Tarefa não encontrada'}
          </Text>

          <Pressable
            accessibilityRole="button"
            style={styles.backHomeButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.backHomeText}>Voltar para Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const subtasks = task.subtasks ?? [];

  const doneCount = subtasks.filter(subtask => subtask.done).length;

  const progress =
    task.progress ??
    (subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0);

  function formatDateBR(date?: string) {
    if (!date) {
      return 'Não definida';
    }

    return new Date(date).toLocaleDateString('pt-BR');
  }

  function getPriorityLabel() {
    if (task.priority === 'high') {
      return 'Alta prioridade';
    }

    if (task.priority === 'medium') {
      return 'Média prioridade';
    }

    return 'Baixa prioridade';
  }

  function getStatusLabel() {
    switch (task.status) {
      case 'completed':
        return 'Concluída';

      case 'todo':
        return 'A fazer';

      default:
        return 'Em andamento';
    }
  }

  async function toggleSubtask(id: string) {
    if (subtaskSaving || statusSaving) {
      return;
    }
    setSubtaskSaving(id);
    try {
      const result = await toggleChild(taskId, id);
      if (!result.cacheSaved) {
        Alert.alert(
          'Subtarefa salva no servidor',
          'Não foi possível atualizar o cache local.',
        );
      }
    } catch (error) {
      Alert.alert(
        'Não foi possível alterar a subtarefa',
        error instanceof Error
          ? error.message
          : 'Verifique a conexão e tente novamente.',
      );
    } finally {
      setSubtaskSaving(null);
    }
  }

  async function handleToggleCompleted() {
    if (statusSaving || subtaskSaving) {
      return;
    }
    setStatusSaving(true);
    try {
      const result = await toggleTask(taskId);
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
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={styles.scroll}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Detalhes da Tarefa</Text>

          <View style={styles.headerButton}>
            <Text style={styles.menuIcon}>⋮</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card principal */}
          <View style={styles.heroCard}>
            <View style={styles.badgesRow}>
              <View
                style={[
                  styles.priorityBadge,
                  task.priority === 'high'
                    ? styles.priorityHigh
                    : task.priority === 'medium'
                    ? styles.priorityMedium
                    : styles.priorityLow,
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    task.priority === 'high'
                      ? styles.priorityHighText
                      : task.priority === 'medium'
                      ? styles.priorityMediumText
                      : styles.priorityLowText,
                  ]}
                >
                  {getPriorityLabel()}
                </Text>
              </View>

              <View style={styles.projectBadge}>
                <Text style={styles.projectText}>
                  {selectedProject?.icon ? `${selectedProject.icon} ` : ''}
                  {task.project}
                </Text>
              </View>
            </View>

            <Text
              style={[styles.taskTitle, task.done && styles.taskTitleCompleted]}
            >
              {task.title}
            </Text>

            <Text style={styles.description}>
              {task.description?.trim() ? task.description : 'Sem descrição.'}
            </Text>

            {task.done && (
              <View style={styles.completedMessage}>
                <Text style={styles.completedMessageIcon}>✓</Text>

                <Text style={styles.completedMessageText}>
                  Tarefa concluída!
                </Text>
              </View>
            )}
          </View>

          {/* Informações */}
          <View style={styles.infoSection}>
            <Text style={styles.cardTitle}>Informações</Text>
            <View style={styles.infoGrid}>
              <InfoCard label="Início" value={formatDateBR(task.startDate)} />

              <InfoCard
                label="Prazo"
                value={formatDateBR(task.dueDate)}
                accent
                accentColor={COLORS.danger}
                background={COLORS.dangerSoft}
              />

              <InfoCard label="Horário" value={task.time ?? 'Não definido'} />

              <InfoCard
                label="Status"
                value={getStatusLabel()}
                accent
                accentColor={
                  task.status === 'completed' ? COLORS.success : COLORS.primary
                }
                background={
                  task.status === 'completed'
                    ? COLORS.successSoft
                    : COLORS.primarySoft
                }
              />
            </View>
          </View>
          {/* Progresso */}
          <View style={styles.card}>
            <View style={styles.progressHeader}>
              <Text style={styles.cardTitle}>Progresso</Text>

              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>

            <View
              style={styles.progressTrack}
              accessibilityRole="progressbar"
              accessibilityLabel="Progresso das subtarefas"
              accessibilityValue={{ min: 0, max: 100, now: progress }}
            >
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.progressFooter}>
              <Text style={styles.progressDescription}>
                {doneCount} de {subtasks.length} subtarefas concluídas
              </Text>

              <View
                style={[
                  styles.progressStatus,
                  progress === 100 && styles.progressStatusDone,
                ]}
              >
                <Text
                  style={[
                    styles.progressStatusText,
                    progress === 100 && styles.progressStatusTextDone,
                  ]}
                >
                  {progress === 100 ? 'Concluído' : 'Em progresso'}
                </Text>
              </View>
            </View>
          </View>

          {!!task.recurrenceSeriesId && task.recurrence && <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.cardTitle}>Recorrência</Text>
            <Text style={styles.reminderText}>{recurrenceLabel(task.recurrence.frequency)}</Text>
            <Text style={styles.reminderCaption}>Esta tarefa faz parte de uma série.</Text>
          </View>}
          {!!task.reminders?.length && (
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.cardTitle}>
                Lembretes
              </Text>
              <Text style={styles.reminderCaption}>Configuração</Text>
              {[...task.reminders]
                .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
                .map(reminder => (
                  <Text key={reminder.id} style={styles.reminderText}>
                    {formatReminder(reminder.offsetMinutes)}
                  </Text>
                ))}
              <Text style={styles.reminderCaption}>Neste aparelho</Text>
              <Text
                accessibilityLiveRegion="polite"
                style={styles.reminderText}
              >
                {reminderScheduling?.[task.id]
                  ? schedulingLabels[reminderScheduling[task.id].state]
                  : 'Agendamento ainda não confirmado'}
              </Text>
            </View>
          )}

          {/* Subtarefas */}
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Subtarefas</Text>

            <Text style={styles.subtaskCounter}>
              {doneCount}/{subtasks.length}
            </Text>
          </View>

          <View style={styles.cardNoPadding}>
            {subtasks.length === 0 ? (
              <View style={styles.emptySubtasks}>
                <Text style={styles.emptySubtasksText}>
                  Nenhuma subtarefa cadastrada.
                </Text>
              </View>
            ) : (
              subtasks.map((subtask, index) => (
                <Pressable
                  key={subtask.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={subtask.title}
                  accessibilityState={{
                    checked: subtask.done,
                    disabled: subtaskSaving === subtask.id || statusSaving,
                  }}
                  disabled={subtaskSaving === subtask.id || statusSaving}
                  style={[
                    styles.subtaskRow,
                    index < subtasks.length - 1 && styles.subtaskBorder,
                  ]}
                  onPress={() => toggleSubtask(subtask.id)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      subtask.done && styles.checkboxDone,
                    ]}
                  >
                    {subtask.done && <Text style={styles.checkboxText}>✓</Text>}
                  </View>

                  <Text
                    style={[
                      styles.subtaskTitle,
                      subtask.done && styles.subtaskTitleDone,
                    ]}
                  >
                    {subtask.title}
                  </Text>

                  <View
                    style={[
                      styles.statusPill,
                      subtask.done && styles.statusPillDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        subtask.done && styles.statusPillTextDone,
                      ]}
                    >
                      {subtask.done ? 'Feita' : 'Pendente'}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>

          <TaskNotesSection key={taskId} taskId={taskId} />

          {/* Atividade */}
          <View style={styles.card}>
            <Text style={styles.activityTitle}>Atividade</Text>

            {historyLoading && (
              <Text style={styles.activityText}>Carregando atividade…</Text>
            )}
            {historyError && (
              <Text style={styles.errorText} accessibilityRole="alert">
                {historyError}
              </Text>
            )}
            {!historyLoading &&
              !historyError &&
              !taskHistory[taskId]?.length && (
                <Text style={styles.activityText}>
                  Nenhuma atividade registrada.
                </Text>
              )}
            {(taskHistory[taskId] ?? []).map(event => (
              <ActivityRow key={event.id} {...presentTaskHistory(event)} />
            ))}
          </View>
        </ScrollView>

        {/* Rodapé */}
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Editar tarefa"
            style={styles.editButton}
            onPress={() =>
              navigation.navigate('EditarTarefa', {
                taskId,
              })
            }
          >
            <Text style={styles.editText}>Editar</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: statusSaving || subtaskSaving !== null,
            }}
            style={[
              styles.completeButton,
              (statusSaving || subtaskSaving !== null) && styles.disabled,
              task.done && styles.completeButtonDone,
            ]}
            onPress={handleToggleCompleted}
            disabled={statusSaving || subtaskSaving !== null}
          >
            <Text style={styles.completeButtonText}>
              {statusSaving
                ? 'Salvando…'
                : task.done
                ? '↩ Reabrir tarefa'
                : '✓ Concluir tarefa'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Excluir tarefa"
            style={styles.deleteButton}
            onPress={handleDeleteTask}
          >
            <Text style={styles.deleteText}>Excluir</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InfoCard({
  label,
  value,
  accent = false,
  accentColor = COLORS.primary,
}: {
  label: string;
  value: string;
  accent?: boolean;
  accentColor?: string;
  background?: string;
}) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, accent && { color: accentColor }]}>
        {value}
      </Text>
    </View>
  );
}

function ActivityRow({
  title,
  description,
  time,
}: {
  emoji: string;
  title: string;
  description: string;
  time: string;
}) {
  return (
    <View style={styles.activityRow}>
      <View style={styles.activityMarker} />

      <View style={styles.activityContent}>
        <Text style={styles.activityText}>
          <Text style={styles.activityStrong}>{title}</Text> {description}
        </Text>

        <Text style={styles.activityTime}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reminderCaption: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: SPACING.sm,
  },
  reminderText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    marginTop: SPACING.xs,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  backHomeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backHomeText: {
    color: COLORS.surface,
    fontWeight: '700',
  },
  backIcon: {
    fontSize: 31,
    color: COLORS.textPrimary,
    marginTop: -4,
  },
  menuIcon: {
    color: COLORS.textSecondary,
    fontSize: 24,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  projectBadge: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  projectText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  taskTitleCompleted: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  completedMessage: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.successSoft,
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedMessageIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: COLORS.success,
    color: COLORS.surface,
    fontWeight: '700',
    marginRight: 8,
  },
  completedMessageText: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressStatus: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  progressStatusDone: {
    backgroundColor: COLORS.successSoft,
  },
  progressStatusText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  progressStatusTextDone: {
    color: COLORS.success,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtaskCounter: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  emptySubtasks: {
    padding: 18,
    alignItems: 'center',
  },
  emptySubtasksText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingVertical: 14,
  },
  subtaskBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxDone: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkboxText: {
    color: COLORS.surface,
    fontWeight: '700',
  },
  subtaskTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  subtaskTitleDone: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  statusPill: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillDone: {
    backgroundColor: COLORS.successSoft,
  },
  statusPillText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  statusPillTextDone: {
    color: COLORS.success,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  activityStrong: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xl },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  description: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary },
  priorityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  priorityText: { fontSize: 12, fontWeight: '600' },
  priorityHigh: { backgroundColor: COLORS.dangerSoft },
  priorityHighText: { color: COLORS.danger },
  priorityMedium: { backgroundColor: COLORS.warningSoft },
  priorityMediumText: { color: COLORS.warning },
  priorityLow: { backgroundColor: COLORS.primarySoft },
  priorityLowText: { color: COLORS.primary },
  infoSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.lg,
    paddingTop: SPACING.md,
  },
  infoCard: { width: '46%', paddingVertical: SPACING.xs },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardNoPadding: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  progressTrack: {
    height: 6,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.primarySoft,
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  progressPercent: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  progressDescription: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  activityMarker: {
    width: 6,
    height: 6,
    marginTop: SPACING.sm,
    marginRight: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  activityRow: { flexDirection: 'row', paddingVertical: SPACING.sm },
  footer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
  },
  editText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  completeButton: {
    flex: 2.2,
    minHeight: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.surface,
    textAlign: 'center',
  },
  completeButtonDone: { backgroundColor: COLORS.primary },
  deleteButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
  },
  deleteText: { fontSize: 13, color: COLORS.danger, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    backgroundColor: COLORS.dangerSoft,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
  },
});
