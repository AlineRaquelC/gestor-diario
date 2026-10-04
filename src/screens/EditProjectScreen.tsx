import React, {useState} from 'react';

import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  StatusBar,
} from 'react-native';

import {SafeAreaView} from 'react-native-safe-area-context';

import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import {useProjects} from '../context/ProjectContext';
import {useTasks} from '../context/TaskContext';

const COLORS = [
  '#5C4DFF',
  '#F43F5E',
  '#F59E0B',
  '#22C55E',
  '#06B6D4',
  '#8B5CF6',
  '#64748B',
];

const ICONS = [
  '📁',
  '🏠',
  '💼',
  '🎓',
  '💻',
  '📣',
  '📦',
  '💰',
  '👥',
  '📚',
  '🎯',
  '⭐',
  '❤️',
  '✈️',
  '🛒',
  '🏋️',
];

export default function EditProjectScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const {projectId} = route.params;

  const {
    projects,
    updateProject,
    deleteProject,
  } = useProjects();

  const {
    tasks,
    updateTaskLocal: updateTask,
  } = useTasks();

  const project =
    projects.find(
      item => item.id === projectId,
    );

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>
            Projeto não encontrado
          </Text>

          <Pressable
            style={styles.backProjectsButton}
            onPress={() =>
              navigation.navigate('Projetos')
            }>
            <Text style={styles.backProjectsText}>
              Voltar para Projetos
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const originalProjectName =
    project.name;

  const [name, setName] =
    useState(project.name);

  const [description, setDescription] =
    useState(
      project.description ?? '',
    );

  const [color, setColor] =
    useState(project.color);

  const [icon, setIcon] =
    useState(project.icon ?? '📁');

  const [dirty, setDirty] =
    useState(false);

  const canSave =
    name.trim().length > 0;

  function markDirty() {
    setDirty(true);
  }

  function handleSave() {
    if (!canSave) {
      return;
    }

    const newName =
      name.trim();

    if (
      newName !==
      originalProjectName
    ) {
      tasks
        .filter(
          task =>
            task.project ===
            originalProjectName,
        )
        .forEach(task => {
          updateTask(
            task.id,
            {
              project: newName,
            },
          );
        });
    }

    updateProject(
      projectId,
      {
        name: newName,
        description:
          description.trim(),
        color,
        icon,
      },
    );

    setDirty(false);

    Alert.alert(
      'Projeto atualizado',
      'As alterações foram salvas com sucesso.',
      [
        {
          text: 'OK',
          onPress: () =>
            navigation.goBack(),
        },
      ],
    );
  }

  function handleDelete() {
    const linkedTasks =
      tasks.filter(
        task =>
          task.project ===
          originalProjectName,
      );

    Alert.alert(
      'Excluir projeto',
      linkedTasks.length > 0
        ? `Este projeto possui ${linkedTasks.length} tarefa(s). Elas serão movidas para "Geral". Deseja continuar?`
        : `Tem certeza que deseja excluir "${project.name}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',

          onPress: () => {
            linkedTasks.forEach(
              task => {
                updateTask(
                  task.id,
                  {
                    project: 'Geral',
                  },
                );
              },
            );

            deleteProject(
              projectId,
            );

            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'Projetos',
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
        backgroundColor="#F8F9FD"
      />

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
          Editar Projeto
        </Text>

        {dirty ? (
          <View style={styles.unsavedBadge}>
            <Text style={styles.unsavedText}>
              Não salvo
            </Text>
          </View>
        ) : (
          <View style={{width: 75}} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <View style={styles.field}>
          <Text style={styles.label}>
            Nome do projeto
            <Text style={styles.required}>
              {' '}*
            </Text>
          </Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={value => {
              setName(value);
              markDirty();
            }}
            placeholder="Nome do projeto"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Descrição
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.textArea,
            ]}
            value={description}
            onChangeText={value => {
              setDescription(value);
              markDirty();
            }}
            placeholder="Descreva o objetivo do projeto..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Ícone */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Ícone do projeto
          </Text>

          <View style={styles.iconGrid}>
            {ICONS.map(item => {
              const active =
                icon === item;

              return (
                <Pressable
                  key={item}
                  style={[
                    styles.iconOption,
                    active &&
                      styles.iconOptionActive,
                  ]}
                  onPress={() => {
                    setIcon(item);
                    markDirty();
                  }}>

                  <Text style={styles.iconEmoji}>
                    {item}
                  </Text>

                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Cor */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Cor do projeto
          </Text>

          <View style={styles.colorGrid}>
            {COLORS.map(item => {
              const active =
                color === item;

              return (
                <Pressable
                  key={item}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: item,
                    },
                    active &&
                      styles.colorOptionActive,
                  ]}
                  onPress={() => {
                    setColor(item);
                    markDirty();
                  }}>

                  {active && (
                    <Text style={styles.colorCheck}>
                      ✓
                    </Text>
                  )}

                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>
            PRÉ-VISUALIZAÇÃO
          </Text>

          <View style={styles.previewContent}>
            <View
              style={[
                styles.previewIcon,
                {
                  backgroundColor:
                    color + '22',
                },
              ]}>

              <Text style={styles.previewEmoji}>
                {icon}
              </Text>

            </View>

            <View style={styles.previewText}>
              <Text style={styles.previewName}>
                {name.trim()
                  ? name
                  : 'Nome do projeto'}
              </Text>

              <Text style={styles.previewDescription}>
                {description.trim()
                  ? description
                  : 'Sem descrição'}
              </Text>
            </View>
          </View>

          <View style={styles.previewProgressTrack}>
            <View
              style={[
                styles.previewProgress,
                {
                  width: '40%',
                  backgroundColor: color,
                },
              ]}
            />
          </View>
        </View>

        {/* Excluir */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerLabel}>
            ZONA DE PERIGO
          </Text>

          <Pressable
            style={styles.deleteProjectButton}
            onPress={handleDelete}>

            <View style={styles.deleteIconBox}>
              <Text>🗑</Text>
            </View>

            <View style={styles.deleteContent}>
              <Text style={styles.deleteTitle}>
                Excluir projeto
              </Text>

              <Text style={styles.deleteSubtitle}>
                Esta ação não pode ser desfeita
              </Text>
            </View>

            <Text style={styles.deleteArrow}>
              ›
            </Text>

          </Pressable>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.cancelButton}
          onPress={() =>
            navigation.goBack()
          }>
          <Text style={styles.cancelText}>
            Cancelar
          </Text>
        </Pressable>

        <Pressable
          disabled={!canSave}
          style={[
            styles.saveButton,
            !canSave &&
              styles.saveButtonDisabled,
          ]}
          onPress={handleSave}>

          <Text
            style={[
              styles.saveText,
              !canSave &&
                styles.saveTextDisabled,
            ]}>
            ✓ Salvar alterações
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F5',
  },

  backButton: {
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

  headerTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 19,
    fontWeight: '700',
    color: '#1E1B3A',
  },

  unsavedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  unsavedText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  field: {
    marginBottom: 22,
  },

  label: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
  },

  required: {
    color: '#F43F5E',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: '#1E1B3A',
    fontSize: 15,
  },

  textArea: {
    minHeight: 105,
  },

  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  iconOption: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconOptionActive: {
    borderColor: '#5C4DFF',
    backgroundColor: '#EEF0FF',
  },

  iconEmoji: {
    fontSize: 22,
  },

  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  colorOption: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  colorOptionActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 5,
  },

  colorCheck: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
    elevation: 2,
    marginBottom: 22,
  },

  previewLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 14,
  },

  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  previewIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  previewEmoji: {
    fontSize: 21,
  },

  previewText: {
    flex: 1,
  },

  previewName: {
    color: '#1E1B3A',
    fontSize: 16,
    fontWeight: '700',
  },

  previewDescription: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 3,
  },

  previewProgressTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    marginTop: 16,
    overflow: 'hidden',
  },

  previewProgress: {
    height: 5,
    borderRadius: 5,
  },

  dangerZone: {
    backgroundColor: '#FFF5F6',
    borderRadius: 17,
    padding: 15,
    borderWidth: 1.5,
    borderColor: '#FFD0D8',
  },

  dangerLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 11,
  },

  deleteProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  deleteIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#FFE4E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  deleteContent: {
    flex: 1,
  },

  deleteTitle: {
    color: '#F43F5E',
    fontSize: 14,
    fontWeight: '700',
  },

  deleteSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },

  deleteArrow: {
    color: '#F43F5E',
    fontSize: 24,
  },

  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#EEF0F5',
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },

  cancelText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },

  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#5C4DFF',
  },

  saveButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  saveTextDisabled: {
    color: '#94A3B8',
  },

  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  notFoundTitle: {
    color: '#1E1B3A',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },

  backProjectsButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#5C4DFF',
  },

  backProjectsText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
