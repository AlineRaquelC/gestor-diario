import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import BottomNavigation from '../components/BottomNavigation';

import { useTasks } from '../context/TaskContext';
import { useProjects } from '../context/ProjectContext';

import { COLORS, RADIUS, SPACING } from '../styles/theme';

export default function ProjectsScreen() {
  const navigation = useNavigation<any>();

  const { tasks } = useTasks();

  const { projects } = useProjects();

  const totalTasks = tasks.length;

  const totalDone = tasks.filter(task => task.done).length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.wrapper}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Projetos</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Novo projeto"
              style={styles.newButton}
              onPress={() => navigation.navigate('CriarProjeto')}
            >
              <Text style={styles.newButtonIcon}>+</Text>

              <Text style={styles.newButtonText}>Novo</Text>
            </Pressable>
          </View>

          <View style={styles.overviewCard}>
            <OverviewStat
              value={projects.length}
              label="Projetos"
              color={COLORS.primary}
            />

            <View style={styles.divider} />

            <OverviewStat
              value={totalTasks}
              label="Total"
              color={COLORS.textSecondary}
            />

            <View style={styles.divider} />

            <OverviewStat
              value={totalDone}
              label="Feitas"
              color={COLORS.success}
            />

            <View style={styles.divider} />

            <OverviewStat
              value={totalTasks - totalDone}
              label="Restantes"
              color={COLORS.danger}
            />
          </View>

          <View style={styles.projectGrid}>
            {projects.map(project => {
              const tasksInProject = tasks.filter(
                task =>
                  task.projectId === project.id ||
                  (!!project.remoteId && task.projectId === project.remoteId),
              );

              const completed = tasksInProject.filter(task => task.done).length;

              const taskCount = tasksInProject.length;

              const percentage =
                taskCount > 0 ? Math.round((completed / taskCount) * 100) : 0;

              return (
                <Pressable
                  key={project.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir projeto: ${project.name}`}
                  style={styles.projectCard}
                  onPress={() =>
                    navigation.navigate('DetalheProjeto', {
                      projectId: project.id,
                    })
                  }
                >
                  <View
                    style={[
                      styles.projectIcon,
                      {
                        backgroundColor: project.color + '22',
                      },
                    ]}
                  >
                    <Text style={styles.projectEmoji}>
                      {project.icon || ''}
                    </Text>
                  </View>

                  <View style={styles.projectTopRow}>
                    <Text style={styles.projectName} numberOfLines={1}>
                      {project.name}
                    </Text>

                    <Text style={styles.arrow}>›</Text>
                  </View>

                  <Text style={styles.projectSubtitle}>
                    {completed}/{taskCount} concluídas
                  </Text>

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

                  <Text style={styles.percentText}>{percentage}%</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <BottomNavigation active="Projetos" />
      </View>
    </SafeAreaView>
  );
}

function OverviewStat({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.overviewStat}>
      <Text style={[styles.overviewValue, { color }]}>{value}</Text>

      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  wrapper: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  newButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },

  newButtonIcon: {
    color: COLORS.surface,
    fontSize: 18,
    marginRight: SPACING.xs,
  },

  newButtonText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: '700',
  },

  overviewCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.xl,
  },

  overviewStat: {
    flex: 1,
    alignItems: 'center',
  },

  overviewValue: {
    fontSize: 24,
    fontWeight: '700',
  },

  overviewLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: SPACING.xs,
  },

  divider: {
    width: 1,
    backgroundColor: COLORS.surfaceSecondary,
  },

  projectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },

  projectCard: {
    minHeight: 184,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },

  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  projectEmoji: {
    fontSize: 20,
  },

  projectTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  projectName: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  arrow: {
    color: COLORS.border,
    fontSize: 22,
  },

  projectSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },

  progressTrack: {
    height: 5,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },

  progressBar: {
    height: 5,
    borderRadius: RADIUS.sm,
  },

  percentText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
});
