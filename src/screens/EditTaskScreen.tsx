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

import DateTimePicker from '@react-native-community/datetimepicker';

import {
  useTasks,
  Priority,
  TaskStatus,
  Subtask,
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
    symbol: '▽',
  },
  {
    value: 'medium' as Priority,
    label: 'Média',
    color: '#D97706',
    background: '#FEF3C7',
    symbol: '◈',
  },
  {
    value: 'high' as Priority,
    label: 'Alta',
    color: '#F43F5E',
    background: '#FFE4E9',
    symbol: '▲',
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
  {
    value: 'completed' as TaskStatus,
    label: 'Concluída',
    color: '#22C55E',
    background: '#F0FDF4',
  },
];

export default function EditTaskScreen() {
  const navigation =
    useNavigation<any>();

  const route =
    useRoute<any>();

  const {taskId} =
    route.params;

  const {
    tasks,
    updateTask,
    deleteTask,
  } = useTasks();

  const {
    projects,
  } = useProjects();

  const task =
    tasks.find(
      item =>
        item.id === taskId,
    );

  if (!task) {
    return (
      <SafeAreaView
        style={styles.container}>

        <View
          style={
            styles.notFoundContainer
          }>

          <Text
            style={
              styles.notFoundTitle
            }>
            Tarefa não encontrada
          </Text>

          <Pressable
            style={
              styles.backHomeButton
            }
            onPress={() =>
              navigation.navigate(
                'Home',
              )
            }>

            <Text
              style={
                styles.backHomeText
              }>
              Voltar para Home
            </Text>

          </Pressable>

        </View>

      </SafeAreaView>
    );
  }

  const [title, setTitle] =
    useState(task.title);

  const [
    description,
    setDescription,
  ] = useState(
    task.description ?? '',
  );

  const [
    startDate,
    setStartDate,
  ] = useState(
    task.startDate
      ? new Date(
          task.startDate,
        )
      : new Date(),
  );

  const [
    dueDate,
    setDueDate,
  ] = useState(
    task.dueDate
      ? new Date(
          task.dueDate,
        )
      : new Date(),
  );

  const [
    showStartDatePicker,
    setShowStartDatePicker,
  ] = useState(false);

  const [
    showDueDatePicker,
    setShowDueDatePicker,
  ] = useState(false);

  const [time, setTime] =
    useState(
      task.time ?? '',
    );

  const [
    priority,
    setPriority,
  ] = useState<Priority>(
    task.priority,
  );

  const [
    project,
    setProject,
  ] = useState(
    task.project,
  );

  const [
    status,
    setStatus,
  ] = useState<TaskStatus>(
    task.status,
  );

  const [
    subtasks,
    setSubtasks,
  ] = useState<Subtask[]>(
    task.subtasks ?? [],
  );

  const [
    addingSubtask,
    setAddingSubtask,
  ] = useState(false);

  const [
    newSubtask,
    setNewSubtask,
  ] = useState('');

  const [
    dirty,
    setDirty,
  ] = useState(false);

  function formatDateBR(
    date: Date,
  ) {
    return date.toLocaleDateString(
      'pt-BR',
    );
  }

  function markDirty() {
    setDirty(true);
  }

  function toggleSubtask(
    id: string,
  ) {
    setSubtasks(current =>
      current.map(
        subtask =>
          subtask.id === id
            ? {
                ...subtask,
                done:
                  !subtask.done,
              }
            : subtask,
      ),
    );

    markDirty();
  }

  function handleAddSubtask() {
    if (
      !newSubtask.trim()
    ) {
      return;
    }

    setSubtasks(current => [
      ...current,
      {
        id:
          Date.now().toString(),

        title:
          newSubtask.trim(),

        done:
          false,
      },
    ]);

    setNewSubtask('');
    setAddingSubtask(false);

    markDirty();
  }

  function removeSubtask(
    id: string,
  ) {
    setSubtasks(current =>
      current.filter(
        subtask =>
          subtask.id !== id,
      ),
    );

    markDirty();
  }

  function saveChanges() {
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

    updateTask(
      taskId,
      {
        title:
          title.trim(),

        description:
          description.trim(),

        project,

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

        subtasks,
      },
    );

    setDirty(false);

    Alert.alert(
      'Alterações salvas',
      'A tarefa foi atualizada com sucesso.',
      [
        {
          text: 'OK',

          onPress: () =>
            navigation.goBack(),
        },
      ],
    );
  }

  function confirmDelete() {
    Alert.alert(
      'Excluir tarefa',
      'Tem certeza que deseja excluir esta tarefa?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',

          onPress: () => {
            deleteTask(
              taskId,
            );

            navigation.reset({
              index: 0,

              routes: [
                {
                  name:
                    'Home',
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
      edges={[
        'top',
        'bottom',
      ]}>

      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F6F7FF"
      />

      {/* Cabeçalho */}
      <View style={styles.header}>

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
          Editar Tarefa
        </Text>

        {dirty ? (
          <View
            style={
              styles.unsavedBadge
            }>

            <Text
              style={
                styles.unsavedText
              }>
              Não salvo
            </Text>

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
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled">

        {/* Título */}
        <Field
          label="Título"
          required>

          <TextInput
            style={
              styles.input
            }
            value={title}
            onChangeText={value => {
              setTitle(value);
              markDirty();
            }}
            placeholder="Nome da tarefa..."
            placeholderTextColor="#94A3B8"
          />

        </Field>

        {/* Descrição */}
        <Field label="Descrição">

          <TextInput
            style={[
              styles.input,
              styles.textArea,
            ]}
            value={
              description
            }
            onChangeText={value => {
              setDescription(
                value,
              );

              markDirty();
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholder="Adicione detalhes..."
            placeholderTextColor="#94A3B8"
          />

        </Field>

        {/* Datas */}
        <Field label="Datas">

          <View style={styles.row}>

            <View style={styles.flex}>

              <Text
                style={
                  styles.subLabel
                }>
                INÍCIO
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
                  {
                    formatDateBR(
                      startDate,
                    )
                  }
                </Text>

              </Pressable>

            </View>

            <View style={styles.flex}>

              <Text
                style={
                  styles.subLabel
                }>
                PRAZO
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
                  {
                    formatDateBR(
                      dueDate,
                    )
                  }
                </Text>

              </Pressable>

            </View>

          </View>

          {showStartDatePicker && (
            <DateTimePicker
              value={
                startDate
              }
              mode="date"
              display="default"
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

                  if (
                    selectedDate >
                    dueDate
                  ) {
                    setDueDate(
                      selectedDate,
                    );
                  }

                  markDirty();
                }
              }}
            />
          )}

          {showDueDatePicker && (
            <DateTimePicker
              value={
                dueDate
              }
              mode="date"
              display="default"
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

                  markDirty();
                }
              }}
            />
          )}

        </Field>

        {/* Horário */}
        <Field label="Horário">

          <TextInput
            style={
              styles.input
            }
            value={time}
            onChangeText={value => {
              setTime(value);
              markDirty();
            }}
            placeholder="18:00"
            placeholderTextColor="#94A3B8"
          />

        </Field>

        {/* Prioridade */}
        <Field label="Prioridade">

          <View style={styles.row}>

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
                        borderColor:
                          item.color,

                        backgroundColor:
                          item.background,
                      },
                    ]}
                    onPress={() => {
                      setPriority(
                        item.value,
                      );

                      markDirty();
                    }}>

                    <Text
                      style={[
                        styles.optionSymbol,
                        {
                          color:
                            item.color,
                        },
                      ]}>
                      {item.symbol}
                    </Text>

                    <Text
                      style={[
                        styles.optionLabel,

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

        </Field>

        {/* PROJETOS REAIS */}
        <Field
          label="Projeto / Categoria">

          {projects.length === 0 ? (

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

            <View style={styles.wrap}>

              {projects.map(
                item => {

                  const active =
                    project ===
                    item.name;

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
                      onPress={() => {
                        setProject(
                          item.name,
                        );

                        markDirty();
                      }}>

                      <Text
                        style={
                          styles.projectIcon
                        }>
                        {
                          item.icon ??
                          '📁'
                        }
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

        </Field>

        {/* Status */}
        <Field label="Status">

          <View
            style={
              styles.statusWrap
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
                    onPress={() => {
                      setStatus(
                        item.value,
                      );

                      markDirty();
                    }}>

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

        </Field>

        {/* Subtarefas */}
        <Field label="Subtarefas">

          <View
            style={
              styles.subtasksCard
            }>

            {subtasks.map(
              (
                subtask,
                index,
              ) => (

                <View
                  key={
                    subtask.id
                  }
                  style={[
                    styles.subtaskRow,

                    index <
                      subtasks.length -
                        1 &&
                      styles.subtaskBorder,
                  ]}>

                  <Pressable
                    style={[
                      styles.checkbox,

                      subtask.done &&
                        styles.checkboxDone,
                    ]}
                    onPress={() =>
                      toggleSubtask(
                        subtask.id,
                      )
                    }>

                    {subtask.done && (
                      <Text
                        style={
                          styles.checkboxText
                        }>
                        ✓
                      </Text>
                    )}

                  </Pressable>

                  <Text
                    style={[
                      styles.subtaskTitle,

                      subtask.done &&
                        styles.subtaskTitleDone,
                    ]}>
                    {
                      subtask.title
                    }
                  </Text>

                  <View
                    style={[
                      styles.subtaskStatus,

                      subtask.done &&
                        styles.subtaskStatusDone,
                    ]}>

                    <Text
                      style={[
                        styles.subtaskStatusText,

                        subtask.done &&
                          styles.subtaskStatusTextDone,
                      ]}>
                      {
                        subtask.done
                          ? 'Feita'
                          : 'Pendente'
                      }
                    </Text>

                  </View>

                  <Pressable
                    onPress={() =>
                      removeSubtask(
                        subtask.id,
                      )
                    }>

                    <Text
                      style={
                        styles.remove
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
                  styles.subtaskRow
                }>

                <View
                  style={
                    styles.checkbox
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

                <Pressable
                  onPress={() => {
                    setAddingSubtask(
                      false,
                    );

                    setNewSubtask(
                      '',
                    );
                  }}>

                  <Text
                    style={
                      styles.remove
                    }>
                    ✕
                  </Text>

                </Pressable>

              </View>

            ) : (

              <Pressable
                style={
                  styles.addSubtask
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

        </Field>

        {/* Excluir */}
        <View
          style={
            styles.dangerZone
          }>

          <Text
            style={
              styles.dangerLabel
            }>
            ZONA DE PERIGO
          </Text>

          <Pressable
            style={
              styles.dangerButton
            }
            onPress={
              confirmDelete
            }>

            <View
              style={
                styles.trashIcon
              }>
              <Text>
                🗑
              </Text>
            </View>

            <View
              style={
                styles.flex
              }>

              <Text
                style={
                  styles.deleteTitle
                }>
                Excluir tarefa
              </Text>

              <Text
                style={
                  styles.deleteSubtitle
                }>
                Esta ação não pode ser desfeita
              </Text>

            </View>

            <Text
              style={
                styles.deleteArrow
              }>
              ›
            </Text>

          </Pressable>

        </View>

      </ScrollView>

      {/* Rodapé */}
      <View style={styles.footer}>

        <Pressable
          style={
            styles.cancelButton
          }
          onPress={() =>
            navigation.goBack()
          }>

          <Text
            style={
              styles.cancelText
            }>
            Cancelar
          </Text>

        </Pressable>

        <Pressable
          style={
            styles.saveButton
          }
          onPress={
            saveChanges
          }>

          <Text
            style={
              styles.saveText
            }>
            ✓ Salvar alterações
          </Text>

        </Pressable>

      </View>

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
    <View
      style={
        styles.field
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
        '#F6F7FF',
    },

    scroll: {
      flex: 1,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor:
        '#FAFAFA',
      borderBottomWidth: 1,
      borderBottomColor:
        '#EEF0F5',
    },

    backButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor:
        '#F1F5F9',
      alignItems: 'center',
      justifyContent:
        'center',
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
      backgroundColor:
        '#FEF3C7',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },

    unsavedText: {
      color: '#D97706',
      fontSize: 12,
      fontWeight: '700',
    },

    content: {
      padding: 16,
      paddingBottom: 26,
    },

    field: {
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
      fontSize: 11,
      fontWeight: '600',
      color: '#94A3B8',
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
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1.5,
      borderColor:
        '#E2E8F0',
      borderRadius: 14,
      alignItems: 'center',
      paddingVertical: 12,
    },

    optionSymbol: {
      fontSize: 18,
    },

    optionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#94A3B8',
      marginTop: 4,
    },

    projectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1.5,
      borderColor:
        '#E2E8F0',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },

    projectIcon: {
      fontSize: 15,
      marginRight: 7,
    },

    projectText: {
      color: '#64748B',
      fontSize: 13,
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

    statusWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    statusButton: {
      minWidth: '47%',
      flexGrow: 1,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1.5,
      borderColor:
        '#E2E8F0',
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 8,
    },

    statusText: {
      color: '#94A3B8',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },

    subtasksCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor:
        '#E2E8F0',
      overflow: 'hidden',
    },

    subtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 13,
    },

    subtaskBorder: {
      borderBottomWidth: 1,
      borderBottomColor:
        '#F8FAFC',
    },

    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 2,
      borderColor:
        '#C7D2FE',
      marginRight: 11,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    checkboxDone: {
      backgroundColor:
        '#22C55E',
      borderColor:
        '#22C55E',
    },

    checkboxText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },

    subtaskTitle: {
      flex: 1,
      color: '#1E1B3A',
      fontSize: 14,
      fontWeight: '500',
    },

    subtaskTitleDone: {
      color: '#94A3B8',
      textDecorationLine:
        'line-through',
      fontWeight: '400',
    },

    subtaskStatus: {
      backgroundColor:
        '#F8FAFC',
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
      marginRight: 8,
    },

    subtaskStatusDone: {
      backgroundColor:
        '#F0FDF4',
    },

    subtaskStatusText: {
      color: '#94A3B8',
      fontSize: 10,
      fontWeight: '600',
    },

    subtaskStatusTextDone: {
      color: '#15803D',
    },

    remove: {
      color: '#CBD5E1',
      fontSize: 15,
    },

    addSubtask: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
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

    inlineInput: {
      flex: 1,
      color: '#1E1B3A',
      fontSize: 14,
    },

    confirmSmall: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor:
        '#5C4DFF',
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 8,
    },

    confirmSmallText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },

    dangerZone: {
      backgroundColor:
        '#FFF5F6',
      borderRadius: 16,
      padding: 15,
      borderWidth: 1.5,
      borderColor:
        '#FFD0D8',
    },

    dangerLabel: {
      color: '#94A3B8',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.7,
      marginBottom: 10,
    },

    dangerButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    trashIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor:
        '#FFE4E9',
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 10,
    },

    deleteTitle: {
      color: '#F43F5E',
      fontSize: 13,
      fontWeight: '700',
    },

    deleteSubtitle: {
      color: '#94A3B8',
      fontSize: 12,
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
      backgroundColor:
        '#FAFAFA',
      borderTopWidth: 1,
      borderTopColor:
        '#EEF0F5',
    },

    cancelButton: {
      flex: 1,
      backgroundColor:
        '#F1F5F9',
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },

    cancelText: {
      color: '#64748B',
      fontSize: 15,
      fontWeight: '600',
    },

    saveButton: {
      flex: 2.2,
      backgroundColor:
        '#5C4DFF',
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },

    saveText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },

    notFoundContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      padding: 24,
    },

    notFoundTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1E1B3A',
      marginBottom: 16,
    },

    backHomeButton: {
      backgroundColor:
        '#5C4DFF',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    },

    backHomeText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });