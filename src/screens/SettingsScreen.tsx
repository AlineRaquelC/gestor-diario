import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '../components/BottomNavigation';
import { useTasks } from '../context/TaskContext';

export default function SettingsScreen() {
  const { syncing, loading, synchronizeManually } = useTasks();
  const [message, setMessage] = useState('');
  async function handleSync() {
    setMessage('');
    try {
      const result = await synchronizeManually();
      setMessage(result.pending
        ? `Sincronização com ${result.pending} pendência(s). Dados locais preservados.`
        : `Sincronização concluída. ${result.projectsSent} projeto(s) e ${result.tasksSent} tarefa(s) enviados.` +
          (result.conflicts ? ' Versões locais divergentes preservadas no dispositivo.' : ''));
    } catch (error) {
      setMessage(`Falha na sincronização. ${error instanceof Error ? error.message : 'Verifique a conexão e tente novamente.'} Dados locais preservados.`);
    }
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Configurações</Text>
        <Text style={styles.description}>Sincronize seus projetos e tarefas com o servidor local.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Sincronizar" accessibilityState={{ disabled: syncing || loading, busy: syncing }}
          disabled={syncing || loading} style={styles.button} onPress={handleSync}>
          <Text style={styles.buttonText}>{syncing ? 'Sincronizando...' : 'Sincronizar'}</Text>
        </Pressable>
        {!!message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
      </View>
      <BottomNavigation active="Configuracoes" />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#1E1B3A', marginBottom: 16 },
  description: { color: '#64748B', marginBottom: 20 },
  button: { backgroundColor: '#5C4DFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  message: { color: '#1E1B3A', marginTop: 16, lineHeight: 22 },
});
