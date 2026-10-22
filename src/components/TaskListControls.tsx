import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TaskFilters, TaskSorting } from '../utils/taskFilters';
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  DEFAULT_SORTING,
} from '../utils/taskFilters';
import { COLORS, RADIUS, SPACING } from '../styles/theme';

type Props = {
  filters: TaskFilters;
  sorting: TaskSorting;
  projects: { id: string; name: string }[];
  onApply: (filters: TaskFilters, sorting: TaskSorting) => void;
};
type Panel = 'filters' | 'sorting' | 'projects';

const STATUS = [
  ['all', 'Todos'],
  ['todo', 'Pendentes'],
  ['in_progress', 'Parciais'],
  ['completed', 'Concluídas'],
] as const;
const PRIORITY = [
  ['all', 'Todas'],
  ['high', 'Alta'],
  ['medium', 'Média'],
  ['low', 'Baixa'],
] as const;
const PERIOD = [
  ['all', 'Todos'],
  ['today', 'Hoje'],
  ['week', 'Semana'],
  ['month', 'Mês'],
] as const;
const SORTING = [
  ['none', 'Padrão'],
  ['priority', 'Prioridade'],
  ['dueDate', 'Prazo'],
  ['priorityDueDate', 'Prioridade → Prazo'],
  ['dueDatePriority', 'Prazo → Prioridade'],
] as const;

