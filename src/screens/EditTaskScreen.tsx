import React, { useState, useRef } from 'react';

import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation, useRoute } from '@react-navigation/native';

import DateTimePicker from '@react-native-community/datetimepicker';

import {
  useTasks,
  Priority,
  TaskStatus,
  Subtask,
  Task,
} from '../context/TaskContext';

import { useProjects } from '../context/ProjectContext';

import { calendarDate } from '../services/taskService';

import { useTaskDeletion } from '../hooks/useTaskDeletion';

import { COLORS, RADIUS, SPACING } from '../styles/theme';
import { taskFormStyles } from '../styles/taskFormStyles';
import TaskProjectSelector from '../components/TaskProjectSelector';

const PRIORITIES = [
  {
    value: 'low' as Priority,
    label: 'Baixa',
    color: COLORS.textSecondary,
    background: COLORS.surfaceSecondary,
  },
  {
    value: 'medium' as Priority,
    label: 'Média',
    color: COLORS.warning,
    background: COLORS.warningSoft,
  },
  {
    value: 'high' as Priority,
    label: 'Alta',
    color: COLORS.danger,
    background: COLORS.dangerSoft,
  },
];

const STATUSES = [
  {
    value: 'todo' as TaskStatus,
    label: 'A fazer',
    color: COLORS.textSecondary,
    background: COLORS.surfaceSecondary,
  },
  {
    value: 'in_progress' as TaskStatus,
    label: 'Em andamento',
    color: COLORS.primary,
    background: COLORS.primarySoft,
  },
  {
    value: 'completed' as TaskStatus,
    label: 'Concluída',
    color: COLORS.success,
    background: COLORS.successSoft,
  },
];

