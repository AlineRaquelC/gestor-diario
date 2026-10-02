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

import {SafeAreaView} from 'react-native-safe-area-context';

import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import {useProjects} from '../context/ProjectContext';
import {useTasks} from '../context/TaskContext';

export default function ProjectDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const {projectId} = route.params;

  const {
    projects,
    deleteProject,
  } = useProjects();

  const {tasks} = useTasks();

  const project =
    projects.find(
      item => item.id === projectId,
    );

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>

        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>
            Projeto não encontrado
          </Text>

          <Pressable
            style={styles.homeButton}
            onPress={() =>
              navigation.navigate('Projetos')
            }>

            <Text style={styles.homeButtonText}>
              Voltar para Projetos
            </Text>

          </Pressable>
        </View>

      </SafeAreaView>
    );
  }

  const projectTasks =
    tasks.filter(
      task =>
        task.project === project.name,
    );

  const completed =
    projectTasks.filter(
      task => task.done,
    ).length;

  const total =
    projectTasks.length;

  const percentage =
    total > 0
      ? Math.round(
          (completed / total) * 100,
        )
      : 0;

  function confirmDelete() {
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

          onPress: () => {
            deleteProject(project.id);

            navigation.goBack();
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
        backgroundColor="#F8F9FD"
      />

      {/* Header */}
      <View style={styles.header}>

        <Pressable
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }>

          <Text style={styles.backIcon}>
            ‹
          </Text>

        </Pressable>

        <Text style={styles.headerTitle}>
          Detalhes do Projeto
        </Text>

        <View style={{width: 38}} />

      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Projeto */}
        <View style={styles.heroCard}>

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

          <Text style={styles.projectName}>
            {project.name}
          </Text>

          <Text style={styles.description}>
            {project.description ||
              'Sem descrição.'}
          </Text>

        </View>

        {/* Progresso */}
        <View style={styles.progressCard}>

          <View style={styles.progressHeader}>

            <View>
              <Text style={styles.sectionLabel}>
                PROGRESSO
              </Text>

              <Text style={styles.progressTitle}>
                {completed} de {total} tarefas
              </Text>
            </View>

            <Text
              style={[
                styles.percentage,
                {
                  color: project.color,
                },
              ]}>
              {percentage}%
            </Text>

          </View>

          <View style={styles.progressTrack}>

            <View
              style={[
                styles.progressBar,
                {
                  width: `${percentage}%`,
                  backgroundColor:
                    project.color,
                },
              ]}
            />

          </View>

        </View>

        {/* Tarefas */}
        <Text style={styles.sectionTitle}>
          Tarefas
        </Text>

        {projectTasks.length === 0 ? (

          <View style={styles.emptyCard}>

            <Text style={styles.emptyIcon}>
              📋
            </Text>

            <Text style={styles.emptyTitle}>
              Nenhuma tarefa
            </Text>

            <Text style={styles.emptyText}>
              Este projeto ainda não possui tarefas.
            </Text>

          </View>

        ) : (

          projectTasks.map(task => (

            <Pressable
              key={task.id}
              style={styles.taskCard}
              onPress={() =>
                navigation.navigate(
                  'DetalheTarefa',
                  {
                    taskId: task.id,
                  },
                )
              }>

              <View
                style={[
                  styles.priorityLine,
                  {
                    backgroundColor:
                      task.priority === 'high'
                        ? '#F43F5E'
                        : task.priority === 'medium'
                        ? '#F59E0B'
                        : '#5C4DFF',
                  },
                ]}
              />

              <View style={styles.taskContent}>

                <Text
                  style={[
                    styles.taskTitle,
                    task.done &&
                      styles.taskDone,
                  ]}>
                  {task.title}
                </Text>

                <Text style={styles.taskTime}>
                  🕒 {task.time ?? 'Sem horário'}
                </Text>

              </View>

              <Text style={styles.taskArrow}>
                ›
              </Text>

            </Pressable>

          ))

        )}

      </ScrollView>

      {/* Ações */}
      <View style={styles.footer}>

        <Pressable
          style={styles.editButton}
          onPress={() =>
            navigation.navigate(
              'EditarProjeto',
              {
                projectId:
                  project.id,
              },
            )
          }>

          <Text style={styles.editText}>
            ✎ Editar projeto
          </Text>

        </Pressable>

        <Pressable
          style={styles.deleteButton}
          onPress={confirmDelete}>

          <Text style={styles.deleteText}>
            🗑 Excluir
          </Text>

        </Pressable>

      </View>

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },

  scroll: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F5',
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  backIcon: {
    fontSize: 31,
    color: '#1E1B3A',
    marginTop: -4,
  },

  headerTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 19,
    fontWeight: '700',
    color: '#1E1B3A',
  },

  content: {
    padding: 16,
    paddingBottom: 24,
  },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    elevation: 2,
  },

  projectIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  projectEmoji: {
    fontSize: 25,
  },

  projectName: {
    color: '#1E1B3A',
    fontSize: 23,
    fontWeight: '700',
  },

  description: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },

  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
    marginBottom: 22,
    elevation: 2,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  sectionLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },

  progressTitle: {
    color: '#1E1B3A',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 3,
  },

  percentage: {
    fontSize: 20,
    fontWeight: '700',
  },

  progressTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    overflow: 'hidden',
  },

  progressBar: {
    height: 8,
    borderRadius: 8,
  },

  sectionTitle: {
    color: '#1E1B3A',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },

  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 13,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  priorityLine: {
    width: 4,
    height: 38,
    borderRadius: 4,
    marginRight: 11,
  },

  taskContent: {
    flex: 1,
  },

  taskTitle: {
    color: '#1E1B3A',
    fontSize: 14,
    fontWeight: '600',
  },

  taskDone: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },

  taskTime: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },

  taskArrow: {
    color: '#CBD5E1',
    fontSize: 22,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 28,
  },

  emptyTitle: {
    color: '#1E1B3A',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 7,
  },

  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  footer: {
    flexDirection: 'row',
    gap: 9,
    padding: 14,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#EEF0F5',
  },

  editButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    backgroundColor: '#5C4DFF',
  },

  editText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    backgroundColor: '#FFF1F3',
  },

  deleteText: {
    color: '#F43F5E',
    fontSize: 13,
    fontWeight: '700',
  },

  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  notFoundTitle: {
    color: '#1E1B3A',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
  },

  homeButton: {
    backgroundColor: '#5C4DFF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },

  homeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});