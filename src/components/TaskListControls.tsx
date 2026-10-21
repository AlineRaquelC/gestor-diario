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

type Props = {
  filters: TaskFilters;
  sorting: TaskSorting;
  projects: { id: string; name: string }[];
  onApply: (filters: TaskFilters, sorting: TaskSorting) => void;
};

function Choices<T extends string | null>({
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
            key={id ?? 'all-projects'}
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
  const [draftFilters, setDraftFilters] = useState(filters);
  const [draftSorting, setDraftSorting] = useState(sorting);
  const count = activeFilterCount(filters);
  const changed = count > 0 || sorting.criterion !== 'none';
  function clear() {
    onApply({ ...DEFAULT_FILTERS }, { ...DEFAULT_SORTING });
    setDraftFilters({ ...DEFAULT_FILTERS });
    setDraftSorting({ ...DEFAULT_SORTING });
    setVisible(false);
  }
  return (
    <>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filtrar e ordenar tarefas"
          style={styles.chip}
          onPress={() => {
            setDraftFilters({ ...filters });
            setDraftSorting({ ...sorting });
            setVisible(true);
          }}
        >
          <Text style={styles.chipText}>Filtrar e ordenar</Text>
        </Pressable>
        {changed && (
          <Pressable accessibilityRole="button" onPress={clear}>
            <Text style={styles.chipText}>Limpar filtros</Text>
          </Pressable>
        )}
      </View>
      {changed && (
        <Text style={styles.hint} accessibilityLiveRegion="polite">
          {count > 0 ? `Filtros ativos: ${count}` : 'Ordenação ativa'}
          {count > 0 && sorting.criterion !== 'none'
            ? ' · Ordenação ativa'
            : ''}
        </Text>
      )}
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>Filtrar e ordenar</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setVisible(false)}
            >
              <Text style={styles.chipText}>Cancelar</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Choices<TaskFilters['status']>
              label="Status"
              value={draftFilters.status}
              options={[
                ['all', 'Todos'],
                ['todo', 'Pendentes'],
                ['in_progress', 'Parciais'],
                ['completed', 'Concluídas'],
              ]}
              onChange={status => setDraftFilters({ ...draftFilters, status })}
            />
            <Choices<TaskFilters['priority']>
              label="Prioridade"
              value={draftFilters.priority}
              options={[
                ['all', 'Todas'],
                ['high', 'Alta'],
                ['medium', 'Média'],
                ['low', 'Baixa'],
              ]}
              onChange={priority =>
                setDraftFilters({ ...draftFilters, priority })
              }
            />
            <Choices<string | null>
              label="Projeto"
              value={draftFilters.projectId}
              options={[
                [null, 'Todos os projetos'],
                ['', 'Sem projeto'],
                ...projects.map(project => [project.id, project.name] as const),
              ]}
              onChange={projectId =>
                setDraftFilters({ ...draftFilters, projectId })
              }
            />
            <Choices<TaskFilters['period']>
              label="Período"
              value={draftFilters.period}
              options={[
                ['all', 'Todos'],
                ['today', 'Hoje'],
                ['week', 'Semana'],
                ['month', 'Mês'],
              ]}
              onChange={period => setDraftFilters({ ...draftFilters, period })}
            />
            <Text style={styles.hint}>
              Por prazo; sem prazo válido, usa a data de início. Semana de
              segunda a domingo.
            </Text>
            <Choices<TaskSorting['criterion']>
              label="Ordenação"
              value={draftSorting.criterion}
              options={[
                ['none', 'Padrão'],
                ['priority', 'Prioridade'],
                ['dueDate', 'Prazo'],
                ['priorityDueDate', 'Prioridade, depois prazo'],
                ['dueDatePriority', 'Prazo, depois prioridade'],
              ]}
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
          </ScrollView>
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={clear}
              style={styles.chip}
            >
              <Text style={styles.chipText}>Restaurar padrão</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.chip, styles.selected]}
              onPress={() => {
                onApply(draftFilters, draftSorting);
                setVisible(false);
              }}
            >
              <Text style={styles.selectedText}>Aplicar</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  header: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1E1B3A' },
  content: { padding: 18 },
  group: { marginBottom: 20 },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E1B3A',
    marginBottom: 10,
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#F3F2FF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
  },
  selected: { backgroundColor: '#5C4DFF' },
  chipText: { color: '#5C4DFF', fontWeight: '600' },
  selectedText: { color: '#FFFFFF', fontWeight: '600' },
  hint: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  footer: {
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
});
