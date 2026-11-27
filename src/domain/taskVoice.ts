import { civilDateKey, isCivilDate } from './localCivilDate';

type Priority = 'low' | 'medium' | 'high';
export type VoiceDraft = { title: string; dueDate?: string; priority?: Priority; warning?: string };
type VoiceInterpretation = { ok: false; message: string } | { ok: true; draft: VoiceDraft };

const WEEKDAYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const PRIORITIES: Readonly<Record<string, Priority | undefined>> = {
  baixa: 'low',
  media: 'medium',
  alta: 'high',
};
const DATE = /(?:^|[\s,])(?:(?:para(?: o dia)?|at[eé](?: o dia)?|no dia|dia|em|na|no)\s+)?(depois de amanh[ãa]|amanh[ãa]|hoje|domingo|s[áa]bado|(?:segunda|ter[çc]a|quarta|quinta|sexta)(?:[- ]feira)?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)$/i;
const PRIORITY = /(?:^|[\s,])prioridade\s+(baixa|m[ée]dia|alta)$/i;
const SEPARATOR = /[\s,;:.!?]+$/;
const CONNECTOR = /(?:^|\s)(?:e|ou|n[aã]o)$/i;

function fold(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function resolveDate(value: string, now: Date): string | undefined {
  const token = fold(value).replace(/[- ]feira$/, '');
  if (token.includes('/')) {
    const [day, month, year = String(now.getFullYear())] = token.split('/');
    const key = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return isCivilDate(key) && key >= civilDateKey(now) ? key : undefined;
  }
  const weekday = WEEKDAYS.indexOf(token);
  const days = weekday >= 0
    ? (weekday - now.getDay() + 7) % 7 || 7
    : token === 'hoje' ? 0 : token === 'amanha' ? 1 : 2;
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return civilDateKey(date);
}

export function interpretTaskVoice(transcript: string, now: Date): VoiceInterpretation {
  if (!transcript.trim()) {return {ok: false, message: 'Informe uma transcrição para interpretar.'};}
  if (transcript.length > 500) {return {ok: false, message: 'Use até 500 caracteres na transcrição.'};}

  const original = transcript.trim();
  let title = original.normalize('NFC').replace(/\s+/g, ' ').replace(SEPARATOR, '');
  let dateToken: string | undefined;
  let priority: Priority | undefined;

  const ambiguous = (): VoiceInterpretation => ({
    ok: true,
    draft: {
      title: original,
      warning: 'Prazo ou prioridade ambíguos. Revise e selecione os campos manualmente.',
    },
  });

  while (title) {
    const dateMatch = DATE.exec(title);
    const priorityMatch = PRIORITY.exec(title);
    const match = dateMatch ?? priorityMatch;
    if (!match) {break;}
    let remainder = title.slice(0, match.index).replace(SEPARATOR, '');
    const beforeAnd = remainder.replace(/\s+e$/i, '');
    // An "e" can join two qualifiers, but must not truncate a title.
    if (beforeAnd !== remainder && (DATE.test(beforeAnd) || PRIORITY.test(beforeAnd))) {
      remainder = beforeAnd;
    }
    if (CONNECTOR.test(remainder) || (dateMatch ? dateToken : priority)) {
      return ambiguous();
    }
    if (dateMatch) {dateToken = dateMatch[1];}
    else {priority = PRIORITIES[fold(match[1])];}
    title = remainder;
  }

  if (!title) {return {ok: false, message: 'Inclua um título na transcrição.'};}
  const dueDate = dateToken ? resolveDate(dateToken, now) : undefined;
  if (dateToken && !dueDate) {
    return {ok: true, draft: {title: original, warning: 'Prazo inválido ou anterior a hoje. Selecione o prazo manualmente.'}};
  }
  return {ok: true, draft: {title: dateToken || priority ? title : original, ...(dueDate ? {dueDate} : {}), ...(priority ? {priority} : {})}};
}
