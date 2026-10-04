import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTasks } from '../context/TaskContext';
import { ApiError } from '../services/api';

function message(error: unknown) {
  if (error instanceof ApiError && error.code === 'TASK_NOT_FOUND') {
    return 'Esta tarefa não está disponível no servidor. As observações exigem uma tarefa persistida na API.';
  }
  return error instanceof Error ? error.message : 'Verifique a conexão e tente novamente.';
}

export default function TaskNotesSection({ taskId }: { taskId: string }) {
  const { taskNotes, loadTaskNotes, addTaskNote, editTaskNote, removeTaskNote } = useTasks();
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
      .catch(reason => { if (active.current) {setError(message(reason));} })
      .finally(() => { if (active.current) {setLoading(false);} });
    return () => { active.current = false; };
  }, [taskId, loadTaskNotes]);

  async function save(key: string, operation: () => Promise<{ cacheSaved: boolean }>, success: () => void) {
    if (busy.current) {return;}
    busy.current = true;
    setSaving(key);
    try {
      const result = await operation();
      if (active.current) {
        success();
        if (!result.cacheSaved) {Alert.alert('Observação salva no servidor', 'Não foi possível atualizar o cache da tarefa. Não repita a operação.');}
      }
    } catch (reason) {
      if (active.current) {Alert.alert('Não foi possível salvar a observação', message(reason));}
    } finally {
      busy.current = false;
      if (active.current) {setSaving(null);}
    }
  }
  function confirmDelete(id: string) {
    if (busy.current) {return;}
    Alert.alert('Excluir observação?', 'Tem certeza que deseja excluir esta observação?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => save(id, () => removeTaskNote(taskId, id), () => { if (editing === id) {setEditing(null);} }) },
    ]);
  }
  const disabled = loading || saving !== null;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Observações</Text>
      {loading && <Text style={styles.muted}>Carregando observações…</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {!loading && !error && notes.length === 0 && <Text style={styles.muted}>Nenhuma observação registrada.</Text>}
      {notes.map(note => (
        <View key={note.id} style={styles.note}>
          {editing === note.id ? (
            <>
              <TextInput accessibilityLabel="Editar conteúdo da observação" multiline value={content} editable={!disabled} onChangeText={setContent} style={styles.input} />
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" disabled={disabled || !content.trim()} onPress={() => save(note.id, () => editTaskNote(taskId, note.id, content.trim()), () => setEditing(null))} style={styles.button}>
                  <Text style={styles.buttonText}>{saving === note.id ? 'Salvando…' : 'Salvar observação'}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={disabled} onPress={() => setEditing(null)}><Text style={styles.link}>Cancelar</Text></Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.content}>{note.content}</Text>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" disabled={disabled} onPress={() => { setEditing(note.id); setContent(note.content); }}><Text style={styles.link}>Editar observação</Text></Pressable>
                <Pressable accessibilityRole="button" disabled={disabled} onPress={() => confirmDelete(note.id)}><Text style={styles.error}>{saving === note.id ? 'Salvando…' : 'Excluir observação'}</Text></Pressable>
              </View>
            </>
          )}
          <Text style={styles.date}>Criada em {new Date(note.createdAt).toLocaleString('pt-BR')}</Text>
        </View>
      ))}
      <TextInput accessibilityLabel="Nova observação" placeholder="Escreva uma observação…" placeholderTextColor="#94A3B8" multiline value={draft} editable={!disabled} onChangeText={setDraft} style={styles.input} />
      <Pressable accessibilityRole="button" disabled={disabled || !draft.trim()} onPress={() => save('create', () => addTaskNote(taskId, draft.trim()), () => setDraft(''))} style={[styles.button, (disabled || !draft.trim()) && styles.disabled]}>
        <Text style={styles.buttonText}>{saving === 'create' ? 'Salvando…' : 'Adicionar observação'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 17, marginBottom: 14, elevation: 2 },
  title: { fontSize: 16, fontWeight: '700', color: '#1E1B3A', marginBottom: 12 },
  muted: { color: '#94A3B8', fontSize: 13, marginBottom: 10 },
  content: { color: '#1E1B3A', fontSize: 14, lineHeight: 22 },
  note: { borderBottomWidth: 1, borderBottomColor: '#EEF0F5', paddingVertical: 12, marginBottom: 10 },
  date: { color: '#94A3B8', fontSize: 11, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top', color: '#1E1B3A', marginBottom: 10 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginTop: 8 },
  button: { backgroundColor: '#5C4DFF', borderRadius: 12, padding: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  link: { color: '#5C4DFF', fontSize: 12, fontWeight: '600' },
  error: { color: '#F43F5E', fontSize: 12 },
  disabled: { opacity: 0.5 },
});
