import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';

import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';

import BottomNavigation from '../components/BottomNavigation';

import {useTasks} from '../context/TaskContext';
import {useProjects} from '../context/ProjectContext';

export default function ProjectsScreen() {
  const navigation =
    useNavigation<any>();

  const {tasks} =
    useTasks();

  const {projects} =
    useProjects();

  const totalTasks =
    tasks.length;

  const totalDone =
    tasks.filter(
      task => task.done,
    ).length;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}>

      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F8F9FD"
      />

      <View style={styles.wrapper}>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>

          <View style={styles.header}>

            <Text style={styles.title}>
              Projetos
            </Text>

            <Pressable
              style={styles.newButton}
              onPress={() =>
                navigation.navigate(
                  'CriarProjeto',
                )
              }>

              <Text style={styles.newButtonIcon}>
                +
              </Text>

              <Text style={styles.newButtonText}>
                Novo
              </Text>

            </Pressable>

          </View>

          <View style={styles.overviewCard}>

            <OverviewStat
              value={projects.length}
              label="Projetos"
              color="#5C4DFF"
            />

            <View style={styles.divider} />

            <OverviewStat
              value={totalTasks}
              label="Total"
              color="#64748B"
            />

            <View style={styles.divider} />

            <OverviewStat
              value={totalDone}
              label="Feitas"
              color="#22C55E"
            />

            <View style={styles.divider} />

            <OverviewStat
              value={
                totalTasks - totalDone
              }
              label="Restantes"
              color="#F43F5E"
            />

          </View>

          <View style={styles.projectGrid}>

            {projects.map(project => {
              const tasksInProject =
                tasks.filter(
                  task =>
                    task.project ===
                    project.name,
                );

              const completed =
                tasksInProject.filter(
                  task => task.done,
                ).length;

              const taskCount =
                tasksInProject.length;

              const percentage =
                taskCount > 0
                  ? Math.round(
                      (completed / taskCount) *
                        100,
                    )
                  : 0;

              return (
                <Pressable
                  key={project.id}
                  style={styles.projectCard}
                  onPress={() =>
                    navigation.navigate(
                      'DetalheProjeto',
                      {
                        projectId:
                          project.id,
                      },
                    )
                  }>

                  <View
                    style={[
                      styles.projectIcon,
                      {
                        backgroundColor:
                          project.color + '22',
                      },
                    ]}>

                    <Text style={styles.projectEmoji}>
                      {project.icon ?? '📁'}
                    </Text>

                  </View>

                  <View style={styles.projectTopRow}>

                    <Text
                      style={styles.projectName}
                      numberOfLines={1}>
                      {project.name}
                    </Text>

                    <Text style={styles.arrow}>
                      ›
                    </Text>

                  </View>

                  <Text style={styles.projectSubtitle}>
                    {completed}/{taskCount} concluídas
                  </Text>

                  <View style={styles.progressTrack}>

                    <View
                      style={[
                        styles.progressBar,
                        {
                          width:
                            `${percentage}%`,

                          backgroundColor:
                            project.color,
                        },
                      ]}
                    />

                  </View>

                  <Text
                    style={[
                      styles.percentText,
                      {
                        color:
                          project.color,
                      },
                    ]}>
                    {percentage}%
                  </Text>

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

      <Text
        style={[
          styles.overviewValue,
          {color},
        ]}>
        {value}
      </Text>

      <Text style={styles.overviewLabel}>
        {label}
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },

  wrapper: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E1B3A',
  },

  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5C4DFF',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 11,
    elevation: 3,
  },

  newButtonIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    marginRight: 5,
  },

  newButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  overviewCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    marginBottom: 20,
    elevation: 2,
  },

  overviewStat: {
    flex: 1,
    alignItems: 'center',
  },

  overviewValue: {
    fontSize: 21,
    fontWeight: '700',
  },

  overviewLabel: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },

  divider: {
    width: 1,
    backgroundColor: '#F1F5F9',
  },

  projectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },

  projectCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    elevation: 2,
  },

  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
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
    color: '#1E1B3A',
    fontSize: 14,
    fontWeight: '700',
  },

  arrow: {
    color: '#CBD5E1',
    fontSize: 22,
  },

  projectSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 9,
  },

  progressTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
  },

  progressBar: {
    height: 5,
    borderRadius: 5,
  },

  percentText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 7,
  },
});