export default function EditTaskScreen() {
  const navigation = useNavigation<any>();

  const route = useRoute<any>();

  const { taskId } = route.params;

  const {
    tasks,
    updateTask,
    addSubtask: createChild,
    toggleSubtask: toggleChild,
    removeSubtask: removeChild,
  } = useTasks();

  const { projects } = useProjects();

  const confirmDelete = useTaskDeletion(taskId, () => {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  });

  const task = tasks.find(item => item.id === taskId);

  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [subtaskSaving, setSubtaskSaving] = useState<string | null>(null);
  const subtaskRequest = useRef(false);

  const originalStartDate = task?.startDate;
  const linkedProject = projects.find(
    item => item.id === task?.projectId || item.remoteId === task?.projectId,
  );
  // Retain a real remote relationship even before general project sync (#12).
  const projectOptions =
    task?.projectId && !linkedProject
      ? [
          ...projects,
          {
            id: task.projectId,
            remoteId: task.projectId,
            name: task.project,
            color: COLORS.primary,
            icon: '',
          },
        ]
      : projects;
  const [title, setTitle] = useState(task?.title ?? '');

  const [description, setDescription] = useState(task?.description ?? '');

  const [startDate, setStartDate] = useState(
    task?.startDate ? new Date(task.startDate) : new Date(),
  );

  const [dueDate, setDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate) : new Date(),
  );

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  const [time, setTime] = useState(task?.time ?? '');

  const [priority, setPriority] = useState<Priority>(
    task?.priority ?? 'medium',
  );

  const [project, setProject] = useState(
    linkedProject?.id ?? task?.projectId ?? '',
  );

  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');

  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks ?? []);

  const [addingSubtask, setAddingSubtask] = useState(false);

  const [newSubtask, setNewSubtask] = useState('');

  const [dirty, setDirty] = useState(false);

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Tarefa não encontrada</Text>

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

  function formatDateBR(date: Date) {
    return date.toLocaleDateString('pt-BR');
  }

  function markDirty() {
    setDirty(true);
  }

  async function mutateSubtask(
    key: string,
    request: () => Promise<{ task: Task; cacheSaved: boolean }>,
  ) {
    if (subtaskRequest.current || submitting.current) {
      return;
    }
    subtaskRequest.current = true;
    setSubtaskSaving(key);
    try {
      const result = await request();
      setSubtasks(result.task.subtasks ?? []);
      setStatus(result.task.status);
      if (!result.cacheSaved) {
        Alert.alert(
          'Subtarefa salva no servidor',
          'Não foi possível atualizar o cache local.',
        );
      }
      return true;
    } catch (error) {
      Alert.alert(
        'Não foi possível alterar a subtarefa',
        error instanceof Error
          ? error.message
          : 'Verifique a conexão e tente novamente.',
      );
      return false;
    } finally {
      subtaskRequest.current = false;
      setSubtaskSaving(null);
    }
  }
  const toggleSubtask = (id: string) =>
    mutateSubtask(id, () => toggleChild(taskId, id));
  const removeSubtask = (id: string) =>
    mutateSubtask(id, () => removeChild(taskId, id));
  async function handleAddSubtask() {
    if (!newSubtask.trim()) {
      return;
    }
    if (
      await mutateSubtask('new', () => createChild(taskId, newSubtask.trim()))
    ) {
      setNewSubtask('');
      setAddingSubtask(false);
    }
  }

  async function saveChanges() {
    if (submitting.current || subtaskRequest.current) {
      return;
    }
    if (!title.trim()) {
      Alert.alert('Título obrigatório', 'Informe um título para a tarefa.');
      return;
    }
    const selectedProject = projectOptions.find(item => item.id === project);
    if (!selectedProject) {
      Alert.alert('Projeto obrigatório', 'Selecione um projeto ou categoria.');
      return;
    }
    const startDay = calendarDate(startDate.toISOString());
    const dueDay = calendarDate(dueDate.toISOString());
    if (
      startDay !==
        (originalStartDate ? calendarDate(originalStartDate) : undefined) &&
      startDay < calendarDate(new Date().toISOString())
    ) {
      Alert.alert(
        'Data de início inválida',
        'Uma nova data de início não pode ser anterior à data atual.',
      );
      return;
    }
    if (dueDay < startDay) {
      Alert.alert(
        'Prazo inválido',
        'O prazo não pode ser anterior à data de início.',
      );
      return;
    }
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      Alert.alert('Horário inválido', 'Informe o horário no formato HH:mm.');
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const result = await updateTask(taskId, {
        title: title.trim(),
        description: description.trim(),
        projectId: selectedProject.id,
        time,
        priority,
        status,
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
      });
      setDirty(false);
      Alert.alert(
        'Alterações salvas',
        result.cacheSaved
          ? 'A tarefa foi atualizada com sucesso.'
          : 'As alterações foram salvas no servidor, mas o cache local falhou. Não envie novamente.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar',
        error instanceof Error
          ? error.message
          : 'Verifique a conexão e tente novamente.',
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Editar Tarefa</Text>

          {dirty ? (
            <View style={styles.unsavedBadge}>
              <Text style={styles.unsavedText}>Não salvo</Text>
            </View>
          ) : (
            <View
              style={{
                width: 75,
              }}
            />
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Título */}
          <Field label="Título" required>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={value => {
                setTitle(value);
                markDirty();
              }}
              accessibilityLabel="Título"
              placeholder="Nome da tarefa..."
              placeholderTextColor={COLORS.textSecondary}
            />
          </Field>

          {/* Descrição */}
          <Field label="Descrição">
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={value => {
                setDescription(value);

                markDirty();
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Descrição"
              placeholder="Adicione detalhes..."
              placeholderTextColor={COLORS.textSecondary}
            />
          </Field>

          {/* Datas */}
          <Field label="Datas">
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.subLabel}>Início</Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Selecionar data de início"
                  style={styles.input}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={styles.dateText}>{formatDateBR(startDate)}</Text>
                </Pressable>
              </View>

              <View style={styles.flex}>
                <Text style={styles.subLabel}>Prazo</Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Selecionar prazo"
                  style={[styles.input, styles.accentInput]}
                  onPress={() => setShowDueDatePicker(true)}
                >
                  <Text style={styles.dateText}>{formatDateBR(dueDate)}</Text>
                </Pressable>
              </View>
            </View>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);

                  if (selectedDate) {
                    setStartDate(selectedDate);

                    if (selectedDate > dueDate) {
                      setDueDate(selectedDate);
                    }

                    markDirty();
                  }
                }}
              />
            )}

            {showDueDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display="default"
                minimumDate={startDate}
                onChange={(event, selectedDate) => {
                  setShowDueDatePicker(false);

                  if (selectedDate) {
                    setDueDate(selectedDate);

                    markDirty();
                  }
                }}
              />
            )}
          </Field>

          {/* Horário */}
          <Field label="Horário">
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={value => {
                setTime(value);
                markDirty();
              }}
              accessibilityLabel="Horário"
              placeholder="18:00"
              placeholderTextColor={COLORS.textSecondary}
            />
          </Field>

          {/* Prioridade */}
          <Field label="Prioridade">
            <View style={styles.row}>
              {PRIORITIES.map(item => {
                const active = priority === item.value;

                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.optionCard,

                      active && {
                        borderColor: item.color,

                        backgroundColor: item.background,
                      },
                    ]}
                    onPress={() => {
                      setPriority(item.value);

                      markDirty();
                    }}
                  >
                    <Text
                      style={[
                        styles.optionLabel,

                        active && {
                          color: item.color,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          {/* PROJETOS REAIS */}
          <Field label="Projeto / Categoria">
            {projectOptions.length === 0 ? (
              <View style={styles.noProjectsCard}>
                <Text style={styles.noProjectsText}>
                  Nenhum projeto cadastrado.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('CriarProjeto')}
                >
                  <Text style={styles.createProjectLink}>+ Criar projeto</Text>
                </Pressable>
              </View>
            ) : (
              <TaskProjectSelector
                projects={projectOptions}
                selectedId={project}
                onSelect={id => {
                  setProject(id);
                  markDirty();
                }}
              />
            )}
          </Field>

          {/* Status */}
          <Field label="Status">
            <View style={styles.statusWrap}>
              {STATUSES.map(item => {
                const active = status === item.value;

                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.statusButton,

                      active && {
                        borderColor: item.color,

                        backgroundColor: item.background,
                      },
                    ]}
                    onPress={() => {
                      setStatus(item.value);

                      markDirty();
                    }}
                  >
                    <Text
                      style={[
                        styles.statusText,

                        active && {
                          color: item.color,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          {/* Subtarefas */}
          <Field label="Subtarefas">
            <View style={styles.subtasksCard}>
              {subtasks.map((subtask, index) => (
                <View
                  key={subtask.id}
                  style={[
                    styles.subtaskRow,

                    index < subtasks.length - 1 && styles.subtaskBorder,
                  ]}
                >
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Concluir subtarefa: ${subtask.title}`}
                    accessibilityState={{
                      checked: subtask.done,
                      disabled: subtaskSaving === subtask.id || saving,
                    }}
                    hitSlop={10}
                    disabled={subtaskSaving === subtask.id || saving}
                    style={[
                      styles.checkbox,
                      subtask.done && styles.checkboxDone,
                    ]}
                    onPress={() => toggleSubtask(subtask.id)}
                  >
                    {subtask.done && <Text style={styles.checkboxText}>✓</Text>}
                  </Pressable>

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
                      styles.subtaskStatus,

                      subtask.done && styles.subtaskStatusDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.subtaskStatusText,

                        subtask.done && styles.subtaskStatusTextDone,
                      ]}
                    >
                      {subtask.done ? 'Feita' : 'Pendente'}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    disabled={subtaskSaving === subtask.id || saving}
                    onPress={() => removeSubtask(subtask.id)}
                  >
                    <Text style={styles.remove}>✕</Text>
                  </Pressable>
                </View>
              ))}

              {addingSubtask ? (
                <View style={styles.subtaskRow}>
                  <View style={styles.checkbox} />

                  <TextInput
                    style={styles.inlineInput}
                    value={newSubtask}
                    onChangeText={setNewSubtask}
                    accessibilityLabel="Nome da subtarefa"
                    placeholder="Nome da subtarefa..."
                    placeholderTextColor={COLORS.textSecondary}
                    autoFocus
                    onSubmitEditing={handleAddSubtask}
                  />

                  <Pressable
                    accessibilityRole="button"
                    disabled={subtaskSaving !== null || saving}
                    style={styles.confirmSmall}
                    onPress={handleAddSubtask}
                  >
                    <Text style={styles.confirmSmallText}>✓</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setAddingSubtask(false);

                      setNewSubtask('');
                    }}
                  >
                    <Text style={styles.remove}>✕</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  style={styles.addSubtask}
                  onPress={() => setAddingSubtask(true)}
                >
                  <Text style={styles.addIcon}>＋</Text>

                  <Text style={styles.addText}>Adicionar subtarefa</Text>
                </Pressable>
              )}
            </View>
          </Field>

          {/* Excluir */}
          <View style={styles.dangerZone}>
            <Text style={styles.dangerLabel}>ZONA DE PERIGO</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Excluir tarefa"
              style={styles.dangerButton}
              onPress={confirmDelete}
            >
              <View style={styles.flex}>
                <Text style={styles.deleteTitle}>Excluir tarefa</Text>

                <Text style={styles.deleteSubtitle}>
                  Você poderá desfazer por 5 segundos
                </Text>
              </View>

              <Text style={styles.deleteArrow}>›</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Rodapé */}
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
            accessibilityState={{ disabled: saving || subtaskSaving !== null }}
            style={[
              styles.saveButton,
              (saving || subtaskSaving !== null) && styles.disabled,
            ]}
            disabled={saving || subtaskSaving !== null}
            onPress={saveChanges}
          >
            <Text style={styles.saveText}>
              {saving ? 'Salvando…' : '✓ Salvar alterações'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}

        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  unsavedBadge: {
    backgroundColor: COLORS.warningSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  unsavedText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '700',
  },
  required: {
    color: COLORS.danger,
  },
  noProjectsText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  createProjectLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  subtaskBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceSecondary,
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
  subtaskStatus: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 8,
  },
  subtaskStatusDone: {
    backgroundColor: COLORS.successSoft,
  },
  subtaskStatusText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  subtaskStatusTextDone: {
    color: COLORS.success,
  },
  confirmSmallText: {
    color: COLORS.surface,
    fontWeight: '700',
  },
  deleteArrow: {
    color: COLORS.danger,
    fontSize: 24,
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
  ...taskFormStyles,
  optionLabel: taskFormStyles.optionText,
  saveButton: taskFormStyles.primaryButton,
  saveText: taskFormStyles.primaryText,
  addSubtask: taskFormStyles.addRow,
  subtasksCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  noProjectsCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  dangerZone: {
    borderWidth: 1,
    borderColor: COLORS.dangerSoft,
    backgroundColor: COLORS.dangerSoft,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  dangerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: SPACING.sm,
  },
  dangerButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  deleteTitle: { fontSize: 14, fontWeight: '600', color: COLORS.danger },
  deleteSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  disabled: { opacity: 0.5 },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  remove: { fontSize: 16, color: COLORS.textSecondary, padding: SPACING.md },
  inlineInput: {
    flex: 1,
    minHeight: 44,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
});
