import { PermissionsAndroid, Platform } from 'react-native';
import { formatReminder } from '../src/models/reminderPresentation';
import { requestReminderPermission } from '../src/services/reminderPermission';
test.each([
  [0, 'No horário'],
  [15, '15 min antes'],
  [30, '30 min antes'],
  [60, '1 hora antes'],
  [120, '2 horas antes'],
  [1440, '1 dia antes'],
  [2880, '2 dias antes'],
])('formata %s a partir do offset', (offset, label) => {
  expect(formatReminder(offset as number)).toBe(label);
});
describe('permissão contextual Android', () => {
  const originalOS = Platform.OS;
  const version = Object.getOwnPropertyDescriptor(Platform, 'Version');
  beforeEach(() => {
    Platform.OS = 'android';
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: 33,
    });
  });
  afterEach(() => {
    Platform.OS = originalOS;
    if (version) {
      Object.defineProperty(Platform, 'Version', version);
    }
    jest.restoreAllMocks();
  });
  test('já concedida não solicita novamente', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
    const request = jest.spyOn(PermissionsAndroid, 'request');
    expect(await requestReminderPermission()).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });
  test.each(['granted', 'denied', 'never_ask_again'] as const)(
    'solicita POST_NOTIFICATIONS e retorna %s',
    async result => {
      jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
      const request = jest
        .spyOn(PermissionsAndroid, 'request')
        .mockResolvedValue(result);
      expect(await requestReminderPermission()).toBe(result === 'granted');
      expect(request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
    },
  );
  test('Android antigo não solicita runtime permission', async () => {
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: 32,
    });
    const check = jest.spyOn(PermissionsAndroid, 'check');
    expect(await requestReminderPermission()).toBe(true);
    expect(check).not.toHaveBeenCalled();
  });
  test('erro de permissão permite informar indisponibilidade sem lançar', async () => {
    jest
      .spyOn(PermissionsAndroid, 'check')
      .mockRejectedValue(new Error('bridge'));
    expect(await requestReminderPermission()).toBe(false);
  });
});
