import React, {useState, useRef} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  useTasks,
  Priority,
  TaskStatus,
} from '../context/TaskContext';

import {
  useProjects,
} from '../context/ProjectContext';

const PRIORITIES = [
  {
    value: 'low' as Priority,
    label: 'Baixa',
    color: '#64748B',
    background: '#F1F5F9',
    icon: '▽',
  },
  {
    value: 'medium' as Priority,
    label: 'Média',
    color: '#D97706',
    background: '#FEF3C7',
    icon: '◈',
  },
  {
    value: 'high' as Priority,
    label: 'Alta',
    color: '#F43F5E',
    background: '#FFE4E9',
    icon: '▲',
  },
];

const STATUSES = [
  {
    value: 'todo' as TaskStatus,
    label: 'A fazer',
    color: '#64748B',
    background: '#F1F5F9',
  },
  {
    value: 'in_progress' as TaskStatus,
    label: 'Em andamento',
    color: '#5C4DFF',
    background: '#EEF0FF',
  },
  {
    value: 'review' as TaskStatus,
    label: 'Em revisão',
    color: '#D97706',
    background: '#FEF3C7',
  },
];

const REMINDER_OPTIONS = [
  '15 min antes',
  '30 min antes',
  '1 hora antes',
  'No horário',
  '1 dia antes',
];

