import { describe, expect, it } from 'vitest';
import { addCivilDays, civilDate, civilDuration, materializationWindow, occurrenceDates, recurrenceSlots, referenceDay } from '../src/domain/recurrence/index.js';
import type { RecurrenceFrequency } from '../src/domain/recurrence/index.js';
const clock = (day: string) => () => Date.parse(`${day}T12:00:00Z`);
const rule = (frequency: RecurrenceFrequency = 'DAILY', anchorDate = '2026-10-29', materializedThrough: string | null = null, timeZone = 'America/Sao_Paulo') => ({ frequency, anchorDate, materializedThrough, timeZone });

it('janela inclusiva hoje + 31 tem 32 datas nominais e entrada repetida é determinística', () => {
  const input = rule(); const now = clock('2026-10-29');
  const result = recurrenceSlots(input, now);
  expect(result).toMatchObject({ today: '2026-10-29', start: '2026-10-29', end: '2026-11-29' });
  expect(result.slots).toHaveLength(32); expect(result.slots[0]).toBe('2026-10-29'); expect(result.slots.at(-1)).toBe('2026-11-29');
  expect(recurrenceSlots(input, now)).toEqual(result); expect(input).toEqual(rule());
});
it('NONE não gera slots', () => {expect(recurrenceSlots(rule('NONE'), clock('2026-10-29')).slots).toEqual([]);});
it.each([
  ['2026-12-31', '2027-01-01'], ['2027-02-28', '2027-03-01'], ['2028-02-28', '2028-02-29'],
  ['2028-02-29', '2028-03-01'], ['2026-10-31', '2026-11-01'],
])('DAILY muda calendário civil %s → %s', (day, next) => {
  expect(recurrenceSlots(rule('DAILY', day), clock(day)).slots.slice(0, 2)).toEqual([day, next]);
});
it('DAILY atravessa DST sem alterar dia nominal', () => {
  const slots = recurrenceSlots(rule('DAILY', '2027-03-13', null, 'America/New_York'), clock('2027-03-13')).slots;
  expect(slots.slice(0, 4)).toEqual(['2027-03-13', '2027-03-14', '2027-03-15', '2027-03-16']);
});
it('WEEKLY parte da fase original sem percorrer histórico ou depender da semana visual', () => {
  expect(recurrenceSlots(rule('WEEKLY', '1900-01-04'), clock('2026-10-29')).slots)
    .toEqual(['2026-10-29', '2026-11-05', '2026-11-12', '2026-11-19', '2026-11-26']);
});
it('WEEKLY alinha início que não coincide com weekday da âncora', () => {
  expect(recurrenceSlots(rule('WEEKLY'), clock('2026-10-30')).slots[0]).toBe('2026-11-05');
});
it('MONTHLY usa a âncora original, sem drift após fevereiro', () => {
  const slots = ['2027-01-01', '2027-02-01', '2027-03-01', '2027-04-01', '2027-05-01']
    .flatMap(day => recurrenceSlots(rule('MONTHLY', '2027-01-31'), clock(day)).slots);
  expect(slots).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31']);
});
describe.each([2027, 2028])('fevereiro em %s', year => {
  it.each([28, 29, 30, 31])('âncora %s limita apenas o mês curto', day => {
    const anchor = `${year}-01-${day}`;
    expect(recurrenceSlots(rule('MONTHLY', anchor), clock(`${year}-02-01`)).slots)
      .toEqual([`${year}-02-${Math.min(day, year === 2028 ? 29 : 28)}`]);
    expect(recurrenceSlots(rule('MONTHLY', anchor), clock(`${year}-03-01`)).slots).toEqual([`${year}-03-${day}`]);
  });
});
it('MONTHLY muda o ano sem perder âncora', () => {
  expect(recurrenceSlots(rule('MONTHLY', '2026-12-31'), clock('2027-01-01')).slots).toEqual(['2027-01-31']);
});
it('cobertura concluída não gera novamente; dia seguinte acrescenta somente extensão', () => {
  expect(recurrenceSlots(rule('DAILY', '2026-10-29', '2026-11-29'), clock('2026-10-29')).slots).toEqual([]);
  expect(recurrenceSlots(rule('DAILY', '2026-10-29', '2026-11-29'), clock('2026-10-30')).slots).toEqual(['2026-11-30']);
});
it.each([null, '1900-01-01', '2026-10-20', '2026-10-28'])('não faz backfill com cobertura %s', coverage => {
  const slots = recurrenceSlots(rule('DAILY', '1900-01-01', coverage), clock('2026-10-29')).slots;
  expect(slots[0]).toBe('2026-10-29'); expect(slots).toHaveLength(32);
});
it('âncora futura fora da janela não gera e cobertura posterior à janela não regride', () => {
  expect(recurrenceSlots(rule('DAILY', '2026-12-01'), clock('2026-10-29')).slots).toEqual([]);
  expect(materializationWindow('UTC', '9999-12-31', clock('2026-10-29')).start).toBeNull();
});
it('data de referência é da série, independente da zona do servidor', () => {
  const now = () => Date.parse('2026-10-29T01:00:00Z');
  expect(referenceDay('America/Sao_Paulo', now)).toBe('2026-10-28');
  expect(referenceDay('Asia/Tokyo', now)).toBe('2026-10-29');
});
it('preserva duração civil start/due entre ocorrências', () => {
  const duration = civilDuration('2026-10-29', '2026-10-31'); expect(duration).toBe(2);
  expect(occurrenceDates('2026-11-01', duration)).toEqual({ startDate: '2026-10-30', dueDate: '2026-11-01' });
  expect(civilDuration('2027-03-13', '2027-03-15')).toBe(2);
  expect(civilDuration('2028-02-28', '2028-03-01')).toBe(2);
});
it.each(['2027-02-29', '2026-04-31', '2026-13-01', '1899-12-31', '10000-01-01', '2026-1-01', 'invalid'])('rejeita data civil inválida %s', value => {expect(() => civilDate(value)).toThrow();});
it.each(['Invalid/Zone', '+03:00', ''])('rejeita timezone %s', zone => {expect(() => referenceDay(zone, clock('2026-10-29'))).toThrow();});
it('rejeita duração, referência e limites inválidos', () => {
  expect(() => civilDuration('2026-10-30', '2026-10-29')).toThrow();
  expect(() => occurrenceDates('2026-10-29', -1)).toThrow(); expect(() => occurrenceDates('2026-10-29', 0.5)).toThrow();
  expect(() => referenceDay('UTC', () => NaN)).toThrow(); expect(() => addCivilDays('9999-12-31', 1)).toThrow();
  expect(() => recurrenceSlots(rule('OTHER' as RecurrenceFrequency), clock('2026-10-29'))).toThrow();
});
