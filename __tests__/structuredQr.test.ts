import {
  parseStructuredQr,
  utf8ByteLength,
  QR_PAYLOAD_MAX_BYTES,
  isCivilDate,
  qrDraftDates,
  civilDateToLocal,
} from '../src/domain/structuredQr';

const now = new Date(2026, 10, 17, 12);
const valid = { version: 1, title: 'Comprar material' };
const parse = (value: unknown) => parseStructuredQr(JSON.stringify(value), now);
const draft = (value: unknown) => {
  const result = parse(value);
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.draft;
};

test('V1 só produz rascunho, com campos canônicos e datas civis sem horário inventado', () => {
  expect(
    draft({
      ...valid,
      title: ' Café ',
      description: ' Loja ',
      startDate: '2026-11-19',
      dueDate: '2026-11-20',
      priority: 'high',
    }),
  ).toEqual({
    title: 'Café',
    description: 'Loja',
    startDate: '2026-11-19',
    dueDate: '2026-11-20',
    priority: 'high',
    warnings: [],
  });
  expect(draft(valid)).toEqual({ title: 'Comprar material', warnings: [] });
});
test.each(['low', 'medium', 'high'])('prioridade canônica %s', priority => {
  expect(draft({ ...valid, priority }).priority).toBe(priority);
});
test.each([
  '',
  ' ',
  'https://example.com',
  '{',
  '{"version":1,}',
  'null',
  '[]',
  'true',
  '1',
])('rejeita vazio/texto/JSON incompatível: %s', text => {
  expect(parseStructuredQr(text, now).ok).toBe(false);
});
test.each([undefined, 0, 2, '1', null, true])(
  'rejeita versão %s sem assumir V1',
  version => {
    const result = parse({ ...valid, version });
    expect(result).toEqual({
      ok: false,
      message: expect.stringContaining('Versão'),
    });
  },
);
test.each([undefined, '', '   ', 7, {}, null, 'a'.repeat(121)])(
  'rejeita título inválido',
  title => {
    expect(parse({ ...valid, title }).ok).toBe(false);
  },
);
test.each([null, 9, {}, ['text'], 'a'.repeat(1001)])(
  'rejeita descrição inválida',
  description => {
    expect(parse({ ...valid, description }).ok).toBe(false);
  },
);
test.each([
  'id',
  'remoteId',
  'clientId',
  'projectId',
  'recurrenceSeriesId',
  'status',
  'done',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'reminders',
  'subtasks',
  'notes',
  '__proto__',
  'constructor',
  'prototype',
  'url',
])('rejeita campo desconhecido/de autoridade %s', key => {
  const result = parse({ ...valid, [key]: 'não confiar' });
  expect(result).toEqual({
    ok: false,
    message: expect.stringContaining('campos não suportados'),
  });
});
test('detecta chaves repetidas inclusive escapes e não confunde pontuação em strings', () => {
  expect(
    parseStructuredQr('{"version":1,"title":"A","title":"B"}', now).ok,
  ).toBe(false);
  expect(
    parseStructuredQr(
      String.raw`{"version":1,"title":"A","\u0074itle":"B"}`,
      now,
    ).ok,
  ).toBe(false);
  const literal = 'aspas " vírgula , chave } e barra \\';
  expect(draft({ ...valid, title: literal }).title).toBe(literal);
});
test('limita bytes UTF-8 antes de JSON.parse e rejeita entradas multibyte grandes', () => {
  expect(utf8ByteLength('aé中😀')).toBe(10);
  expect(utf8ByteLength('\ud800')).toBe(3);
  const spy = jest.spyOn(JSON, 'parse');
  const before = spy.mock.calls.length;
  expect(parseStructuredQr(' '.repeat(QR_PAYLOAD_MAX_BYTES + 1), now).ok).toBe(
    false,
  );
  expect(parseStructuredQr('😀'.repeat(600), now).ok).toBe(false);
  expect(spy.mock.calls.length).toBe(before);
  spy.mockRestore();
});
test('aceita exatamente 2048 bytes e rejeita um byte a mais', () => {
  const raw = JSON.stringify(valid);
  const exact = raw + ' '.repeat(QR_PAYLOAD_MAX_BYTES - utf8ByteLength(raw));
  expect(parseStructuredQr(exact, now).ok).toBe(true);
  expect(parseStructuredQr(exact + ' ', now).ok).toBe(false);
});
test.each([
  '2026-02-29',
  '2026-02-31',
  '2026-13-01',
  '2026-00-01',
  '2026-11-00',
  '0000-01-01',
  '2026-1-01',
  '2026-11-20T12:00:00Z',
  null,
  {},
  20261120,
])('datas inválidas geram aviso e não substituem campo: %s', dueDate => {
  const value = draft({ ...valid, dueDate });
  expect(value.dueDate).toBeUndefined();
  expect(value.warnings).toEqual([expect.stringContaining('Prazo inválido')]);
});
test('bissextos e limite de dia civil', () => {
  expect(isCivilDate('2000-02-29')).toBe(true);
  expect(isCivilDate('1900-02-29')).toBe(false);
  expect(isCivilDate('2028-02-29')).toBe(true);
  expect(draft({ ...valid, dueDate: '2026-11-17' }).dueDate).toBe('2026-11-17');
  expect(draft({ ...valid, dueDate: '2026-11-16' }).dueDate).toBeUndefined();
});
test('não inventa valores para prioridade inválida e datas invertidas', () => {
  const value = draft({
    ...valid,
    priority: 'urgent',
    startDate: '2026-11-22',
    dueDate: '2026-11-20',
  });
  expect(value.priority).toBeUndefined();
  expect(value.startDate).toBeUndefined();
  expect(value.dueDate).toBeUndefined();
  expect(value.warnings).toHaveLength(2);
});
test('HTML/URL/código em campo textual são apenas texto inerte', () => {
  const text = '<script>alert(1)</script> https://example.com';
  // eslint-disable-next-line no-script-url -- Deliberately hostile fixture, never executed.
  const hostileDescription = 'javascript:deleteAll()';
  expect(
    draft({ ...valid, title: text, description: hostileDescription }),
  ).toEqual({
    title: text,
    description: hostileDescription,
    warnings: [],
  });
});
test('merge de datas não ajusta campo ausente nem aplica prazo anterior ao início atual', () => {
  const start = new Date(2026, 10, 25);
  const due = new Date(2026, 10, 26);
  const result = qrDraftDates(
    draft({ ...valid, dueDate: '2026-11-20' }),
    start,
    due,
    now,
  );
  expect(result).toEqual({
    start,
    due,
    warning: expect.stringContaining('Nenhuma data'),
  });
  const merged = qrDraftDates(
    draft({ ...valid, dueDate: '2026-11-27' }),
    start,
    due,
    now,
  );
  expect(merged.start).toBe(start);
  expect(merged.due.getDate()).toBe(27);
  expect(merged.warning).toBeUndefined();
  expect(civilDateToLocal('2026-11-20').getHours()).toBe(0);
  expect(civilDateToLocal('0099-01-01').getFullYear()).toBe(99);
});