export default function NewTaskScreen() {
  const navigation =
    useNavigation<any>();

  const {
    addTask,
  } = useTasks();

  const {
    projects,
  } = useProjects();

  /*
   * Data de hoje zerada para meia-noite.
   * Usamos isso para impedir datas anteriores
   * sem o horário atual interferir na comparação.
   */
  const today = new Date();
  today.setHours(
    0,
    0,
    0,
    0,
  );

  const defaultProject =
    projects.find(
      item =>
        item.name === 'Geral',
    )?.id ??
    projects[0]?.id ??
    '';

  const [title, setTitle] =
    useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [
    startDate,
    setStartDate,
  ] = useState(
    new Date(),
  );

  const [
    dueDate,
    setDueDate,
  ] = useState(
    new Date(),
  );

  const [
    showStartDatePicker,
    setShowStartDatePicker,
  ] = useState(false);

  const [
    showDueDatePicker,
    setShowDueDatePicker,
  ] = useState(false);

  const [
    time,
    setTime,
  ] = useState('10:00');

  const [
    priority,
    setPriority,
  ] = useState<Priority>(
    'medium',
  );

  const [
    project,
    setProject,
  ] = useState(
    defaultProject,
  );

  const [
    status,
    setStatus,
  ] = useState<TaskStatus>(
    'todo',
  );

  const [
    subtasks,
    setSubtasks,
  ] = useState<string[]>(
    [],
  );

  const [
    newSubtask,
    setNewSubtask,
  ] = useState('');

  const [
    addingSubtask,
    setAddingSubtask,
  ] = useState(false);

  const [
    reminders,
    setReminders,
  ] = useState<string[]>(
    [],
  );

  const [
    showReminderPicker,
    setShowReminderPicker,
  ] = useState(false);

  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const canSubmit =
    title.trim().length >
      0 &&
    project.trim().length >
      0;

  function formatDateBR(
    date: Date,
  ) {
    return date.toLocaleDateString(
      'pt-BR',
    );
  }

  function normalizeDate(
    date: Date,
  ) {
    const normalized =
      new Date(date);

    normalized.setHours(
      0,
      0,
      0,
      0,
    );

    return normalized;
  }

  function handleAddSubtask() {
    if (
      !newSubtask.trim()
    ) {
      return;
    }

    setSubtasks(current => [
      ...current,
      newSubtask.trim(),
    ]);

    setNewSubtask('');
    setAddingSubtask(false);
  }

  function removeSubtask(
    index: number,
  ) {
    setSubtasks(current =>
      current.filter(
        (_, i) =>
          i !== index,
      ),
    );
  }

  function handleAddReminder(
    option: string,
  ) {
    if (
      !reminders.includes(
        option,
      )
    ) {
      setReminders(current => [
        ...current,
        option,
      ]);
    }

    setShowReminderPicker(
      false,
    );
  }

  function removeReminder(
    index: number,
  ) {
    setReminders(current =>
      current.filter(
        (_, i) =>
          i !== index,
      ),
    );
  }

  async function handleSubmit() {
    if (submitting.current) {return;}
    if (
      !title.trim()
    ) {
      Alert.alert(
        'Título obrigatório',
        'Informe um título para a tarefa.',
      );

      return;
    }

    if (
      !project.trim()
    ) {
      Alert.alert(
        'Projeto obrigatório',
        'Selecione um projeto ou categoria.',
      );

      return;
    }

    const normalizedStart =
      normalizeDate(
        startDate,
      );

    const normalizedDue =
      normalizeDate(
        dueDate,
      );

    /*
     * Regra 1:
     * a nova tarefa não pode começar
     * em uma data anterior a hoje.
     */
    if (
      normalizedStart <
      today
    ) {
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
    if (
      normalizedDue <
      normalizedStart
    ) {
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
    submitting.current = true;
    setSaving(true);
    try {
      const result = await addTask({

        title:
          title.trim(),

        description:
          description.trim(),

        project: selectedProject.name,
        projectId: selectedProject.id,

        time,

        priority,

        status,

        done:
          status ===
          'completed',

        startDate:
          startDate.toISOString(),

        dueDate:
          dueDate.toISOString(),

        subtasks:
          subtasks.map(
            (
              item,
              index,
            ) => ({
              id:
                `${Date.now()}-${index}`,

              title:
                item,

              done:
                false,
            }),
          ),

        reminders,
      });

      Alert.alert(
        'Tarefa criada',
        result.cacheSaved
          ? 'A tarefa foi criada com sucesso.'
          : 'A tarefa foi salva no servidor, mas o cache local falhou. Não envie novamente.',
        [
          {
            text: 'OK',

            onPress: () =>
              navigation.navigate(
                'Home',
              ),
          },
        ],
      );
    } catch (error) {
      Alert.alert('Não foi possível criar a tarefa', error instanceof Error ? error.message : 'Verifique a conexão e tente novamente.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <SafeAreaView
      style={
        styles.container
      }
      edges={[
        'top',
        'bottom',
      ]}>

      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FAFAFA"
      />

      {/* CABEÇALHO */}
      <View
        style={
          styles.header
        }>

        <Pressable
          style={
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }>

          <Text
            style={
              styles.backIcon
            }>
            ‹
          </Text>

        </Pressable>

        <Text
          style={
            styles.headerTitle
          }>
          Nova Tarefa
        </Text>

        {title.length > 0 ? (
          <View
            style={
              styles.draftBadge
            }>

            <Text
              style={
                styles.draftText
              }>
              Rascunho
            </Text>

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
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }>

        {/* TÍTULO */}
        <FormGroup
          label="Título"
          required>

          <TextInput
            style={
              styles.input
            }
            placeholder="Nome da tarefa..."
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={
              setTitle
            }
          />

        </FormGroup>

        {/* DESCRIÇÃO */}
        <FormGroup
          label="Descrição">

          <TextInput
            style={[
              styles.input,
              styles.textArea,
            ]}
            placeholder="Adicione detalhes, contexto ou observações..."
            placeholderTextColor="#94A3B8"
            value={
              description
            }
            onChangeText={
              setDescription
            }
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

        </FormGroup>

        {/* DATAS */}
        <FormGroup
          label="Datas">

          <View
            style={
              styles.row
            }>

            {/* INÍCIO */}
            <View
              style={
                styles.flex
              }>

              <Text
                style={
                  styles.subLabel
                }>
                Início
              </Text>

              <Pressable
                style={
                  styles.input
                }
                onPress={() =>
                  setShowStartDatePicker(
                    true,
                  )
                }>

                <Text
                  style={
                    styles.dateText
                  }>
                  {formatDateBR(
                    startDate,
                  )}
                </Text>

              </Pressable>

            </View>

            {/* PRAZO */}
            <View
              style={
                styles.flex
              }>

              <Text
                style={
                  styles.subLabel
                }>
                Prazo
              </Text>

              <Pressable
                style={[
                  styles.input,
                  styles.accentInput,
                ]}
                onPress={() =>
                  setShowDueDatePicker(
                    true,
                  )
                }>

                <Text
                  style={
                    styles.dateText
                  }>
                  {formatDateBR(
                    dueDate,
                  )}
                </Text>

              </Pressable>

            </View>

          </View>

          {/* CALENDÁRIO — INÍCIO */}
          {showStartDatePicker && (
            <DateTimePicker
              value={
                startDate
              }
              mode="date"
              display="default"

              /*
               * Não permite selecionar
               * datas anteriores a hoje.
               */
              minimumDate={
                today
              }

              onChange={(
                event,
                selectedDate,
              ) => {
                setShowStartDatePicker(
                  false,
                );

                if (
                  selectedDate
                ) {
                  setStartDate(
                    selectedDate,
                  );

                  /*
                   * Se a nova data inicial
                   * ultrapassar o prazo,
                   * atualiza automaticamente
                   * o prazo.
                   */
                  if (
                    normalizeDate(
                      selectedDate,
                    ) >
                    normalizeDate(
                      dueDate,
                    )
                  ) {
                    setDueDate(
                      selectedDate,
                    );
                  }
                }
              }}
            />
          )}

          {/* CALENDÁRIO — PRAZO */}
          {showDueDatePicker && (
            <DateTimePicker
              value={
                dueDate
              }
              mode="date"
              display="default"

              /*
               * Prazo só pode ser igual
               * ou posterior ao início.
               */
              minimumDate={
                startDate
              }

              onChange={(
                event,
                selectedDate,
              ) => {
                setShowDueDatePicker(
                  false,
                );

                if (
                  selectedDate
                ) {
                  setDueDate(
                    selectedDate,
                  );
                }
              }}
            />
          )}

        </FormGroup>

        {/* HORÁRIO */}
        <FormGroup
          label="Horário">

          <TextInput
            style={
              styles.input
            }
            value={time}
            onChangeText={
              setTime
            }
            placeholder="10:00"
            placeholderTextColor="#94A3B8"
          />

        </FormGroup>

        {/* PRIORIDADE */}
        <FormGroup
          label="Prioridade">

          <View
            style={
              styles.row
            }>

            {PRIORITIES.map(
              item => {
                const active =
                  priority ===
                  item.value;

                return (
                  <Pressable
                    key={
                      item.value
                    }
                    style={[
                      styles.optionCard,

                      active && {
                        backgroundColor:
                          item.background,

                        borderColor:
                          item.color,
                      },
                    ]}
                    onPress={() =>
                      setPriority(
                        item.value,
                      )
                    }>

                    <Text
                      style={[
                        styles.optionIcon,
                        {
                          color:
                            item.color,
                        },
                      ]}>
                      {item.icon}
                    </Text>

                    <Text
                      style={[
                        styles.optionText,

                        active && {
                          color:
                            item.color,
                        },
                      ]}>
                      {item.label}
                    </Text>

                  </Pressable>
                );
              },
            )}

          </View>

        </FormGroup>

        {/* PROJETO */}
        <FormGroup
          label="Projeto / Categoria">

          {projects.length ===
          0 ? (

            <View
              style={
                styles.noProjectsCard
              }>

              <Text
                style={
                  styles.noProjectsText
                }>
                Nenhum projeto cadastrado.
              </Text>

              <Pressable
                onPress={() =>
                  navigation.navigate(
                    'CriarProjeto',
                  )
                }>

                <Text
                  style={
                    styles.createProjectLink
                  }>
                  + Criar projeto
                </Text>

              </Pressable>

            </View>

          ) : (

            <View
              style={
                styles.wrap
              }>

              {projects.map(
                item => {
                  const active =
                    project ===
                    item.id;

                  return (
                    <Pressable
                      key={
                        item.id
                      }
                      style={[
                        styles.projectButton,

                        active && {
                          borderColor:
                            item.color,

                          backgroundColor:
                            item.color +
                            '15',
                        },
                      ]}
                      onPress={() =>
                        setProject(
                          item.id,
                        )
                      }>

                      <Text
                        style={
                          styles.projectIcon
                        }>
                        {item.icon ??
                          '📁'}
                      </Text>

                      <Text
                        style={[
                          styles.projectText,

                          active && {
                            color:
                              item.color,
                          },
                        ]}>
                        {item.name}
                      </Text>

                    </Pressable>
                  );
                },
              )}

            </View>
          )}

        </FormGroup>

        {/* STATUS */}
        <FormGroup
          label="Status inicial">

          <View
            style={
              styles.row
            }>

            {STATUSES.map(
              item => {
                const active =
                  status ===
                  item.value;

                return (
                  <Pressable
                    key={
                      item.value
                    }
                    style={[
                      styles.statusButton,

                      active && {
                        borderColor:
                          item.color,

                        backgroundColor:
                          item.background,
                      },
                    ]}
                    onPress={() =>
                      setStatus(
                        item.value,
                      )
                    }>

                    <Text
                      style={[
                        styles.statusText,

                        active && {
                          color:
                            item.color,
                        },
                      ]}>
                      {item.label}
                    </Text>

                  </Pressable>
                );
              },
            )}

          </View>

        </FormGroup>

        {/* SUBTAREFAS */}
        <FormGroup
          label="Subtarefas">

          <View
            style={
              styles.sectionCard
            }>

            {subtasks.map(
              (
                subtask,
                index,
              ) => (

                <View
                  key={`${subtask}-${index}`}
                  style={
                    styles.listRow
                  }>

                  <View
                    style={
                      styles.emptyCheck
                    }
                  />

                  <Text
                    style={
                      styles.listText
                    }>
                    {subtask}
                  </Text>

                  <Pressable
                    onPress={() =>
                      removeSubtask(
                        index,
                      )
                    }>

                    <Text
                      style={
                        styles.removeText
                      }>
                      ✕
                    </Text>

                  </Pressable>

                </View>
              ),
            )}

            {addingSubtask ? (

              <View
                style={
                  styles.listRow
                }>

                <View
                  style={
                    styles.emptyCheck
                  }
                />

                <TextInput
                  style={
                    styles.inlineInput
                  }
                  value={
                    newSubtask
                  }
                  onChangeText={
                    setNewSubtask
                  }
                  placeholder="Nome da subtarefa..."
                  placeholderTextColor="#94A3B8"
                  autoFocus
                  onSubmitEditing={
                    handleAddSubtask
                  }
                />

                <Pressable
                  style={
                    styles.confirmSmall
                  }
                  onPress={
                    handleAddSubtask
                  }>

                  <Text
                    style={
                      styles.confirmSmallText
                    }>
                    ✓
                  </Text>

                </Pressable>

              </View>

            ) : (

              <Pressable
                style={
                  styles.addRow
                }
                onPress={() =>
                  setAddingSubtask(
                    true,
                  )
                }>

                <Text
                  style={
                    styles.addIcon
                  }>
                  ＋
                </Text>

                <Text
                  style={
                    styles.addText
                  }>
                  Adicionar subtarefa
                </Text>

              </Pressable>
            )}

          </View>

        </FormGroup>

        {/* LEMBRETES */}
        <FormGroup
          label="Lembretes">

          <View
            style={
              styles.sectionCard
            }>

            {reminders.map(
              (
                reminder,
                index,
              ) => (

                <View
                  key={`${reminder}-${index}`}
                  style={
                    styles.listRow
                  }>

                  <Text
                    style={
                      styles.reminderIcon
                    }>
                    🔔
                  </Text>

                  <Text
                    style={
                      styles.listText
                    }>
                    {reminder}
                  </Text>

                  <Pressable
                    onPress={() =>
                      removeReminder(
                        index,
                      )
                    }>

                    <Text
                      style={
                        styles.removeText
                      }>
                      ✕
                    </Text>

                  </Pressable>

                </View>
              ),
            )}

            {showReminderPicker ? (

              <View>

                {REMINDER_OPTIONS.map(
                  option => {
                    const disabled =
                      reminders.includes(
                        option,
                      );

                    return (
                      <Pressable
                        key={
                          option
                        }
                        disabled={
                          disabled
                        }
                        style={[
                          styles.reminderOption,

                          disabled &&
                            styles.reminderDisabled,
                        ]}
                        onPress={() =>
                          handleAddReminder(
                            option,
                          )
                        }>

                        <Text
                          style={
                            styles.reminderOptionText
                          }>
                          {option}
                        </Text>

                        {disabled && (
                          <Text
                            style={
                              styles.reminderCheck
                            }>
                            ✓
                          </Text>
                        )}

                      </Pressable>
                    );
                  },
                )}

                <Pressable
                  style={
                    styles.cancelReminder
                  }
                  onPress={() =>
                    setShowReminderPicker(
                      false,
                    )
                  }>

                  <Text
                    style={
                      styles.cancelReminderText
                    }>
                    Cancelar
                  </Text>

                </Pressable>

              </View>

            ) : (

              <Pressable
                style={
                  styles.addRow
                }
                onPress={() =>
                  setShowReminderPicker(
                    true,
                  )
                }>

                <Text
                  style={
                    styles.addIcon
                  }>
                  ＋
                </Text>

                <Text
                  style={
                    styles.addText
                  }>
                  Adicionar lembrete
                </Text>

              </Pressable>
            )}

          </View>

        </FormGroup>

      </ScrollView>

      {/* RODAPÉ */}
      <View
        style={
          styles.footer
        }>

        <Pressable
          style={
            styles.cancelButton
          }
          onPress={() =>
            navigation.goBack()
          }>

          <Text
            style={
              styles.cancelButtonText
            }>
            Cancelar
          </Text>

        </Pressable>

        <Pressable
          disabled={
            !canSubmit || saving
          }
          style={[
            styles.createButton,

            !canSubmit &&
              styles.createButtonDisabled,
          ]}
          onPress={
            handleSubmit
          }>

          <Text
            style={[
              styles.createButtonText,

              !canSubmit &&
                styles.createButtonTextDisabled,
            ]}>
            {saving ? 'Salvando...' : 'Criar tarefa'}
          </Text>

        </Pressable>

      </View>

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
    <View
      style={
        styles.formGroup
      }>

      <Text
        style={
          styles.label
        }>
        {label}

        {required && (
          <Text
            style={
              styles.required
            }>
            {' '}*
          </Text>
        )}

      </Text>

      {children}

    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#FAFAFA',
    },

    header: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor:
        '#F1F5F9',
    },

    backButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor:
        '#F1F5F9',
      justifyContent:
        'center',
      alignItems: 'center',
    },

    backIcon: {
      fontSize: 32,
      color: '#1E1B3A',
      marginTop: -4,
    },

    headerTitle: {
      flex: 1,
      fontSize: 21,
      fontWeight: '700',
      color: '#1E1B3A',
      marginLeft: 12,
    },

    draftBadge: {
      backgroundColor:
        '#EEF0FF',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },

    draftText: {
      fontSize: 12,
      color: '#5C4DFF',
      fontWeight: '600',
    },

    scrollContent: {
      padding: 16,
      paddingBottom: 30,
    },

    formGroup: {
      marginBottom: 20,
    },

    label: {
      fontSize: 12,
      fontWeight: '700',
      color: '#94A3B8',
      textTransform:
        'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
    },

    required: {
      color: '#F43F5E',
    },

    subLabel: {
      fontSize: 12,
      color: '#94A3B8',
      fontWeight: '500',
      marginBottom: 6,
    },

    input: {
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1.5,
      borderColor:
        '#E2E8F0',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 13,
      color: '#1E1B3A',
      fontSize: 15,
    },

    accentInput: {
      borderColor:
        '#D8D4FF',
    },

    dateText: {
      color: '#1E1B3A',
      fontSize: 15,
    },

    textArea: {
      minHeight: 100,
    },

    row: {
      flexDirection: 'row',
      gap: 8,
    },

    flex: {
      flex: 1,
    },

    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    optionCard: {
      flex: 1,
      borderWidth: 1.5,
      borderColor:
        '#E2E8F0',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 14,
      alignItems: 'center',
      paddingVertical: 12,
    },

    optionIcon: {
      fontSize: 18,
    },

    optionText: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: '600',
      color: '#94A3B8',
    },

    projectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor:
        '#E2E8F0',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },

    projectIcon: {
      fontSize: 15,
      marginRight: 7,
    },

    projectText: {
      fontSize: 13,
      color: '#64748B',
      fontWeight: '500',
    },

    noProjectsCard: {
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1.5,
      borderColor:
        '#E2E8F0',
      borderRadius: 14,
      padding: 14,
    },

    noProjectsText: {
      color: '#94A3B8',
      fontSize: 13,
      marginBottom: 8,
    },

    createProjectLink: {
      color: '#5C4DFF',
      fontSize: 13,
      fontWeight: '700',
    },

    statusButton: {
      flex: 1,
      borderWidth: 1.5,
      borderColor:
        '#E2E8F0',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 12,
      paddingVertical: 10,
    },

    statusText: {
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      color: '#94A3B8',
    },

    sectionCard: {
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1.5,
      borderColor:
        '#E2E8F0',
      borderRadius: 14,
      overflow: 'hidden',
    },

    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor:
        '#F8FAFC',
    },

    emptyCheck: {
      width: 20,
      height: 20,
      borderWidth: 1.5,
      borderColor:
        '#C7D2FE',
      borderRadius: 6,
      marginRight: 10,
    },

    inlineInput: {
      flex: 1,
      color: '#1E1B3A',
      fontSize: 14,
    },

    confirmSmall: {
      width: 28,
      height: 28,
      borderRadius: 7,
      backgroundColor:
        '#5C4DFF',
      justifyContent:
        'center',
      alignItems: 'center',
    },

    confirmSmallText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },

    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 13,
    },

    addIcon: {
      color: '#A5B4FC',
      fontSize: 20,
      marginRight: 8,
    },

    addText: {
      color: '#94A3B8',
      fontSize: 14,
    },

    listText: {
      flex: 1,
      color: '#1E1B3A',
      fontSize: 14,
    },

    removeText: {
      color: '#CBD5E1',
      fontSize: 15,
    },

    reminderIcon: {
      marginRight: 8,
    },

    reminderOption: {
      flexDirection: 'row',
      paddingHorizontal: 14,
      paddingVertical: 12,
      alignItems: 'center',
    },

    reminderDisabled: {
      backgroundColor:
        '#F8FAFC',
      opacity: 0.5,
    },

    reminderOptionText: {
      color: '#1E1B3A',
      fontSize: 14,
      flex: 1,
    },

    reminderCheck: {
      color: '#22C55E',
      fontWeight: '700',
    },

    cancelReminder: {
      paddingVertical: 10,
    },

    cancelReminderText: {
      textAlign: 'center',
      color: '#94A3B8',
      fontSize: 13,
    },

    footer: {
      flexDirection: 'row',
      gap: 10,
      padding: 16,
      backgroundColor:
        '#FAFAFA',
      borderTopWidth: 1,
      borderTopColor:
        '#F1F5F9',
    },

    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor:
        '#F1F5F9',
      alignItems: 'center',
    },

    cancelButtonText: {
      color: '#64748B',
      fontSize: 15,
      fontWeight: '600',
    },

    createButton: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor:
        '#5C4DFF',
      alignItems: 'center',
    },

    createButtonDisabled: {
      backgroundColor:
        '#E2E8F0',
    },

    createButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },

    createButtonTextDisabled: {
      color: '#94A3B8',
    },
  });