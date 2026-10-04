import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
} from 'react-native';

import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';

import BottomNavigation from '../components/BottomNavigation';
import {
  useTasks,
  Task,
} from '../context/TaskContext';

const priorityColors = {
  high: '#F43F5E',
  medium: '#F59E0B',
  low: '#5C4DFF',
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  const {
    tasks,
    toggleTask,
    loading,
    readError,
  } = useTasks();

  const doneTasks = tasks.filter(
    task => task.done,
  );

  const pendingTasks = tasks.filter(
    task => !task.done,
  );

  const urgentTasks = pendingTasks.filter(
    task => task.priority === 'high',
  );

  const progress =
    tasks.length > 0
      ? Math.round(
          (doneTasks.length / tasks.length) * 100,
        )
      : 0;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}>

      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F8F9FD"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Cabeçalho */}
        <View style={styles.header}>

          <View style={styles.headerTextContainer}>

            <Text style={styles.date}>
              Domingo, 20 de setembro
            </Text>

            <Text style={styles.greeting}>
              Bom dia, Aline! 👋
            </Text>

          </View>

          <Pressable
            style={styles.profileButton}
            onPress={() =>
              navigation.navigate(
                'Configuracoes',
              )
            }>

            <Text style={styles.profileIcon}>
              👤
            </Text>

          </Pressable>

        </View>

        {/* Progresso */}
        <View style={styles.progressCard}>

          <Text style={styles.progressLabel}>
            Progresso de hoje
          </Text>

          <Text style={styles.progressValue}>
            {doneTasks.length}

            <Text style={styles.progressTotal}>
              /{tasks.length}
            </Text>
          </Text>

          <Text style={styles.progressSubtitle}>
            tarefas concluídas
          </Text>

          <View style={styles.progressBackground}>

            <View
              style={[
                styles.progressBar,
                {
                  width: `${progress}%`,
                },
              ]}
            />

          </View>

          <Text style={styles.progressPercent}>
            {progress}%
          </Text>

        </View>

        {/* Estatísticas */}
        <View style={styles.statsContainer}>

          <StatCard
            value={urgentTasks.length}
            label="Urgentes"
            emoji="🔴"
            background="#FFF1F3"
            color="#F43F5E"
          />

          <StatCard
            value={pendingTasks.length}
            label="Pendentes"
            emoji="📋"
            background="#F3F2FF"
            color="#5C4DFF"
          />

          <StatCard
            value={doneTasks.length}
            label="Concluídas"
            emoji="✅"
            background="#F0FDF4"
            color="#22C55E"
          />

        </View>

        {/* Projetos */}
        <View style={styles.sectionHeader}>

          <Text style={styles.sectionTitle}>
            Projetos Ativos
          </Text>

          <Pressable
            onPress={() =>
              navigation.navigate(
                'Projetos',
              )
            }>

            <Text style={styles.seeAll}>
              Ver todos →
            </Text>

          </Pressable>

        </View>

        <ProjectCard
          emoji="💻"
          name="Desenvolvimento"
          completed={7}
          total={15}
          color="#5C4DFF"
        />

        <ProjectCard
          emoji="📣"
          name="Marketing"
          completed={3}
          total={8}
          color="#F43F5E"
        />

        <ProjectCard
          emoji="📦"
          name="Produto"
          completed={2}
          total={6}
          color="#FBBF24"
        />

        {/* Tarefas pendentes */}
        <Text style={styles.sectionTitle}>
          Para fazer
        </Text>

        {loading && (
          <Text style={styles.emptyStateText} accessibilityRole="progressbar">
            Carregando tarefas…
          </Text>
        )}

        {readError && (
          <Text style={styles.emptyStateText} accessibilityRole="alert">
            {readError} {tasks.length > 0 ? 'As tarefas disponíveis foram mantidas.' : ''}
          </Text>
        )}

        {!loading && !readError && pendingTasks.length === 0 && (
          <View style={styles.emptyState}>

            <Text style={styles.emptyStateIcon}>
              🎉
            </Text>

            <Text style={styles.emptyStateTitle}>
              Tudo em dia!
            </Text>

            <Text style={styles.emptyStateText}>
              Você não possui tarefas pendentes.
            </Text>

          </View>
        )}

        {pendingTasks.map(task => (

          <TaskCard
            key={task.id}
            task={task}
            onToggle={toggleTask}
            onPress={() =>
              navigation.navigate(
                'DetalheTarefa',
                {
                  taskId: task.id,
                },
              )
            }
          />

        ))}

        {/* Tarefas concluídas */}
        {doneTasks.length > 0 && (
          <>

            <Text style={styles.completedTitle}>
              Concluídas
            </Text>

            {doneTasks.map(task => (

              <TaskCard
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onPress={() =>
                  navigation.navigate(
                    'DetalheTarefa',
                    {
                      taskId: task.id,
                    },
                  )
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
  emoji,
  background,
  color,
}: {
  value: number;
  label: string;
  emoji: string;
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
      ]}>

      <Text style={styles.statEmoji}>
        {emoji}
      </Text>

      <Text
        style={[
          styles.statValue,
          {
            color,
          },
        ]}>
        {value}
      </Text>

      <Text
        style={[
          styles.statLabel,
          {
            color,
          },
        ]}>
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
  const percentage =
    Math.round(
      (completed / total) * 100,
    );

  return (
    <View style={styles.projectCard}>

      <Text style={styles.projectEmoji}>
        {emoji}
      </Text>

      <View style={styles.projectContent}>

        <View style={styles.projectHeader}>

          <Text style={styles.projectName}>
            {name}
          </Text>

          <Text
            style={[
              styles.projectPercent,
              {
                color,
              },
            ]}>
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
      style={[
        styles.taskCard,
        task.done &&
          styles.taskCardDone,
      ]}
      onPress={onPress}>

      {/* Faixa prioridade */}
      <View
        style={[
          styles.priorityStripe,
          {
            backgroundColor:
              task.done
                ? '#CBD5E1'
                : priorityColors[
                    task.priority
                  ],
          },
        ]}
      />

      {/* Checkbox */}
      <Pressable
        style={[
          styles.checkbox,
          task.done &&
            styles.checkboxDone,
        ]}
        onPress={() =>
          onToggle(task.id)
        }>

        {task.done && (
          <Text style={styles.checkmark}>
            ✓
          </Text>
        )}

      </Pressable>

      {/* Conteúdo */}
      <View style={styles.taskContent}>

        <Text
          style={[
            styles.taskTitle,
            task.done &&
              styles.taskTitleDone,
          ]}>
          {task.title}
        </Text>

        <View style={styles.taskMetadata}>

          <Text style={styles.taskProject}>
            {task.project}
          </Text>

          {task.time && (
            <Text style={styles.taskTime}>
              🕒 {task.time}
            </Text>
          )}

        </View>

      </View>

    </Pressable>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 14,
  },

  date: {
    color: '#5C4DFF',
    fontSize: 12,
    marginBottom: 4,
  },

  greeting: {
    color: '#1E1B3A',
    fontSize: 25,
    fontWeight: '700',
  },

  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#5C4DFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileIcon: {
    fontSize: 19,
  },

  progressCard: {
    backgroundColor: '#6857FF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
  },

  progressLabel: {
    color: '#D8D4FF',
    fontSize: 12,
  },

  progressValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },

  progressTotal: {
    color: '#D8D4FF',
    fontSize: 17,
  },

  progressSubtitle: {
    color: '#D8D4FF',
    marginBottom: 15,
  },

  progressBackground: {
    height: 6,
    borderRadius: 6,
    backgroundColor: '#8C7EFF',
  },

  progressBar: {
    height: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },

  progressPercent: {
    color: '#FFFFFF',
    alignSelf: 'flex-end',
    marginTop: 6,
    fontWeight: '600',
  },

  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },

  statCard: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 14,
  },

  statEmoji: {
    fontSize: 20,
  },

  statValue: {
    fontSize: 26,
    fontWeight: '700',
  },

  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    color: '#1E1B3A',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },

  seeAll: {
    color: '#5C4DFF',
    fontSize: 12,
    fontWeight: '600',
  },

  projectCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },

  projectEmoji: {
    fontSize: 20,
    marginRight: 12,
  },

  projectContent: {
    flex: 1,
  },

  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  projectName: {
    color: '#1E1B3A',
    fontWeight: '600',
  },

  projectPercent: {
    fontSize: 12,
    fontWeight: '700',
  },

  projectProgressBackground: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    marginTop: 7,
  },

  projectProgress: {
    height: 5,
    borderRadius: 5,
  },

  projectSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 5,
  },

  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },

  taskCardDone: {
    opacity: 0.6,
  },

  priorityStripe: {
    width: 4,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },

  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBC6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  checkboxDone: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },

  checkmark: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  taskContent: {
    flex: 1,
  },

  taskTitle: {
    color: '#1E1B3A',
    fontSize: 15,
    fontWeight: '600',
  },

  taskTitleDone: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },

  taskMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  taskProject: {
    backgroundColor: '#F8FAFC',
    color: '#94A3B8',
    fontSize: 11,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },

  taskTime: {
    color: '#94A3B8',
    fontSize: 11,
  },

  completedTitle: {
    color: '#94A3B8',
    fontSize: 17,
    fontWeight: '700',
    marginVertical: 12,
  },

  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
  },

  emptyStateIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  emptyStateTitle: {
    color: '#1E1B3A',
    fontSize: 16,
    fontWeight: '700',
  },

  emptyStateText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

});
