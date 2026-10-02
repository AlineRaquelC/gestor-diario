import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  StatusBar,
} from 'react-native';

import {SafeAreaView} from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import {useTasks} from '../context/TaskContext';

export default function TaskDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const {taskId} = route.params;

  const {
    tasks,
    deleteTask,
    toggleTask,
    updateTask,
  } = useTasks();

  const task = tasks.find(
    item => item.id === taskId,
  );

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>
            Tarefa não encontrada
          </Text>

          <Pressable
            style={styles.backHomeButton}
            onPress={() =>
              navigation.navigate('Home')
            }>
            <Text style={styles.backHomeText}>
              Voltar para Home
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const subtasks =
    task.subtasks ?? [];

  const doneCount =
    subtasks.filter(
      subtask => subtask.done,
    ).length;

  const progress =
    subtasks.length > 0
      ? Math.round(
          (doneCount / subtasks.length) * 100,
        )
      : 0;

  function formatDateBR(
    date?: string,
  ) {
    if (!date) {
      return 'Não definida';
    }

    return new Date(
      date,
    ).toLocaleDateString('pt-BR');
  }

  function getPriorityLabel() {
    if (
      task.priority === 'high'
    ) {
      return 'Alta prioridade';
    }

    if (
      task.priority === 'medium'
    ) {
      return 'Média prioridade';
    }

    return 'Baixa prioridade';
  }

  function getStatusLabel() {
    switch (task.status) {
      case 'completed':
        return 'Concluída';

      case 'review':
        return 'Em revisão';

      case 'todo':
        return 'A fazer';

      default:
        return 'Em andamento';
    }
  }

  function toggleSubtask(
    id: string,
  ) {
    const updatedSubtasks =
      subtasks.map(
        subtask =>
          subtask.id === id
            ? {
                ...subtask,
                done:
                  !subtask.done,
              }
            : subtask,
      );

    updateTask(
      taskId,
      {
        subtasks:
          updatedSubtasks,
      },
    );
  }

  function handleToggleCompleted() {
    toggleTask(taskId);
  }

  function handleDeleteTask() {
    Alert.alert(
      'Excluir tarefa',
      'Tem certeza que deseja excluir esta tarefa?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteTask(taskId);

            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'Home',
                },
              ],
            });
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}>

      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F6F7FF"
      />

      {/* Cabeçalho */}
      <View style={styles.header}>

        <Pressable
          style={styles.headerButton}
          onPress={() =>
            navigation.goBack()
          }>

          <Text style={styles.backIcon}>
            ‹
          </Text>

        </Pressable>

        <Text style={styles.headerTitle}>
          Detalhes da Tarefa
        </Text>

        <View style={styles.headerButton}>
          <Text style={styles.menuIcon}>
            ⋮
          </Text>
        </View>

      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Card principal */}
        <View style={styles.heroCard}>

          <View style={styles.badgesRow}>

            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>
                ★ {getPriorityLabel()}
              </Text>
            </View>

            <View style={styles.projectBadge}>
              <Text style={styles.projectText}>
                📁 {task.project}
              </Text>
            </View>

          </View>

          <Text
            style={[
              styles.taskTitle,
              task.done &&
                styles.taskTitleCompleted,
            ]}>
            {task.title}
          </Text>

          <Text style={styles.description}>
            {task.description?.trim()
              ? task.description
              : 'Sem descrição.'}
          </Text>

          {task.done && (
            <View style={styles.completedMessage}>

              <Text style={styles.completedMessageIcon}>
                ✓
              </Text>

              <Text style={styles.completedMessageText}>
                Tarefa concluída!
              </Text>

            </View>
          )}

        </View>

        {/* Informações */}
        <View style={styles.infoGrid}>

          <InfoCard
            icon="📅"
            label="Início"
            value={
              formatDateBR(
                task.startDate,
              )
            }
          />

          <InfoCard
            icon="📅"
            label="Prazo"
            value={
              formatDateBR(
                task.dueDate,
              )
            }
            accent
            accentColor="#F43F5E"
            background="#FFF5F6"
          />

          <InfoCard
            icon="🕒"
            label="Horário"
            value={
              task.time ??
              'Não definido'
            }
          />

          <InfoCard
            icon="✓"
            label="Status"
            value={
              getStatusLabel()
            }
            accent
            accentColor={
              task.status ===
              'completed'
                ? '#15803D'
                : task.status ===
                  'review'
                ? '#D97706'
                : '#5C4DFF'
            }
            background={
              task.status ===
              'completed'
                ? '#EEF8F2'
                : task.status ===
                  'review'
                ? '#FEF3C7'
                : '#EEF0FF'
            }
          />

        </View>

        {/* Progresso */}
        <View style={styles.card}>

          <View style={styles.progressHeader}>

            <Text style={styles.cardTitle}>
              Progresso
            </Text>

            <Text style={styles.progressPercent}>
              {progress}%
            </Text>

          </View>

          <View style={styles.progressTrack}>

            <View
              style={[
                styles.progressBar,
                {
                  width:
                    `${progress}%`,
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
                progress === 100 &&
                  styles.progressStatusDone,
              ]}>

              <Text
                style={[
                  styles.progressStatusText,
                  progress === 100 &&
                    styles.progressStatusTextDone,
                ]}>
                {progress === 100
                  ? 'Concluído'
                  : 'Em progresso'}
              </Text>

            </View>

          </View>

        </View>

        {/* Subtarefas */}
        <View style={styles.sectionHeader}>

          <Text style={styles.cardTitle}>
            Subtarefas
          </Text>

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
            subtasks.map(
              (subtask, index) => (

                <Pressable
                  key={subtask.id}
                  style={[
                    styles.subtaskRow,
                    index <
                      subtasks.length - 1 &&
                      styles.subtaskBorder,
                  ]}
                  onPress={() =>
                    toggleSubtask(
                      subtask.id,
                    )
                  }>

                  <View
                    style={[
                      styles.checkbox,
                      subtask.done &&
                        styles.checkboxDone,
                    ]}>

                    {subtask.done && (
                      <Text style={styles.checkboxText}>
                        ✓
                      </Text>
                    )}

                  </View>

                  <Text
                    style={[
                      styles.subtaskTitle,
                      subtask.done &&
                        styles.subtaskTitleDone,
                    ]}>
                    {subtask.title}
                  </Text>

                  <View
                    style={[
                      styles.statusPill,
                      subtask.done &&
                        styles.statusPillDone,
                    ]}>

                    <Text
                      style={[
                        styles.statusPillText,
                        subtask.done &&
                          styles.statusPillTextDone,
                      ]}>
                      {subtask.done
                        ? 'Feita'
                        : 'Pendente'}
                    </Text>

                  </View>

                </Pressable>
              )
            )
          )}

        </View>

        {/* Atividade */}
        <View style={styles.card}>

          <Text style={styles.activityTitle}>
            Atividade
          </Text>

          <ActivityRow
            emoji="✅"
            title="Configurar ambiente"
            description="foi concluída"
            time="Hoje, 14:22"
          />

          <ActivityRow
            emoji="✅"
            title="Criar backlog"
            description="foi concluída"
            time="Hoje, 11:08"
          />

          <ActivityRow
            emoji="🆕"
            title="Tarefa criada"
            description="por Aline"
            time="20/09, 09:00"
          />

        </View>

      </ScrollView>

      {/* Rodapé */}
      <View style={styles.footer}>

        <Pressable
          style={styles.editButton}
          onPress={() =>
            navigation.navigate(
              'EditarTarefa',
              {
                taskId,
              },
            )
          }>

          <Text style={styles.editIcon}>
            ✎
          </Text>

          <Text style={styles.editText}>
            Editar
          </Text>

        </Pressable>

        <Pressable
          style={[
            styles.completeButton,
            task.done &&
              styles.completeButtonDone,
          ]}
          onPress={
            handleToggleCompleted
          }>

          <Text style={styles.completeButtonText}>
            {task.done
              ? '✓ Concluída!'
              : '✓ Concluir tarefa'}
          </Text>

        </Pressable>

        <Pressable
          style={styles.deleteButton}
          onPress={
            handleDeleteTask
          }>

          <Text style={styles.deleteIcon}>
            🗑
          </Text>

          <Text style={styles.deleteText}>
            Excluir
          </Text>

        </Pressable>

      </View>

    </SafeAreaView>
  );
}

