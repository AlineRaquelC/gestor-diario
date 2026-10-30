import RecurrenceFrequencySelector from '../components/RecurrenceFrequencySelector';
import { deviceRecurrenceTimeZone } from '../models/recurrence';
import type { RecurrenceFrequency } from '../models/recurrence';
import { newRecurrenceRequestId } from '../services/recurrenceService';
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
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTasks, Priority, TaskStatus } from '../context/TaskContext';

import { useProjects } from '../context/ProjectContext';

import { COLORS, RADIUS, SPACING } from '../styles/theme';
import { taskFormStyles } from '../styles/taskFormStyles';
import TaskReminderSelector from '../components/TaskReminderSelector';
import { deviceReminderTimeZone, ReminderInput } from '../models/reminder';
import { validateReminderChange } from '../domain/reminders';
import { calendarDate } from '../services/taskService';
import { taskSavedFeedback } from '../models/reminderPresentation';
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
];

export default function NewTaskScreen() {
  const navigation = useNavigation<any>();

  const { addTask } = useTasks();

  const { projects } = useProjects();

  /*
   * Data de hoje zerada para meia-noite.
   * Usamos isso para impedir datas anteriores
   * sem o horário atual interferir na comparação.
   */
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const defaultProject =
    projects.find(item => item.name === 'Geral')?.id ?? projects[0]?.id ?? '';

  const [title, setTitle] = useState('');

  const [description, setDescription] = useState('');

  const [startDate, setStartDate] = useState(new Date());

  const [dueDate, setDueDate] = useState(new Date());

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;
  });

  const [priority, setPriority] = useState<Priority>('medium');

  const [project, setProject] = useState(defaultProject);

  const [status, setStatus] = useState<TaskStatus>('todo');

  const [subtasks, setSubtasks] = useState<string[]>([]);

  const [newSubtask, setNewSubtask] = useState('');

  const [addingSubtask, setAddingSubtask] = useState(false);

  const [reminders, setReminders] = useState<ReminderInput[]>([]);
  const [reminderTimeZone, setReminderTimeZone] = useState<string | null>(null);

  const [frequency, setFrequency] = useState<RecurrenceFrequency>('NONE');
  const [recurrenceZone, setRecurrenceZone] = useState<string | null>(null);
  const recurrenceRequest = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const canSubmit = title.trim().length > 0 && project.trim().length > 0;

  function formatDateBR(date: Date) {
    return date.toLocaleDateString('pt-BR');
  }

  function normalizeDate(date: Date) {
    const normalized = new Date(date);

    normalized.setHours(0, 0, 0, 0);

    return normalized;
  }

  function handleAddSubtask() {
    if (!newSubtask.trim()) {
      return;
    }

    setSubtasks(current => [...current, newSubtask.trim()]);

    setNewSubtask('');
    setAddingSubtask(false);
  }

  function removeSubtask(index: number) {
    setSubtasks(current => current.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (submitting.current) {
      return;
    }
    if (!title.trim()) {
      Alert.alert('Título obrigatório', 'Informe um título para a tarefa.');

      return;
    }

    if (!project.trim()) {
      Alert.alert('Projeto obrigatório', 'Selecione um projeto ou categoria.');

      return;
    }

    const normalizedStart = normalizeDate(startDate);

    const normalizedDue = normalizeDate(dueDate);

    /*
     * Regra 1:
     * a nova tarefa não pode começar
     * em uma data anterior a hoje.
     */
    if (normalizedStart < today) {
      Alert.alert(
        'Data inválida',
        'A data de início não pode ser anterior à data atual.',
      );

      return;
    }

    /*
     * Regra 2:
     * o prazo não pode ser anterior
     * à data de início.
     */
    if (normalizedDue < normalizedStart) {
      Alert.alert(
        'Prazo inválido',
        'O prazo não pode ser anterior à data de início.',
      );

      return;
    }

    const selectedProject = projects.find(item => item.id === project);
    if (!selectedProject) {
      Alert.alert('Projeto obrigatório', 'Selecione um projeto válido.');
      return;
    }
    let zone = reminderTimeZone;
    try {
      if (reminders.length) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
          throw new Error(
            'Defina um horário válido para configurar lembretes.',
          );
        }
        zone = (frequency !== 'NONE' ? recurrenceZone : null) ?? zone ?? deviceReminderTimeZone();
        if (frequency === 'NONE') {validateReminderChange(
          {
            dueDate: calendarDate(dueDate.toISOString()),
            time,
            timeZone: zone,
            offsets: reminders.map(item => item.offsetMinutes),
          },
          undefined,
          Date.now,
        );}
      }
    } catch (error) {
      Alert.alert('Lembretes', (error as Error).message);
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const result = await addTask({
        title: title.trim(),

        description: description.trim(),

        project: selectedProject.name,
        projectId: selectedProject.id,

        time,

        priority,

        status,

        done: status === 'completed',

        startDate: startDate.toISOString(),

        dueDate: dueDate.toISOString(),

        subtasks: subtasks.map((item, index) => ({
          id: `${Date.now()}-${index}`,

          title: item,

          done: false,
        })),

        reminders,
        ...(frequency !== 'NONE' ? { recurrenceInput: { frequency, timeZone: recurrenceZone ?? deviceRecurrenceTimeZone() }, recurrenceRequestId: recurrenceRequest.current ?? (recurrenceRequest.current = newRecurrenceRequestId()) } : {}),
        ...(reminders.length ? { reminderTimeZone: zone } : {}),
      });

      Alert.alert(
        'Tarefa criada',
        taskSavedFeedback(false, result.cacheSaved, result.scheduling, frequency !== 'NONE'),
        [
          {
            text: 'OK',

            onPress: () => navigation.navigate('Home'),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível criar a tarefa',
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
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Nova Tarefa</Text>

          {title.length > 0 ? (
            <View style={styles.draftBadge}>
              <Text style={styles.draftText}>Rascunho</Text>
            </View>
          ) : (
            <View
              style={{
                width: 70,
              }}
            />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* TÍTULO */}
          <FormGroup label="Título" required>
            <TextInput
              style={styles.input}
              accessibilityLabel="Título"
              placeholder="Nome da tarefa..."
              placeholderTextColor={COLORS.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </FormGroup>

          {/* DESCRIÇÃO */}
          <FormGroup label="Descrição">
            <TextInput
              style={[styles.input, styles.textArea]}
              accessibilityLabel="Descrição"
              placeholder="Adicione detalhes, contexto ou observações..."
              placeholderTextColor={COLORS.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </FormGroup>

          {/* DATAS */}
          <FormGroup label="Datas">
            <View style={styles.row}>
              {/* INÍCIO */}
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

              {/* PRAZO */}
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

            {/* CALENDÁRIO — INÍCIO */}
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                /*
                 * Não permite selecionar
                 * datas anteriores a hoje.
                 */
                minimumDate={today}
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);

                  if (selectedDate) {
                    setStartDate(selectedDate);

                    /*
                     * Se a nova data inicial
                     * ultrapassar o prazo,
                     * atualiza automaticamente
                     * o prazo.
                     */
                    if (normalizeDate(selectedDate) > normalizeDate(dueDate)) {
                      setDueDate(selectedDate);
                    }
                  }
                }}
              />
            )}

            {/* CALENDÁRIO — PRAZO */}
            {showDueDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display="default"
                /*
                 * Prazo só pode ser igual
                 * ou posterior ao início.
                 */
                minimumDate={startDate}
                onChange={(event, selectedDate) => {
                  setShowDueDatePicker(false);

                  if (selectedDate) {
                    setDueDate(selectedDate);
                  }
                }}
              />
            )}
          </FormGroup>

          {/* HORÁRIO */}
          <FormGroup label="Horário">
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              accessibilityLabel="Horário"
              placeholder="10:00"
              placeholderTextColor={COLORS.textSecondary}
            />
          </FormGroup>

          {/* PRIORIDADE */}
          <FormGroup label="Prioridade">
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
                        backgroundColor: item.background,

                        borderColor: item.color,
                      },
                    ]}
                    onPress={() => setPriority(item.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,

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
          </FormGroup>

          {/* PROJETO */}
          <FormGroup label="Projeto / Categoria">
            {projects.length === 0 ? (
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
                projects={projects}
                selectedId={project}
                onSelect={setProject}
              />
            )}
          </FormGroup>

          <FormGroup label="Repetir">
            <RecurrenceFrequencySelector value={frequency} disabled={saving} onChange={value => {
              try {
                if (value !== 'NONE') {setRecurrenceZone(deviceRecurrenceTimeZone()); setStatus('todo');}
                setFrequency(value);
              } catch (error) {Alert.alert('Recorrência', (error as Error).message);}
            }} />
            {frequency !== 'NONE' && <Text style={styles.subLabel}>Fuso da série: {recurrenceZone}. A primeira ocorrência será criada como A fazer.</Text>}
          </FormGroup>
          {/* STATUS */}
          <FormGroup label="Status inicial">
            <View style={styles.statusWrap}>
              {STATUSES.map(item => {
                const active = status === item.value;

                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: active, disabled: frequency !== 'NONE' && item.value !== 'todo' }}
                    style={[
                      styles.statusButton,

                      active && {
                        borderColor: item.color,

                        backgroundColor: item.background,
                      },
                    ]}
                    disabled={frequency !== 'NONE' && item.value !== 'todo'}
                    onPress={() => setStatus(item.value)}
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
          </FormGroup>

          {/* SUBTAREFAS */}
          <FormGroup label="Subtarefas">
            <View style={styles.sectionCard}>
              {subtasks.map((subtask, index) => (
                <View key={`${subtask}-${index}`} style={styles.listRow}>
                  <View style={styles.emptyCheck} />

                  <Text style={styles.listText}>{subtask}</Text>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => removeSubtask(index)}
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </Pressable>
                </View>
              ))}

              {addingSubtask ? (
                <View style={styles.listRow}>
                  <View style={styles.emptyCheck} />

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
                    style={styles.confirmSmall}
                    onPress={handleAddSubtask}
                  >
                    <Text style={styles.confirmSmallText}>✓</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  style={styles.addRow}
                  onPress={() => setAddingSubtask(true)}
                >
                  <Text style={styles.addIcon}>＋</Text>

                  <Text style={styles.addText}>Adicionar subtarefa</Text>
                </Pressable>
              )}
            </View>
          </FormGroup>

          {/* LEMBRETES */}
          <FormGroup label="Lembretes">
            <TaskReminderSelector
              value={reminders}
              timeZone={frequency !== 'NONE' ? recurrenceZone : reminderTimeZone}
              onChange={(items, zone) => {
                setReminders(items);
                setReminderTimeZone(zone);
              }}
            />
          </FormGroup>
        </ScrollView>

        {/* RODAPÉ */}
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit || saving }}
            disabled={!canSubmit || saving}
            style={[
              styles.createButton,

              (!canSubmit || saving) && styles.createButtonDisabled,
            ]}
            onPress={handleSubmit}
          >
            <Text
              style={[
                styles.createButtonText,

                !canSubmit && styles.createButtonTextDisabled,
              ]}
            >
              {saving ? 'Salvando...' : 'Criar tarefa'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormGroup({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>
        {label}

        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  draftBadge: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  draftText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
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
  emptyCheck: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 6,
    marginRight: 10,
  },
  confirmSmallText: {
    color: COLORS.surface,
    fontWeight: '700',
  },
  listText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  reminderOption: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reminderDisabled: {
    backgroundColor: COLORS.surfaceSecondary,
    opacity: 0.5,
  },
  reminderOptionText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  reminderCheck: {
    color: COLORS.success,
    fontWeight: '700',
  },
  cancelReminder: {
    paddingVertical: 10,
  },
  cancelReminderText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  createButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  ...taskFormStyles,
  scrollContent: taskFormStyles.content,
  formGroup: taskFormStyles.field,
  cancelButtonText: taskFormStyles.cancelText,
  createButton: taskFormStyles.primaryButton,
  createButtonText: taskFormStyles.primaryText,
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  listRow: {
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
  removeText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    padding: SPACING.md,
  },
  inlineInput: {
    flex: 1,
    minHeight: 44,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
});
