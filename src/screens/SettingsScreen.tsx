import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '../components/BottomNavigation';
import { useTasks } from '../context/TaskContext';

import { COLORS, RADIUS, SPACING } from '../styles/theme';

export default function SettingsScreen() {
  const { syncing, loading, synchronizeManually } = useTasks();
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState<'success' | 'warning' | 'danger'>(
    'success',
  );
  async function handleSync() {
    setMessage('');
    try {
      const result = await synchronizeManually();
      setFeedback(result.pending || result.conflicts ? 'warning' : 'success');
      setMessage(
        result.pending
          ? `Sincronização com ${result.pending} pendência(s). Dados locais preservados.`
          : `Sincronização concluída. ${result.projectsSent} projeto(s) e ${result.tasksSent} tarefa(s) enviados.` +
              (result.conflicts
                ? ' Versões locais divergentes preservadas no dispositivo.'
                : ''),
      );
    } catch (error) {
      setFeedback('danger');
      setMessage(
        `Falha na sincronização. ${
          error instanceof Error
            ? error.message
            : 'Verifique a conexão e tente novamente.'
        } Dados locais preservados.`,
      );
    }
  }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Configurações</Text>
        <Text style={styles.sectionLabel}>DADOS E SINCRONIZAÇÃO</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sincronização manual</Text>
          <Text style={styles.description}>
            Mantenha projetos e tarefas sincronizados com o servidor local.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sincronizar"
            accessibilityState={{ disabled: syncing || loading, busy: syncing }}
            disabled={syncing || loading}
            style={[styles.button, (syncing || loading) && styles.disabled]}
            onPress={handleSync}
          >
            <Text style={styles.buttonText}>
              {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </Text>
          </Pressable>
          {!!message && (
            <View style={[styles.feedback, styles[feedback]]}>
              <Text
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
                style={[styles.message, styles[`${feedback}Text`]]}
              >
                {message}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      <BottomNavigation active="Configuracoes" />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  button: {
    minHeight: 48,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: COLORS.surface, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  feedback: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  message: { fontSize: 14, lineHeight: 22 },
  success: { backgroundColor: COLORS.successSoft },
  successText: { color: COLORS.success },
  warning: { backgroundColor: COLORS.warningSoft },
  warningText: { color: COLORS.warning },
  danger: { backgroundColor: COLORS.dangerSoft },
  dangerText: { color: COLORS.danger },
});
