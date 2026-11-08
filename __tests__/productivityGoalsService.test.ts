import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadGoals,
  setGoal,
  removeGoal,
  PRODUCTIVITY_GOALS_KEY,
} from '../src/services/productivityGoalsService';
import { GOAL_LIMIT, parseGoalInput } from '../src/models/productivityGoals';
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
let raw: string | null;
beforeEach(() => {
  raw = null;
  jest.clearAllMocks();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async () => raw);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (_key, value) => {
    raw = value;
  });
});
it('ausência usa null sem escrita e chave dedicada', async () => {
  expect(await loadGoals()).toMatchObject({
    daily: null,
    weekly: null,
    monthly: null,
  });
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(AsyncStorage.getItem).toHaveBeenCalledWith(PRODUCTIVITY_GOALS_KEY);
});
it('três períodos persistem, recarregam e remoção não altera outros', async () => {
  await Promise.all([
    setGoal('daily', 5),
    setGoal('weekly', 20),
    setGoal('monthly', 50),
  ]);
  expect(await loadGoals()).toMatchObject({
    daily: 5,
    weekly: 20,
    monthly: 50,
  });
  await removeGoal('weekly');
  expect(await loadGoals()).toMatchObject({
    daily: 5,
    weekly: null,
    monthly: 50,
  });
  expect(Object.keys(JSON.parse(raw!).goals).sort()).toEqual([
    'daily',
    'monthly',
    'updatedAt',
    'weekly',
  ]);
});
it.each([0, -1, 1.5, GOAL_LIMIT + 1, NaN, Infinity])(
  'rejeita valor %s sem gravar',
  async value => {
    await expect(setGoal('daily', value)).rejects.toThrow('inválida');
    expect(raw).toBeNull();
  },
);
it.each(['', ' ', '0', '-1', '1.5', '1,5', 'abc', '1e2', '10001'])(
  'input inválido %j',
  value => expect(() => parseGoalInput(value)).toThrow('inteiro'),
);
it('limites e trim', async () => {
  expect(parseGoalInput(' 1 ')).toBe(1);
  expect(parseGoalInput(String(GOAL_LIMIT))).toBe(GOAL_LIMIT);
  await setGoal('monthly', GOAL_LIMIT);
  expect((await loadGoals()).monthly).toBe(GOAL_LIMIT);
});
it.each([
  '{',
  '{}',
  '[]',
  '{"version":2,"goals":{}}',
  '{"version":1,"goals":{"daily":0,"weekly":null,"monthly":null,"updatedAt":"bad"}}',
])('JSON inválido %s não é sobrescrito', async value => {
  raw = value;
  await expect(loadGoals()).rejects.toThrow('preservados');
  await expect(setGoal('daily', 2)).rejects.toThrow('preservados');
  await expect(removeGoal('daily')).rejects.toThrow('preservados');
  expect(raw).toBe(value);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
it('falha leitura impede escrita', async () => {
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('Disk'));
  await expect(setGoal('daily', 3)).rejects.toThrow('preservados');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
it('falha de escrita mantém confirmado e retry funciona', async () => {
  await setGoal('daily', 5);
  const before = raw;
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Disk'));
  await expect(setGoal('daily', 8)).rejects.toThrow('valor anterior');
  expect(raw).toBe(before);
  expect((await loadGoals()).daily).toBe(5);
  await setGoal('daily', 8);
  expect((await loadGoals()).daily).toBe(8);
});