function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map(([id, text]) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${text}`}
            accessibilityState={{ selected: value === id }}
            onPress={() => onChange(id)}
            style={[styles.chip, value === id && styles.selected]}
          >
            <Text
              style={[styles.chipText, value === id && styles.selectedText]}
            >
              {text}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function TaskListControls({
  filters,
  sorting,
  projects,
  onApply,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [panel, setPanel] = useState<Panel>('filters');
  const [draftFilters, setDraftFilters] = useState(filters);
  const [draftSorting, setDraftSorting] = useState(sorting);
  const count = activeFilterCount(filters);
  const changed = count > 0 || sorting.criterion !== 'none';
  const projectName = (id: string | null) =>
    id === null
      ? 'Todos os projetos'
      : id === ''
      ? 'Sem projeto'
      : projects.find(project => project.id === id)?.name ??
        'Projeto indisponível';
  const activeLabels = [
    filters.status !== 'all' &&
      STATUS.find(([id]) => id === filters.status)?.[1],
    filters.priority !== 'all' &&
      PRIORITY.find(([id]) => id === filters.priority)?.[1],
    filters.projectId !== null && projectName(filters.projectId),
    filters.period !== 'all' &&
      PERIOD.find(([id]) => id === filters.period)?.[1],
  ].filter((label): label is string => typeof label === 'string');
  function open(nextPanel: Panel) {
    setDraftFilters({ ...filters });
    setDraftSorting({ ...sorting });
    setPanel(nextPanel);
    setVisible(true);
  }
  // Preserve the existing clear-all behavior: filters and sorting reset together.
  function clear() {
    onApply({ ...DEFAULT_FILTERS }, { ...DEFAULT_SORTING });
    setDraftFilters({ ...DEFAULT_FILTERS });
    setDraftSorting({ ...DEFAULT_SORTING });
    setVisible(false);
  }
  function dismiss() {
    if (panel === 'projects') {
      setPanel('filters');
    } else {
      setVisible(false);
    }
  }
  return (
    <>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            count
              ? `Filtrar tarefas, ${count} ${
                  count === 1 ? 'filtro ativo' : 'filtros ativos'
                }`
              : 'Filtrar tarefas'
          }
          style={({ pressed }) => [
            styles.toolbarButton,
            pressed && styles.toolbarPressed,
          ]}
          onPress={() => open('filters')}
        >
          <Text style={styles.toolbarText}>
            {count ? `Filtrar · ${count}` : 'Filtrar'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ordenar tarefas"
          accessibilityState={{ selected: sorting.criterion !== 'none' }}
          style={({ pressed }) => [
            styles.toolbarButton,
            sorting.criterion !== 'none' && styles.selected,
            pressed && styles.toolbarPressed,
          ]}
          onPress={() => open('sorting')}
        >
          <Text
            style={[
              styles.toolbarText,
              sorting.criterion !== 'none' && styles.selectedText,
            ]}
          >
            Ordenar
          </Text>
        </Pressable>
        {changed && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpar filtros e ordenação"
            style={styles.clearButton}
            onPress={clear}
          >
            <Text style={styles.secondaryText}>Limpar</Text>
          </Pressable>
        )}
      </View>
      {activeLabels.length > 0 && (
        <View style={styles.activeFilters} accessibilityLiveRegion="polite">
          {activeLabels.map((label, index) => (
            <View key={`${index}-${label}`} style={styles.activeChip}>
              <Text style={styles.activeText}>{label}</Text>
            </View>
          ))}
        </View>
      )}
      <Modal visible={visible} animationType="slide" onRequestClose={dismiss}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {panel === 'projects'
                ? 'Projeto'
                : panel === 'filters'
                ? 'Filtros'
                : 'Ordenação'}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.clearButton}
              onPress={dismiss}
            >
              <Text style={styles.secondaryText}>
                {panel === 'projects' ? 'Voltar' : 'Cancelar'}
              </Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            {panel === 'projects' ? (
              <View style={styles.projectList}>
                {[
                  { id: null, name: 'Todos os projetos' },
                  { id: '', name: 'Sem projeto' },
                  ...projects,
                ].map(project => (
                  <Pressable
                    key={
                      project.id === null
                        ? 'all-projects'
                        : `project:${project.id}`
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Projeto: ${project.name}`}
                    accessibilityState={{
                      selected: draftFilters.projectId === project.id,
                    }}
                    style={[
                      styles.projectRow,
                      draftFilters.projectId === project.id && styles.selected,
                    ]}
                    onPress={() => {
                      setDraftFilters({
                        ...draftFilters,
                        projectId: project.id,
                      });
                      setPanel('filters');
                    }}
                  >
                    <Text
                      style={[
                        styles.projectName,
                        draftFilters.projectId === project.id &&
                          styles.selectedText,
                      ]}
                    >
                      {project.name}
                    </Text>
                    {draftFilters.projectId === project.id && (
                      <Text style={styles.selectedText}>✓</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            ) : panel === 'filters' ? (
              <>
                <Choices<TaskFilters['status']>
                  label="Status"
                  value={draftFilters.status}
                  options={STATUS}
                  onChange={status =>
                    setDraftFilters({ ...draftFilters, status })
                  }
                />
                <Choices<TaskFilters['priority']>
                  label="Prioridade"
                  value={draftFilters.priority}
                  options={PRIORITY}
                  onChange={priority =>
                    setDraftFilters({ ...draftFilters, priority })
                  }
                />
                <View style={styles.group}>
                  <Text style={styles.label}>Projeto</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Selecionar projeto: ${projectName(
                      draftFilters.projectId,
                    )}`}
                    accessibilityHint="Abre a lista de projetos"
                    style={styles.projectSelector}
                    onPress={() => setPanel('projects')}
                  >
                    <Text style={styles.projectName}>
                      {projectName(draftFilters.projectId)}
                    </Text>
                    <Text style={styles.secondaryText}>›</Text>
                  </Pressable>
                </View>
                <Choices<TaskFilters['period']>
                  label="Período"
                  value={draftFilters.period}
                  options={PERIOD}
                  onChange={period =>
                    setDraftFilters({ ...draftFilters, period })
                  }
                />
              </>
            ) : (
              <>
                <Choices<TaskSorting['criterion']>
                  label="Ordenação"
                  value={draftSorting.criterion}
                  options={SORTING}
                  onChange={criterion =>
                    setDraftSorting({ ...draftSorting, criterion })
                  }
                />
                {['priority', 'priorityDueDate', 'dueDatePriority'].includes(
                  draftSorting.criterion,
                ) && (
                  <Choices<TaskSorting['priorityDirection']>
                    label="Direção da prioridade"
                    value={draftSorting.priorityDirection}
                    options={[
                      ['desc', 'Alta → baixa'],
                      ['asc', 'Baixa → alta'],
                    ]}
                    onChange={priorityDirection =>
                      setDraftSorting({ ...draftSorting, priorityDirection })
                    }
                  />
                )}
                {['dueDate', 'priorityDueDate', 'dueDatePriority'].includes(
                  draftSorting.criterion,
                ) && (
                  <Choices<TaskSorting['dueDateDirection']>
                    label="Direção do prazo"
                    value={draftSorting.dueDateDirection}
                    options={[
                      ['asc', 'Mais próximo → mais distante'],
                      ['desc', 'Mais distante → mais próximo'],
                    ]}
                    onChange={dueDateDirection =>
                      setDraftSorting({ ...draftSorting, dueDateDirection })
                    }
                  />
                )}
              </>
            )}
          </ScrollView>
          {panel !== 'projects' && (
            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Limpar filtros e ordenação"
                style={styles.clearButton}
                onPress={clear}
              >
                <Text style={styles.secondaryText}>Limpar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.applyButton}
                onPress={() => {
                  onApply(draftFilters, draftSorting);
                  setVisible(false);
                }}
              >
                <Text style={styles.applyText}>
                  {panel === 'filters'
                    ? 'Aplicar filtros'
                    : 'Aplicar ordenação'}
                </Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  toolbarButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
  },
  toolbarPressed: { opacity: 0.7, borderColor: COLORS.primary },
  toolbarText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  clearButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  activeChip: {
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  activeText: { color: COLORS.primary, fontSize: 12 },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  content: { padding: SPACING.lg },
  group: { marginBottom: SPACING.xl },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  selected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  selectedText: { color: COLORS.primary, fontWeight: '700' },
  projectSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 48,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  projectName: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  projectList: { gap: SPACING.sm },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footer: {
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  applyButton: {
    minHeight: 48,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 1,
  },
  applyText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.surface,
    textAlign: 'center',
  },
});
