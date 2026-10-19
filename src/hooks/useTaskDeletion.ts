import { useRef } from 'react';
import { Alert } from 'react-native';
import { useTasks } from '../context/TaskContext';

export function useTaskDeletion(id: string, onDeleted: () => void) {
  const { deleteTask } = useTasks();
  const busy = useRef(false);
  return () => {
    if (busy.current) {return;}
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
}
