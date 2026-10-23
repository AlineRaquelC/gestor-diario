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
import { useNavigation } from '@react-navigation/native';

import { useProjects } from '../context/ProjectContext';

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

export default function CreateProjectScreen() {
  const navigation = useNavigation<any>();
  const { addProject } = useProjects();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#5C4DFF');
  const [icon, setIcon] = useState('📁');

  const canSubmit = name.trim().length > 0;

  function handleCreate() {
    if (!canSubmit) {
      return;
    }

    try {
      addProject({
        id: Date.now().toString(),
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
      });
    } catch (error) {
      Alert.alert(
        'Não foi possível criar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
      return;
    }

    Alert.alert('Projeto criado', 'O projeto foi criado com sucesso.', [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
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

        <Text style={styles.headerTitle}>Novo Projeto</Text>

        <View style={{ width: 38 }} />
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
            onChangeText={setName}
            placeholder="Ex.: Faculdade"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Descrição</Text>

          <TextInput
            style={[styles.input, styles.textArea]}
            accessibilityLabel="Descrição"
            value={description}
            onChangeText={setDescription}
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
                  onPress={() => setIcon(item)}
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
                  onPress={() => setColor(item)}
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

            <View style={styles.previewTextArea}>
              <Text style={styles.previewName}>
                {name.trim() ? name : 'Nome do projeto'}
              </Text>

              <Text style={styles.previewDescription}>
                {description.trim() ? description : 'Descrição do projeto'}
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  backgroundColor: color,
                  width: '35%',
                },
              ]}
            />
          </View>
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
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          style={[
            styles.createButton,
            !canSubmit && styles.createButtonDisabled,
          ]}
          onPress={handleCreate}
        >
          <Text
            style={[styles.createText, !canSubmit && styles.createTextDisabled]}
          >
            Criar projeto
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
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },

  previewEmoji: {
    fontSize: 21,
  },

  previewTextArea: {
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

  progressTrack: {
    height: 5,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.lg,
    overflow: 'hidden',
  },

  progressBar: {
    height: 5,
    borderRadius: RADIUS.sm,
  },

  footer: taskFormStyles.footer,

  cancelButton: taskFormStyles.cancelButton,

  cancelText: taskFormStyles.cancelText,

  createButton: taskFormStyles.primaryButton,

  createButtonDisabled: {
    backgroundColor: COLORS.border,
  },

  createText: {
    color: COLORS.surface,
    fontSize: 15,
    fontWeight: '700',
  },

  createTextDisabled: {
    color: COLORS.textSecondary,
  },
});
