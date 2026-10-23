import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation, useRoute } from '@react-navigation/native';

import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';

import { COLORS, RADIUS, SPACING } from '../styles/theme';

export default function ProjectDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { projectId } = route.params;

  const { projects, deleteProject } = useProjects();

  const { tasks } = useTasks();

  const project = projects.find(item => item.id === projectId);

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Projeto não encontrado</Text>

          <Pressable
            style={styles.homeButton}
            onPress={() => navigation.navigate('Projetos')}
          >
            <Text style={styles.homeButtonText}>Voltar para Projetos</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const projectTasks = tasks.filter(
    task =>
      task.projectId === project.id ||
      (!!project.remoteId && task.projectId === project.remoteId),
  );

  const completed = projectTasks.filter(task => task.done).length;

  const total = projectTasks.length;

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  function confirmDelete() {
    if (!project) {
      return;
    }
    Alert.alert(
      'Excluir projeto',
      `Tem certeza que deseja excluir "${project.name}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',

          onPress: async () => {
            try {
              await deleteProject(project.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert(
                'Não foi possível excluir',
                error instanceof Error ? error.message : 'Tente novamente.',
              );
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Detalhes do Projeto</Text>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Projeto */}
        <View style={styles.heroCard}>
          <View
            style={[
              styles.projectIcon,
              {
                backgroundColor: project.color + '22',
              },
            ]}
          >
            <Text style={styles.projectEmoji}>{project.icon || ''}</Text>
          </View>

          <Text style={styles.projectName}>{project.name}</Text>

          <Text style={styles.description}>
            {project.description || 'Sem descrição.'}
          </Text>
        </View>

        {/* Progresso */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.sectionLabel}>PROGRESSO</Text>

              <Text style={styles.progressTitle}>
                {completed} de {total} tarefas
              </Text>
            </View>

            <Text style={styles.percentage}>{percentage}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${percentage}%`,
                  backgroundColor: project.color,
                },
              ]}
            />
          </View>
        </View>

        {/* Tarefas */}
        <Text style={styles.sectionTitle}>Tarefas</Text>

        {projectTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhuma tarefa</Text>

            <Text style={styles.emptyText}>
              Este projeto ainda não possui tarefas.
            </Text>
          </View>
        ) : (
          projectTasks.map(task => (
            <Pressable
              key={task.id}
              accessibilityRole="button"
              accessibilityLabel={`Abrir tarefa: ${task.title}`}
              style={[styles.taskCard, task.done && styles.completedCard]}
              onPress={() =>
                navigation.navigate('DetalheTarefa', {
                  taskId: task.id,
                })
              }
            >
              <View
                style={[
                  styles.priorityLine,
                  {
                    backgroundColor:
                      task.priority === 'high'
                        ? COLORS.danger
                        : task.priority === 'medium'
                        ? COLORS.warning
                        : COLORS.primary,
                  },
                ]}
              />

              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, task.done && styles.taskDone]}>
                  {task.title}
                </Text>

                <Text style={styles.taskTime}>
                  {task.time ?? 'Sem horário'}
                </Text>
              </View>

              <Text style={styles.taskArrow}>›</Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Ações */}
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          style={styles.editButton}
          onPress={() =>
            navigation.navigate('EditarProjeto', {
              projectId: project.id,
            })
          }
        >
          <Text style={styles.editText}>Editar projeto</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.deleteButton}
          onPress={confirmDelete}
        >
          <Text style={styles.deleteText}>Excluir</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scroll: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backIcon: {
    fontSize: 31,
    color: COLORS.textPrimary,
    marginTop: -4,
  },

  headerTitle: {
    flex: 1,
    marginLeft: SPACING.md,
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },

  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },

  projectIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },

  projectEmoji: {
    fontSize: 25,
  },

  projectName: {
    color: COLORS.textPrimary,
    fontSize: 23,
    fontWeight: '700',
  },

  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: SPACING.sm,
  },

  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },

  progressTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },

  percentage: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },

  progressTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },

  progressBar: {
    height: 8,
    borderRadius: RADIUS.sm,
  },

  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },

  completedCard: { backgroundColor: COLORS.surfaceSecondary },
  taskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },

  priorityLine: {
    width: 4,
    height: 44,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.md,
  },

  taskContent: {
    flex: 1,
  },

  taskTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  taskDone: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },

  taskTime: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: SPACING.xs,
  },

  taskArrow: {
    color: COLORS.border,
    fontSize: 22,
  },

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
  },

  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },

  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },

  footer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  editButton: {
    minHeight: 48,
    justifyContent: 'center',
    flex: 2,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },

  editText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
  },

  deleteButton: {
    minHeight: 48,
    justifyContent: 'center',
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.dangerSoft,
  },

  deleteText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },

  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },

  notFoundTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.lg,
  },

  homeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },

  homeButtonText: {
    color: COLORS.surface,
    fontWeight: '700',
  },
});
