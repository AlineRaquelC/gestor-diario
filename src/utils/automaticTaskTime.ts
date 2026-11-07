/** HH:mm do próximo minuto, inclusive quando o relógio está no minuto exato. */
export function nextMinuteTime(now: Date): string {
  const next = new Date(now.getTime());
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);
  return `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
}

export function millisecondsToNextMinute(now: Date): number {
  return 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
}
