import type { SchedulingResult } from '../services/reminderScheduler';
export const REMINDER_PRESETS = [0, 15, 30, 60, 1440];
export function formatReminder(offset: number): string {
  if (offset === 0) {
    return 'No horário';
  }
  if (offset % 1440 === 0) {
    const days = offset / 1440;
    return `${days} ${days === 1 ? 'dia' : 'dias'} antes`;
  }
  if (offset % 60 === 0) {
    const hours = offset / 60;
    return `${hours} ${hours === 1 ? 'hora' : 'horas'} antes`;
  }
  return `${offset} min antes`;
}
export function taskSavedFeedback(
  edit: boolean,
  cacheSaved: boolean,
  scheduling: SchedulingResult,
): string {
  const message =
    scheduling.state === 'scheduled'
      ? edit
        ? 'Alterações salvas e lembrete agendado.'
        : 'Tarefa criada e lembrete agendado.'
      : scheduling.state === 'not_required'
      ? edit
        ? 'A tarefa foi atualizada com sucesso.'
        : 'Tarefa criada com sucesso.'
      : edit
      ? 'Alterações salvas, mas o lembrete não foi agendado neste aparelho.'
      : 'Tarefa salva, mas o lembrete não foi agendado neste aparelho.';
  return (
    message + (cacheSaved ? '' : ' O cache local falhou. Não envie novamente.')
  );
}