function InfoCard({
  icon,
  label,
  value,
  accent = false,
  accentColor = '#5C4DFF',
  background = '#FFFFFF',
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
  accentColor?: string;
  background?: string;
}) {
  return (
    <View
      style={[
        styles.infoCard,
        {
          backgroundColor:
            background,
          borderColor:
            accent
              ? `${accentColor}33`
              : '#F1F5F9',
        },
      ]}>

      <View style={styles.infoLabelRow}>

        <Text style={styles.infoIcon}>
          {icon}
        </Text>

        <Text style={styles.infoLabel}>
          {label}
        </Text>

      </View>

      <Text
        style={[
          styles.infoValue,
          accent && {
            color: accentColor,
          },
        ]}>
        {value}
      </Text>

    </View>
  );
}

function ActivityRow({
  emoji,
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

      <View style={styles.activityIcon}>
        <Text>
          {emoji}
        </Text>
      </View>

      <View style={styles.activityContent}>

        <Text style={styles.activityText}>
          <Text style={styles.activityStrong}>
            {title}
          </Text>{' '}
          {description}
        </Text>

        <Text style={styles.activityTime}>
          {time}
        </Text>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FF',
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
    color: '#1E1B3A',
    marginBottom: 16,
  },

  backHomeButton: {
    backgroundColor: '#5C4DFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },

  backHomeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  header: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F5',
  },

  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: 31,
    color: '#1E1B3A',
    marginTop: -4,
  },

  menuIcon: {
    color: '#64748B',
    fontSize: 24,
  },

  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 19,
    fontWeight: '700',
    color: '#1E1B3A',
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 24,
  },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
  },

  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },

  priorityBadge: {
    backgroundColor: '#FFE4E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  priorityText: {
    color: '#F43F5E',
    fontSize: 12,
    fontWeight: '600',
  },

  projectBadge: {
    backgroundColor: '#EEF0FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  projectText: {
    color: '#5C4DFF',
    fontSize: 12,
    fontWeight: '600',
  },

  taskTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1E1B3A',
    marginBottom: 7,
  },

  taskTitleCompleted: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },

  description: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },

  completedMessage: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    flexDirection: 'row',
    alignItems: 'center',
  },

  completedMessageIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: '#22C55E',
    color: '#FFFFFF',
    fontWeight: '700',
    marginRight: 8,
  },

  completedMessageText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '600',
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },

  infoCard: {
    width: '48.5%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    elevation: 1,
  },

  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  infoIcon: {
    fontSize: 14,
    marginRight: 6,
  },

  infoLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  infoValue: {
    color: '#1E1B3A',
    fontSize: 14,
    fontWeight: '700',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 17,
    marginBottom: 14,
    elevation: 2,
  },

  cardNoPadding: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    elevation: 2,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B3A',
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  progressPercent: {
    color: '#5C4DFF',
    fontSize: 15,
    fontWeight: '700',
  },

  progressTrack: {
    height: 10,
    backgroundColor: '#EEF0FF',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },

  progressBar: {
    height: 10,
    borderRadius: 8,
    backgroundColor: '#5C4DFF',
  },

  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  progressDescription: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 11,
    marginRight: 8,
  },

  progressStatus: {
    backgroundColor: '#EEF0FF',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  progressStatusDone: {
    backgroundColor: '#F0FDF4',
  },

  progressStatusText: {
    color: '#5C4DFF',
    fontSize: 10,
    fontWeight: '700',
  },

  progressStatusTextDone: {
    color: '#22C55E',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  subtaskCounter: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },

  emptySubtasks: {
    padding: 18,
    alignItems: 'center',
  },

  emptySubtasksText: {
    color: '#94A3B8',
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
    borderBottomColor: '#F8FAFC',
  },

  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  checkboxDone: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },

  checkboxText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  subtaskTitle: {
    flex: 1,
    color: '#1E1B3A',
    fontSize: 14,
    fontWeight: '500',
  },

  subtaskTitleDone: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },

  statusPill: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  statusPillDone: {
    backgroundColor: '#F0FDF4',
  },

  statusPillText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },

  statusPillTextDone: {
    color: '#15803D',
  },

  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B3A',
    marginBottom: 12,
  },

  activityRow: {
    flexDirection: 'row',
    marginBottom: 13,
  },

  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  activityContent: {
    flex: 1,
  },

  activityText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
  },

  activityStrong: {
    fontWeight: '700',
    color: '#1E1B3A',
  },

  activityTime: {
    color: '#B0BAC9',
    fontSize: 11,
    marginTop: 2,
  },

  footer: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#EEF0F5',
  },

  editButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },

  editIcon: {
    color: '#5C4DFF',
    fontSize: 17,
  },

  editText: {
    color: '#5C4DFF',
    fontSize: 11,
    fontWeight: '700',
  },

  completeButton: {
    flex: 2.4,
    backgroundColor: '#5C4DFF',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  completeButtonDone: {
    backgroundColor: '#22C55E',
  },

  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  deleteButton: {
    flex: 1,
    backgroundColor: '#FFF5F6',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },

  deleteIcon: {
    fontSize: 15,
  },

  deleteText: {
    color: '#F43F5E',
    fontSize: 11,
    fontWeight: '700',
  },
});