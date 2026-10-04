import type { TaskHistoryEvent } from '../services/taskService';

const presentation = {
  CREATED: { emoji: '🆕', title: 'Tarefa criada' },
  UPDATED: { emoji: '✎', title: 'Tarefa atualizada' },
  STATUS_CHANGED: { emoji: '↔', title: 'Status alterado' },
  COMPLETED: { emoji: '✅', title: 'Tarefa concluída' },
  REOPENED: { emoji: '↩', title: 'Tarefa reaberta' },
};
const labels: Record<string, string> = { PENDING: 'A fazer', PARTIAL: 'Em andamento', COMPLETED: 'Concluída' };
export function presentTaskHistory(event: TaskHistoryEvent) {
  const from = typeof event.metadata?.from === 'string' ? labels[event.metadata.from] : undefined;
  const to = typeof event.metadata?.to === 'string' ? labels[event.metadata.to] : undefined;
  const date = new Date(event.createdAt);
  return {
    ...presentation[event.action],
    description: from && to ? `${from} → ${to}` : '',
    time: Number.isNaN(date.getTime()) ? 'Data indisponível' : date.toLocaleString('pt-BR'),
  };
}
