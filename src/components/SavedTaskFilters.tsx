import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
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
import { COLORS, SPACING } from '../styles/theme';

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
  const button = (label: string, onPress: () => void, disabled = busy) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={styles.button}
      onPress={onPress}
    >
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
  return (
    <>
      {button('Filtros salvos', () => setOpen(true), false)}
      {open && (
        <Modal
          visible={open}
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <SafeAreaView style={styles.container}>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              <Text accessibilityRole="header" style={styles.heading}>
                Filtros salvos
              </Text>
              <TextInput
                accessibilityLabel="Nome do filtro salvo"
                placeholder="Nome do filtro"
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
              {ready && !items.length && <Text>Nenhum filtro salvo.</Text>}
              {items.map(item => {
                const project = item.filters.projectId;
                const unavailable =
                  project !== null &&
                  project !== '' &&
                  !projects.some(
                    value => value.id === project || value.remoteId === project,
                  );
                return (
                  <View key={item.id} style={styles.item}>
                    <Text style={styles.heading}>{item.name}</Text>
                    {unavailable && <Text>Projeto indisponível</Text>}
                    {button(`Aplicar filtro: ${item.name}`, () => {
                      onApply(copyTaskFilters(item.filters));
                      setOpen(false);
                    })}
                    {button(`Excluir filtro: ${item.name}`, () => {
                      mutate(async () => {
                        await deleteSavedFilter(item.id);
                        setItems(values =>
                          values.filter(value => value.id !== item.id),
                        );
                      });
                    })}
                  </View>
                );
              })}
              {button('Fechar filtros salvos', () => setOpen(false), false)}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.md },
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
    padding: SPACING.sm,
    color: COLORS.textPrimary,
  },
  error: { color: COLORS.danger },
  item: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
  },
});
