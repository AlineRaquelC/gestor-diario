import React, { useRef, useState } from 'react';
import RecurringDeleteDialog from '../components/RecurringDeleteDialog';
import type { RecurringDeleteScope } from '../components/RecurringDeleteDialog';
import { AccessibilityInfo, Alert, View } from 'react-native';
import { useTasks } from '../context/TaskContext';

export function useTaskDeletion(id: string, onDeleted: () => void) {
  const { tasks, deleteTask, deleteRecurringTask } = useTasks();
  const task = tasks.find(item => item.id === id);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const triggerRef = useRef<React.ComponentRef<typeof View>>(null);
  const cancel = () => {
    if (busy.current) {return;}
    setVisible(false);
    requestAnimationFrame(() => {if (triggerRef.current) {AccessibilityInfo.sendAccessibilityEvent(triggerRef.current, 'focus');}});
  };
  async function confirmScope(scope: RecurringDeleteScope) {
    if (busy.current) {return;}
    busy.current = true; setSaving(true);
    try {
      const result = scope === 'single' ? await deleteTask(id) : await deleteRecurringTask(id, scope);
      setVisible(false);
      onDeleted();
      if (!result.cacheSaved || ('pending' in result && result.pending)) {
        Alert.alert('Exclusão salva', 'Atualização do cache ou cancelamento dos lembretes pendente neste aparelho. Atualize para concluir.');
      }
    } catch (error) {
      Alert.alert('Não foi possível concluir a exclusão', error instanceof Error ? error.message : 'Verifique a conexão e atualize.');
    } finally {busy.current = false; setSaving(false);}
  }
  const confirmDelete = () => {
    if (busy.current) {return;}
    if (task?.recurrenceSeriesId) {setVisible(true); return;}
    busy.current = true;
    let submitted = false;
    Alert.alert('Excluir tarefa?', 'Tem certeza que deseja excluir esta tarefa?', [
      { text: 'Cancelar', style: 'cancel', onPress: () => { busy.current = false; } },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        if (submitted) {return;}
        submitted = true;
        try {
          const result = await deleteTask(id);
          onDeleted();
          if (!result.cacheSaved) {Alert.alert('Tarefa excluída no servidor', 'Não foi possível atualizar o cache local.');}
        } catch (error) {
          Alert.alert('Não foi possível excluir', error instanceof Error ? error.message : 'Verifique a conexão e tente novamente.');
        } finally { busy.current = false; }
      } },
    ], { cancelable: true, onDismiss: () => { busy.current = false; } });
  };
  return Object.assign(confirmDelete, { triggerRef, dialog: React.createElement(RecurringDeleteDialog, {
    visible, busy: saving, occurrenceKey: task?.occurrenceKey,
    moved: !!task?.occurrenceKey && task.occurrenceKey !== task.dueDateKey,
    onCancel: cancel, onConfirm: confirmScope,
  }) });
}
