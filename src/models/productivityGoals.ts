export const GOAL_LIMIT = 10000;
export type GoalPeriod = 'daily' | 'weekly' | 'monthly';
export type ProductivityGoals = Record<GoalPeriod, number | null> & {
  updatedAt: string;
};
export const GOAL_PERIODS: readonly GoalPeriod[] = [
  'daily',
  'weekly',
  'monthly',
];
export function validGoal(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value > 0 &&
      value <= GOAL_LIMIT)
  );
}
export function parseGoalInput(input: string): number {
  const value = input.trim();
  if (!/^\d+$/.test(value) || !validGoal(Number(value))) {
    throw new Error(`Informe um número inteiro de 1 a ${GOAL_LIMIT}.`);
  }
  return Number(value);
}
export function emptyGoals(): ProductivityGoals {
  return {
    daily: null,
    weekly: null,
    monthly: null,
    updatedAt: new Date().toISOString(),
  };
}
export function validGoals(value: unknown): value is ProductivityGoals {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const item = value as ProductivityGoals;
  return (
    Object.keys(item).sort().join(',') === 'daily,monthly,updatedAt,weekly' &&
    GOAL_PERIODS.every(period => validGoal(item[period])) &&
    typeof item.updatedAt === 'string' &&
    Number.isFinite(Date.parse(item.updatedAt))
  );
}
