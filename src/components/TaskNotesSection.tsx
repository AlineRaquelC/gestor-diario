import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTasks } from '../context/TaskContext';
import { ApiError } from '../services/api';
import { COLORS, RADIUS, SPACING } from '../styles/theme';

function message(error: unknown) {
  if (error instanceof ApiError && error.code === 'TASK_NOT_FOUND') {
    return 'Esta tarefa não está disponível no servidor. As observações exigem uma tarefa persistida na API.';
  }
  return error instanceof Error
    ? error.message
    : 'Verifique a conexão e tente novamente.';
}

export default function TaskNotesSection({ taskId }: { taskId: string }) {
  const {
    taskNotes,
    loadTaskNotes,
    addTaskNote,
    editTaskNote,
    removeTaskNote,
  } = useTasks();
  const notes = taskNotes[taskId] ?? [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const busy = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    setLoading(true);
    setError(null);
    loadTaskNotes(taskId)
      .catch(reason => {
        if (active.current) {
          setError(message(reason));
        }
      })
      .finally(() => {
        if (active.current) {
          setLoading(false);
        }
      });
    return () => {
      active.current = false;
    };
  }, [taskId, loadTaskNotes]);

  async function save(
    key: string,
    operation: () => Promise<{ cacheSaved: boolean }>,
    success: () => void,
  ) {
    if (busy.current) {
      return;
    }
    busy.current = true;
    setSaving(key);
    try {
      const result = await operation();
      if (active.current) {
        success();
        if (!result.cacheSaved) {
          Alert.alert(
            'Observação salva no servidor',
            'Não foi possível atualizar o cache da tarefa. Não repita a operação.',
          );
        }
      }
    } catch (reason) {
      if (active.current) {
        Alert.alert('Não foi possível salvar a observação', message(reason));
      }
    } finally {
      busy.current = false;
      if (active.current) {
        setSaving(null);
      }
    }
  }
  function confirmDelete(id: string) {
    if (busy.current) {
      return;
    }
    Alert.alert(
      'Excluir observação?',
      'Tem certeza que deseja excluir esta observação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () =>
            save(
              id,
              () => removeTaskNote(taskId, id),
              () => {
                if (editing === id) {
                  setEditing(null);
                }
              },
            ),
        },
      ],
    );
  }
  const disabled = loading || saving !== null;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Observações</Text>
      {loading && <Text style={styles.muted}>Carregando observações…</Text>}
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
      {!loading && !error && notes.length === 0 && (
        <Text style={styles.muted}>Nenhuma observação registrada.</Text>
      )}
      {notes.map(note => (
        <View key={note.id} style={styles.note}>
          {editing === note.id ? (
            <>
              <TextInput
                accessibilityLabel="Editar conteúdo da observação"
                multiline
                value={content}
                editable={!disabled}
                onChangeText={setContent}
                style={styles.input}
              />
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={disabled || !content.trim()}
                  onPress={() =>
                    save(
                      note.id,
                      () => editTaskNote(taskId, note.id, content.trim()),
                      () => setEditing(null),
                    )
                  }
                  style={[
                    styles.button,
                    (disabled || !content.trim()) && styles.disabled,
                  ]}
                >
                  <Text style={styles.buttonText}>
                    {saving === note.id ? 'Salvando…' : 'Salvar observação'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={() => setEditing(null)}
                >
                  <Text style={styles.link}>Cancelar</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.content}>{note.content}</Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={() => {
                    setEditing(note.id);
                    setContent(note.content);
                  }}
                >
                  <Text style={styles.link}>Editar observação</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={() => confirmDelete(note.id)}
                >
                  <Text style={styles.error}>
                    {saving === note.id ? 'Salvando…' : 'Excluir observação'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
          <Text style={styles.date}>
            Criada em {new Date(note.createdAt).toLocaleString('pt-BR')}
          </Text>
        </View>
      ))}
      <TextInput
        accessibilityLabel="Nova observação"
        placeholder="Escreva uma observação…"
        placeholderTextColor={COLORS.textSecondary}
        multiline
        value={draft}
        editable={!disabled}
        onChangeText={setDraft}
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        disabled={disabled || !draft.trim()}
        onPress={() =>
          save(
            'create',
            () => addTaskNote(taskId, draft.trim()),
            () => setDraft(''),
          )
        }
        style={[styles.button, (disabled || !draft.trim()) && styles.disabled]}
      >
        <Text style={styles.buttonText}>
          {saving === 'create' ? 'Salvando…' : 'Adicionar observação'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  muted: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 10 },
  content: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 22 },
  note: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
    marginBottom: 10,
  },
  date: { color: COLORS.textSecondary, fontSize: 11, marginTop: 8 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  buttonText: { color: COLORS.surface, fontWeight: '700', fontSize: 13 },
  disabled: { opacity: 0.5 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
    textAlignVertical: 'top',
    marginBottom: SPACING.sm,
  },
  button: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    paddingVertical: SPACING.md,
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.danger,
    paddingVertical: SPACING.md,
  },
});
