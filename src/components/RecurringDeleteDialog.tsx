import React, { useRef, useState } from 'react';
import { AccessibilityInfo, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../styles/theme';

export type RecurringDeleteScope = 'single' | 'future' | 'all';
const options: { scope: RecurringDeleteScope; label: string; detail: string }[] = [
  { scope: 'single', label: 'Somente esta ocorrência', detail: 'Remove apenas esta tarefa. As demais continuam. Desfazer disponível por 5 segundos.' },
  { scope: 'future', label: 'Esta e as próximas', detail: 'Remove esta tarefa e encerra as próximas ocorrências da série, inclusive as já criadas e concluídas. As anteriores permanecem. Sem Desfazer.' },
  { scope: 'all', label: 'Toda a série', detail: 'Remove todas as ocorrências ativas desta série, inclusive anteriores e concluídas. Sem Desfazer.' },
];
export default function RecurringDeleteDialog({ visible, busy, occurrenceKey, moved, onCancel, onConfirm }: {
  visible: boolean; busy: boolean; occurrenceKey?: string | null; moved: boolean;
  onCancel: () => void; onConfirm: (scope: RecurringDeleteScope) => Promise<void>;
}) {
  const [scope, setScope] = useState<RecurringDeleteScope>('single');
  const title = useRef<React.ComponentRef<typeof Text>>(null);
  const label = scope === 'single' ? 'Excluir ocorrência' : scope === 'future' ? 'Excluir esta e as próximas' : 'Excluir toda a série';
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {if (!busy) {onCancel();}}}
    onShow={() => {setScope('single'); if (title.current) {AccessibilityInfo.sendAccessibilityEvent(title.current, 'focus');}}}>
    <View style={styles.overlay}><ScrollView style={styles.scroll} contentContainerStyle={styles.dialog} accessibilityViewIsModal>
      <Text ref={title} accessibilityRole="header" style={styles.title}>Excluir tarefa recorrente</Text>
      {moved && <Text style={styles.detail}>A ordem segue a ocorrência original de {occurrenceKey?.split('-').reverse().join('/')}.</Text>}
      {options.map(option => <Pressable key={option.scope} accessibilityRole="radio" accessibilityState={{ checked: scope === option.scope, disabled: busy }}
        accessibilityLabel={`${option.label}. ${option.detail}`} disabled={busy} onPress={() => setScope(option.scope)} style={[styles.option, scope === option.scope && styles.selected]}>
        <Text style={styles.optionTitle}>{option.label}</Text><Text style={styles.detail}>{option.detail}</Text>
      </Pressable>)}
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}. Ação destrutiva`} accessibilityState={{ disabled: busy }} disabled={busy}
        onPress={() => onConfirm(scope)} style={styles.action}><Text style={styles.danger}>{busy ? 'Excluindo…' : label}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancelar exclusão" accessibilityState={{ disabled: busy }} disabled={busy} onPress={onCancel} style={styles.action}><Text style={styles.optionTitle}>Cancelar</Text></Pressable>
    </ScrollView></View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: SPACING.lg },
  scroll: { maxHeight: '90%', borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  dialog: { backgroundColor: COLORS.surface, padding: SPACING.lg, borderRadius: RADIUS.md },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  option: { padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md },
  selected: { borderColor: COLORS.primary },
  optionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  detail: { color: COLORS.textSecondary, marginTop: SPACING.xs },
  action: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  danger: { color: COLORS.danger, fontWeight: '700' },
});
