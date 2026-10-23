import {MAX_REMINDERS, normalizeOffsets, toOffsetMinutes, resolveTaskInstant, resolveReminderSchedule, validateReminderChange, sameReminderTiming, ReminderTiming, ReminderUnit} from '../src/domain/reminders';

const now = () => Date.parse('2026-10-24T12:00:00Z');
const timing = (time = '09:01', offsets = [0], dueDate = '2026-10-24'): ReminderTiming => ({dueDate, time, timeZone: 'America/Sao_Paulo', offsets});

describe('reminder domain U01–U06', () => {
  test.each([[15, 'minutes', 15], [1, 'hours', 60], [1, 'days', 1440]] as const)('converts %s %s', (amount, unit, expected) => {
    expect(toOffsetMinutes(amount, unit)).toBe(expected);
  });
  test('zero is the explicit no-offset value; normalization is deterministic and immutable', () => {
    const source = [1440, 30, 0, 60, 15];
    expect(normalizeOffsets(source)).toEqual([0, 15, 30, 60, 1440]);
    expect(source).toEqual([1440, 30, 0, 60, 15]);
    expect(MAX_REMINDERS).toBe(5);
  });
  test.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])('rejects invalid offset %s', value => {
    expect(() => normalizeOffsets([value])).toThrow();
  });
  test.each([0, -1, 1.5, Infinity])('rejects invalid amount %s', amount => {
    expect(() => toOffsetMinutes(amount, 'hours')).toThrow();
  });
  test('rejects unknown units, duplicates and excess items', () => {
    expect(() => toOffsetMinutes(1, 'weeks' as ReminderUnit)).toThrow();
    expect(() => normalizeOffsets([60, toOffsetMinutes(1, 'hours')])).toThrow();
    expect(() => normalizeOffsets([0, 1, 2, 3, 4, 5])).toThrow();
  });
  test('uses dueDate + time in an explicit zone, independent of device zone', () => {
    expect(resolveTaskInstant('2026-10-24', '09:01', 'America/Sao_Paulo')).toBe(Date.parse('2026-10-24T12:01:00Z'));
    expect(resolveTaskInstant('2026-10-24', '09:01', 'Asia/Kathmandu')).toBe(Date.parse('2026-10-24T03:16:00Z'));
  });
  test.each([
    ['2026-02-30', '09:00', 'UTC'], ['2026-10-24', '', 'UTC'],
    ['2026-10-24', '24:00', 'UTC'], ['2026-10-24', '9:00', 'UTC'],
    ['2026-10-24', '09:00', 'invalid/zone'], ['2026-10-24', '09:00', ''],
    ['2026-03-08', '02:30', 'America/New_York'],
    ['2026-11-01', '01:30', 'America/New_York'],
    ['2026-10-04', '02:15', 'Australia/Lord_Howe'],
    ['2011-12-30', '12:00', 'Pacific/Apia'],
  ])('rejects invalid or ambiguous civil time %s %s %s', (date, time, zone) => {
    expect(() => resolveTaskInstant(date, time, zone)).toThrow();
  });
  test('A: past task time', () => expect(() => validateReminderChange(timing('08:45'), undefined, now)).toThrow('horário da tarefa já passou'));
  test('B: future task but past trigger', () => expect(() => validateReminderChange(timing('09:10', [15]), undefined, now)).toThrow('Reduza a antecedência'));
  test('C: zero future allowed; equality rejected', () => {
    expect(validateReminderChange(timing(), undefined, now)[0].expired).toBe(false);
    expect(() => validateReminderChange(timing('09:00'), undefined, now)).toThrow();
  });
  test('D: day lead is 1440 elapsed minutes; equality rejected', () => {
    expect(() => validateReminderChange(timing('09:00', [1440], '2026-10-25'), undefined, now)).toThrow();
    expect(validateReminderChange(timing('09:10', [1440], '2026-10-25'), undefined, now)[0].triggerAt).toBe(now() + 600000);
    const dst = resolveReminderSchedule('2026-03-08', '09:00', 'America/New_York', 1440, now);
    expect(dst.anchorAt - dst.triggerAt).toBe(86400000);
    expect(new Date(dst.triggerAt).toISOString()).toBe('2026-03-07T13:00:00.000Z');
  });
  test('E: future multiple offsets', () => {
    const result = validateReminderChange(timing('10:00', [60, 0, 15], '2026-10-26'), undefined, now);
    expect(result.map(item => item.offsetMinutes)).toEqual([0, 15, 60]);
    expect(result.every(item => !item.expired)).toBe(true);
  });
  test('F: retain expired configuration without retroactive scheduling', () => {
    const existing = timing('08:45', [15, 0]);
    expect(validateReminderChange({...existing}, existing, now).every(item => item.expired)).toBe(true);
    expect(() => validateReminderChange({...existing, offsets: [0, 30]}, existing, now)).toThrow();
    expect(validateReminderChange({...existing, offsets: [0]}, existing, now)).toHaveLength(1);
    expect(validateReminderChange({...existing, offsets: []}, existing, now)).toEqual([]);
    expect(() => validateReminderChange({...existing, time: '08:46'}, existing, now)).toThrow();
  });
  test('idempotence compares effective timing, not order or unrelated fields', () => {
    expect(sameReminderTiming(timing('10:00', [0, 15]), timing('10:00', [15, 0]))).toBe(true);
    expect(sameReminderTiming(timing(), timing('09:02'))).toBe(false);
    expect(sameReminderTiming(timing(), {...timing(), timeZone: 'UTC'})).toBe(false);
  });
  test('rejects invalid clock and out-of-calendar trigger', () => {
    expect(() => resolveReminderSchedule('2026-10-24', '09:00', 'UTC', 0, () => NaN)).toThrow();
    expect(() => resolveReminderSchedule('1900-01-01', '09:00', 'UTC', 150000000000, now)).toThrow();
  });
});
