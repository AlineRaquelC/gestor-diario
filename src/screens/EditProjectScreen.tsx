import React, { useState } from 'react';

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

import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation, useRoute } from '@react-navigation/native';

import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';

import { COLORS, RADIUS, SPACING } from '../styles/theme';
import { taskFormStyles } from '../styles/taskFormStyles';

const PROJECT_COLORS = [
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

  const { projectId } = route.params;

  const { projects, updateProject, deleteProject } = useProjects();

  const { tasks, updateTaskLocal: updateTask } = useTasks();

  const project = projects.find(item => item.id === projectId);

  const originalProjectName = project?.name ?? '';

  const [name, setName] = useState(project?.name ?? '');

  const [description, setDescription] = useState(project?.description ?? '');

  const [color, setColor] = useState(project?.color ?? '#5C4DFF');

  const [icon, setIcon] = useState(project?.icon ?? '📁');

  const [dirty, setDirty] = useState(false);

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Projeto não encontrado</Text>

          <Pressable
            style={styles.backProjectsButton}
            onPress={() => navigation.navigate('Projetos')}
          >
            <Text style={styles.backProjectsText}>Voltar para Projetos</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const canSave = name.trim().length > 0;

  function markDirty() {
    setDirty(true);
  }

  function handleSave() {
    if (!project) {
      return;
    }
    if (!canSave) {
      return;
    }

    const newName = name.trim();

    try {
      updateProject(projectId, {
        name: newName,
        description: description.trim(),
        color,
        icon,
      });
      if (newName !== originalProjectName) {
        tasks
          .filter(
            task =>
              task.projectId === projectId ||
              (!!project.remoteId && task.projectId === project.remoteId),
          )
          .forEach(task => {
            updateTask(task.id, {
              project: newName,
            });
          });
      }
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
      return;
    }

    setDirty(false);

    Alert.alert(
      'Projeto atualizado',
      'As alterações foram salvas com sucesso.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  }

  function handleDelete() {
    if (!project) {
      return;
    }
    Alert.alert(
      'Excluir projeto',
      `Excluir "${project.name}"? Projetos com tarefas não podem ser excluídos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProject(projectId);
              navigation.reset({ index: 0, routes: [{ name: 'Projetos' }] });
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

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Editar Projeto</Text>

        {dirty ? (
          <View style={styles.unsavedBadge}>
            <Text style={styles.unsavedText}>Não salvo</Text>
          </View>
        ) : (
          <View style={{ width: 75 }} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.label}>
            Nome do projeto
            <Text style={styles.required}> *</Text>
          </Text>

          <TextInput
            style={styles.input}
            accessibilityLabel="Nome do projeto"
            value={name}
            onChangeText={value => {
              setName(value);
              markDirty();
            }}
            placeholder="Nome do projeto"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Descrição</Text>

          <TextInput
            style={[styles.input, styles.textArea]}
            accessibilityLabel="Descrição"
            value={description}
            onChangeText={value => {
              setDescription(value);
              markDirty();
            }}
            placeholder="Descreva o objetivo do projeto..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Ícone */}
        <View style={styles.field}>
          <Text style={styles.label}>Ícone do projeto</Text>

          <View style={styles.iconGrid}>
            {ICONS.map(item => {
              const active = icon === item;

              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={`Ícone ${item}`}
                  accessibilityState={{ selected: active }}
                  style={[styles.iconOption, active && styles.iconOptionActive]}
                  onPress={() => {
                    setIcon(item);
                    markDirty();
                  }}
                >
                  <Text style={styles.iconEmoji}>{item}</Text>
                  {active && <Text style={styles.iconCheck}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Cor */}
        <View style={styles.field}>
          <Text style={styles.label}>Cor do projeto</Text>

          <View style={styles.colorGrid}>
            {PROJECT_COLORS.map(item => {
              const active = color === item;

              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={`Cor ${item}`}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: item,
                    },
                    active && styles.colorOptionActive,
                  ]}
                  onPress={() => {
                    setColor(item);
                    markDirty();
                  }}
                >
                  {active && <Text style={styles.colorCheck}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>PRÉ-VISUALIZAÇÃO</Text>

          <View style={styles.previewContent}>
            <View
              style={[
                styles.previewIcon,
                {
                  backgroundColor: color + '22',
                },
              ]}
            >
              <Text style={styles.previewEmoji}>{icon}</Text>
            </View>

            <View style={styles.previewText}>
              <Text style={styles.previewName}>
                {name.trim() ? name : 'Nome do projeto'}
              </Text>

              <Text style={styles.previewDescription}>
                {description.trim() ? description : 'Sem descrição'}
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
          <Text style={styles.dangerLabel}>ZONA DE PERIGO</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Excluir projeto"
            style={styles.deleteProjectButton}
            onPress={handleDelete}
          >
            <View style={styles.deleteContent}>
              <Text style={styles.deleteTitle}>Excluir projeto</Text>

              <Text style={styles.deleteSubtitle}>
                Esta ação não pode ser desfeita
              </Text>
            </View>

            <Text style={styles.deleteArrow}>›</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          disabled={!canSave}
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
        >
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
            ✓ Salvar alterações
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: taskFormStyles.container,

  scroll: {
    flex: 1,
  },

  header: taskFormStyles.header,

  backButton: taskFormStyles.backButton,

  backIcon: taskFormStyles.backIcon,

  headerTitle: taskFormStyles.headerTitle,

  unsavedBadge: {
    backgroundColor: COLORS.warningSoft,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },

  unsavedText: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '700',
  },

  content: taskFormStyles.content,

  field: taskFormStyles.field,

  label: taskFormStyles.label,

  required: {
    color: COLORS.danger,
  },

  input: taskFormStyles.input,

  textArea: taskFormStyles.textArea,

  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },

  iconOption: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconCheck: {
    position: 'absolute',
    top: 1,
    right: 2,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  iconOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },

  iconEmoji: {
    fontSize: 22,
  },

  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },

  colorOption: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  colorOptionActive: {
    borderWidth: 3,
    borderColor: COLORS.surface,
  },

  colorCheck: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: '700',
  },

  previewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },

  previewLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: SPACING.lg,
  },

  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },

  previewEmoji: {
    fontSize: 21,
  },

  previewText: {
    flex: 1,
  },

  previewName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },

  previewDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: SPACING.xs,
  },

  previewProgressTrack: {
    height: 5,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.lg,
    overflow: 'hidden',
  },

  previewProgress: {
    height: 5,
    borderRadius: RADIUS.sm,
  },

  dangerZone: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.dangerSoft,
  },

  dangerLabel: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },

  deleteProjectButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },

  deleteContent: {
    flex: 1,
  },

  deleteTitle: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
  },

  deleteSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: SPACING.xs,
  },

  deleteArrow: {
    color: COLORS.danger,
    fontSize: 24,
  },

  footer: taskFormStyles.footer,

  cancelButton: taskFormStyles.cancelButton,

  cancelText: taskFormStyles.cancelText,

  saveButton: taskFormStyles.primaryButton,

  saveButtonDisabled: {
    backgroundColor: COLORS.border,
  },

  saveText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
  },

  saveTextDisabled: {
    color: COLORS.textSecondary,
  },

  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },

  notFoundTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.lg,
  },

  backProjectsButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },

  backProjectsText: {
    color: COLORS.surface,
    fontWeight: '700',
  },
});
