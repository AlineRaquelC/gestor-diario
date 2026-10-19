import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTasks } from '../context/TaskContext';

export default function TaskUndoFeedback() {
  const { undo, restoreTask } = useTasks();
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  async function restore(id: string) {
    if (busy.current) {return;}
    busy.current = true;
    setSaving(true);
    try {
      const result = await restoreTask(id);
      if (!result.cacheSaved) {Alert.alert('Tarefa restaurada no servidor', 'Não foi possível atualizar o cache local.');}
    } catch (error) {
      Alert.alert('Não foi possível desfazer', error instanceof Error ? error.message : 'Verifique a conexão e tente novamente.');
    } finally { busy.current = false; setSaving(false); }
  }
  if (!undo) {return null;}
  return (
    <View style={styles.feedback} accessibilityLiveRegion="polite">
      <Text style={styles.message}>Tarefa excluída</Text>
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => restore(undo.id)} style={styles.action}>
        <Text style={styles.label}>{saving ? 'Restaurando…' : 'DESFAZER'}</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  feedback: { position: 'absolute', bottom: 90, left: 16, right: 16, zIndex: 100, elevation: 8,
    backgroundColor: '#1E293B', borderRadius: 12, paddingLeft: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  message: { color: '#FFFFFF', flex: 1 },
  action: { padding: 16 },
  label: { color: '#C4B5FD', fontWeight: '700' },
});
