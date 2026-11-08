import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  emptyGoals,
  GOAL_PERIODS,
  validGoal,
  validGoals,
} from '../models/productivityGoals';
import type {
  GoalPeriod,
  ProductivityGoals,
} from '../models/productivityGoals';
export const PRODUCTIVITY_GOALS_KEY = '@taskflow:productivity-goals:v1';
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.catch(() => undefined).then(work);
  queue = result;
  return result;
}
async function read(): Promise<ProductivityGoals> {
  try {
    const raw = await AsyncStorage.getItem(PRODUCTIVITY_GOALS_KEY);
    if (raw === null) {
      return emptyGoals();
    }
    const data = JSON.parse(raw);
    if (
      data?.version !== 1 ||
      !validGoals(data.goals) ||
      Object.keys(data).sort().join(',') !== 'goals,version'
    ) {
      throw new Error();
    }
    return data.goals;
  } catch {
    throw new Error(
      'Não foi possível ler as metas. Os dados foram preservados. Tente novamente.',
    );
  }
}
export const loadGoals = () => serialize(read);
export function setGoal(period: GoalPeriod, value: number | null) {
  return serialize(async () => {
    if (!GOAL_PERIODS.includes(period) || !validGoal(value)) {
      throw new Error('Meta inválida.');
    }
    const previous = await read();
    const next = {
      ...previous,
      [period]: value,
      updatedAt: new Date().toISOString(),
    };
    try {
      await AsyncStorage.setItem(
        PRODUCTIVITY_GOALS_KEY,
        JSON.stringify({ version: 1, goals: next }),
      );
    } catch {
      throw new Error(
        'Não foi possível salvar a meta. O valor anterior foi mantido. Tente novamente.',
      );
    }
    return next;
  });
}
export const removeGoal = (period: GoalPeriod) => setGoal(period, null);
