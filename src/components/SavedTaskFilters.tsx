import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TaskFilters } from '../utils/taskFilters';
import { activeFilterCount } from '../utils/taskFilters';
import type { SavedTaskFilter } from '../models/savedTaskFilter';
import {
  copyTaskFilters,
  SAVED_FILTER_NAME_LIMIT,
} from '../models/savedTaskFilter';
import {
  createSavedFilter,
  deleteSavedFilter,
  loadSavedFilters,
} from '../services/savedTaskFilterService';
import type { Project } from '../context/ProjectContext';
import { COLORS, RADIUS, SPACING } from '../styles/theme';

export default function SavedTaskFilters({
  filters,
  projects,
  onApply,
}: {
  filters: TaskFilters;
  projects: Project[];
  onApply: (filters: TaskFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SavedTaskFilter[]>([]);
  const [name, setName] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    loadSavedFilters()
      .then(values => {
        if (active) {
          setItems(values);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            'Não foi possível carregar os filtros salvos. Os dados foram preservados.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);
  async function mutate(operation: () => Promise<void>) {
    if (lock.current || !ready) {
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await operation();
    } catch {
      setError(
        'Não foi possível salvar a configuração. Tente novamente; os filtros anteriores foram preservados.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const canSave =
    ready && !busy && !!name.trim() && activeFilterCount(filters) > 0;
  function summary(value: TaskFilters) {
    const parts: string[] = [];
    if (value.status !== 'all') {
      parts.push(
        {
          todo: 'Pendentes',
          in_progress: 'Em andamento',
          completed: 'Concluídas',
        }[value.status],
      );
    }
    if (value.priority !== 'all') {
      parts.push(
        {
          high: 'Prioridade alta',
          medium: 'Prioridade média',
          low: 'Prioridade baixa',
        }[value.priority],
      );
    }
    if (value.projectId !== null) {
      parts.push(
        value.projectId === ''
          ? 'Sem projeto'
          : projects.find(
              project =>
                project.id === value.projectId ||
                project.remoteId === value.projectId,
            )?.name ?? 'Projeto indisponível',
      );
    }
    if (value.period !== 'all') {
      parts.push(
        { today: 'Hoje', week: 'Esta semana', month: 'Este mês' }[value.period],
      );
    }
    return parts.join(' · ') || 'Sem filtros ativos';
  }
  const button = (
    label: string,
    onPress: () => void,
    disabled = busy,
    text = label,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[
        styles.button,
        label === 'Salvar filtro atual' && styles.saveButton,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.link,
          label === 'Salvar filtro atual' && styles.saveText,
        ]}
      >
        {text}
      </Text>
    </Pressable>
  );
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Filtros salvos"
        style={styles.launchButton}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.launchText}>
          Filtros salvos{items.length > 0 ? ` · ${items.length}` : ''}
        </Text>
      </Pressable>
      {open && (
        <Modal
          visible={open}
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <SafeAreaView style={styles.container}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.heading}>
                Filtros salvos
              </Text>
              {button(
                'Fechar filtros salvos',
                () => setOpen(false),
                false,
                'Fechar',
              )}
            </View>
            <KeyboardAvoidingView
              style={styles.flex}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.label}>Filtros atuais</Text>
                <Text style={styles.summary}>{summary(filters)}</Text>
                <TextInput
                  accessibilityLabel="Nome do filtro salvo"
                  placeholder="Ex.: Urgentes da semana"
                  placeholderTextColor={COLORS.textSecondary}
                  returnKeyType="done"
                  maxLength={SAVED_FILTER_NAME_LIMIT}
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  editable={!busy}
                />
                {button(
                  'Salvar filtro atual',
                  () => {
                    mutate(async () => {
                      const saved = await createSavedFilter(name, filters);
                      setItems(values => [...values, saved]);
                      setName('');
                    });
                  },
                  !canSave,
                )}
                {!activeFilterCount(filters) && (
                  <Text>Selecione ao menos um filtro para salvar.</Text>
                )}
                {error && (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                  </Text>
                )}
                {!ready && !error && (
                  <Text accessibilityRole="progressbar">
                    Carregando filtros salvos…
                  </Text>
                )}
                {busy && (
                  <Text accessibilityRole="progressbar">
                    Salvando configuração…
                  </Text>
                )}
                <Text style={styles.label}>Seus filtros</Text>
                {ready && !items.length && <Text>Nenhum filtro salvo.</Text>}
                {items.map(item => {
                  const project = item.filters.projectId;
                  const unavailable =
                    project !== null &&
                    project !== '' &&
                    !projects.some(
                      value =>
                        value.id === project || value.remoteId === project,
                    );
                  return (
                    <View key={item.id} style={styles.item}>
                      <Text style={styles.heading}>{item.name}</Text>
                      <Text style={styles.summary}>
                        {summary(item.filters)}
                      </Text>
                      {unavailable && (
                        <Text style={styles.note}>
                          A referência foi preservada. Você pode aplicar ou
                          excluir este filtro.
                        </Text>
                      )}
                      <View style={styles.actions}>
                        {button(
                          `Aplicar filtro: ${item.name}`,
                          () => {
                            onApply(copyTaskFilters(item.filters));
                            setOpen(false);
                          },
                          busy,
                          'Aplicar',
                        )}
                        {button(
                          `Excluir filtro: ${item.name}`,
                          () => {
                            mutate(async () => {
                              await deleteSavedFilter(item.id);
                              setItems(values =>
                                values.filter(value => value.id !== item.id),
                              );
                            });
                          },
                          busy,
                          'Excluir',
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  content: { padding: SPACING.lg, gap: SPACING.md },
  label: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  summary: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  note: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  launchButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
  },
  launchText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  saveText: { color: COLORS.surface, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  heading: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '600' },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  link: { color: COLORS.primary },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 44,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  error: { color: COLORS.danger },
  item: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
});
