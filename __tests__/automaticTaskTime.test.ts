import { nextMinuteTime, millisecondsToNextMinute } from '../src/utils/automaticTaskTime';

test.each([0, 20, 37])('próximo minuto com segundos %s', seconds => {
  const now = new Date(2026, 10, 4, 10, 17, seconds);
  expect(nextMinuteTime(now)).toBe('10:18');
  expect(millisecondsToNextMinute(now)).toBe(60000 - seconds * 1000);
});
test('virada de dia e milissegundos', () => {
  const now = new Date(2026, 10, 4, 23, 59, 59, 999);
  expect(nextMinuteTime(now)).toBe('00:00');
  expect(millisecondsToNextMinute(now)).toBe(1);
});
