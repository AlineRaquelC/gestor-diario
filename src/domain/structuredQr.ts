import { civilDateKey, civilDateToLocal, isCivilDate } from './localCivilDate';
import type { ExternalTaskDraft } from '../models/externalTaskDraft';

export const QR_PAYLOAD_MAX_BYTES = 2048;
export const QR_TITLE_MAX_LENGTH = 120;
export const QR_DESCRIPTION_MAX_LENGTH = 1000;
export const QR_V1_FIELDS = [
  'version',
  'title',
  'description',
  'startDate',
  'dueDate',
  'priority',
] as const;

/** Public V1 schema. Dates/priority can be omitted with warnings for manual correction. */
export type StructuredQrV1 = {
  version: 1;
  title: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
};
export type QrParseResult =
  | { ok: true; draft: ExternalTaskDraft }
  | { ok: false; message: string };

export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const point = char.codePointAt(0)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

// JSON.parse has already validated syntax. Scan strings/depth, not a regex over JSON:
// decoded root keys catch duplicates even when escaped (e.g. title and \u0074itle).
function hasDuplicateRootKeys(text: string): boolean {
  const keys = new Set<string>();
  let depth = 0;
  let expectingKey = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      const start = i++;
      while (i < text.length) {
        if (text[i] === '\\') {
          i += 2;
          continue;
        }
        if (text[i] === '"') {
          break;
        }
        i++;
      }
      if (depth === 1 && expectingKey) {
        const key = JSON.parse(text.slice(start, i + 1)) as string;
        if (keys.has(key)) {
          return true;
        }
        keys.add(key);
        expectingKey = false;
      }
    } else if (char === '{' || char === '[') {
      depth++;
      if (depth === 1) {
        expectingKey = true;
      }
    } else if (char === '}' || char === ']') {
      depth--;
    } else if (char === ',' && depth === 1) {
      expectingKey = true;
    }
  }
  return false;
}

export { civilDateKey, civilDateToLocal, isCivilDate } from './localCivilDate';

export function parseStructuredQr(
  raw: string,
  now: Date = new Date(),
): QrParseResult {
  const fail = (message: string): QrParseResult => ({ ok: false, message });
  // Code-unit check avoids spending time counting an unbounded string.
  if (
    raw.length > QR_PAYLOAD_MAX_BYTES ||
    utf8ByteLength(raw) > QR_PAYLOAD_MAX_BYTES
  ) {
    return fail('Este QR Code excede o limite de 2048 bytes.');
  }
  if (!raw.trim()) {
    return fail('O QR Code está vazio. Tente novamente ou digite a tarefa.');
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fail(
      'Este QR Code não contém uma tarefa em JSON válido e compatível.',
    );
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return fail('Este QR Code não contém uma tarefa em formato compatível.');
  }
  if (hasDuplicateRootKeys(raw)) {
    return fail('Este QR Code contém campos repetidos.');
  }
  const values = data as Record<string, unknown>;
  if (
    Object.keys(values).some(
      key => !(QR_V1_FIELDS as readonly string[]).includes(key),
    )
  ) {
    return fail(
      'Este QR Code contém campos não suportados. IDs e projetos externos não são aceitos.',
    );
  }
  if (!Object.hasOwn(values, 'version') || values.version !== 1) {
    return fail('Versão de QR Code não suportada. Use version = 1.');
  }
  if (
    !Object.hasOwn(values, 'title') ||
    typeof values.title !== 'string' ||
    !values.title.trim() ||
    values.title.trim().length > QR_TITLE_MAX_LENGTH
  ) {
    return fail('O título do QR Code deve conter de 1 a 120 caracteres.');
  }
  const draft: ExternalTaskDraft = { title: values.title.trim(), warnings: [] };
  if (Object.hasOwn(values, 'description')) {
    if (
      typeof values.description !== 'string' ||
      values.description.length > QR_DESCRIPTION_MAX_LENGTH
    ) {
      return fail(
        'A descrição do QR Code deve ser texto de até 1000 caracteres.',
      );
    }
    draft.description = values.description.trim();
  }
  const today = civilDateKey(now);
  for (const [key, label] of [
    ['startDate', 'Data de início'],
    ['dueDate', 'Prazo'],
  ] as const) {
    if (!Object.hasOwn(values, key)) {
      continue;
    }
    const value = values[key];
    if (!isCivilDate(value) || value < today) {
      draft.warnings.push(
        `${label} inválido(a) ou no passado. O valor atual será mantido; revise as datas.`,
      );
    } else {
      draft[key] = value;
    }
  }
  if (draft.startDate && draft.dueDate && draft.startDate > draft.dueDate) {
    delete draft.startDate;
    delete draft.dueDate;
    draft.warnings.push(
      'O prazo veio antes do início. As datas atuais serão mantidas; revise-as.',
    );
  }
  if (Object.hasOwn(values, 'priority')) {
    const priority = values.priority;
    if (priority === 'low' || priority === 'medium' || priority === 'high') {
      draft.priority = priority;
    } else {
      draft.warnings.push(
        'Prioridade inválida. A prioridade atual será mantida; revise-a.',
      );
    }
  }
  return { ok: true, draft };
}

/** Merge only civil dates that also fit the existing form. No implicit date adjustment. */
export function qrDraftDates(
  draft: ExternalTaskDraft,
  start: Date,
  due: Date,
  now: Date = new Date(),
) {
  const proposedStart = draft.startDate ?? civilDateKey(start);
  const proposedDue = draft.dueDate ?? civilDateKey(due);
  if (
    (draft.startDate || draft.dueDate) &&
    (proposedStart < civilDateKey(now) || proposedDue < proposedStart)
  ) {
    return {
      start,
      due,
      warning:
        'As datas do QR não combinam com as datas atuais. Nenhuma data foi substituída; revise início e prazo.',
    };
  }
  return {
    start: draft.startDate ? civilDateToLocal(draft.startDate) : start,
    due: draft.dueDate ? civilDateToLocal(draft.dueDate) : due,
    warning: undefined,
  };
}
