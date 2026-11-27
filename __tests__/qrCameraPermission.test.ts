jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  PermissionsAndroid: {
    PERMISSIONS: { CAMERA: 'android.permission.CAMERA' },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    check: jest.fn(),
    request: jest.fn(),
  },
}));
jest.mock('../specs/NativeQrScanner', () => ({
  __esModule: true,
  default: null,
}));
import { PermissionsAndroid, Platform } from 'react-native';
import { requestQrCameraPermission } from '../src/services/qrScanner';

test('permissão é contextual, sem loop, revalidada após Configurações e revogação', async () => {
  expect(PermissionsAndroid.request).not.toHaveBeenCalled();
  jest.mocked(PermissionsAndroid.check).mockResolvedValue(false);
  jest
    .mocked(PermissionsAndroid.request)
    .mockResolvedValueOnce('denied')
    .mockResolvedValueOnce('never_ask_again');
  expect(await requestQrCameraPermission()).toBe('denied');
  expect(await requestQrCameraPermission()).toBe('blocked');
  expect(await requestQrCameraPermission()).toBe('blocked');
  expect(PermissionsAndroid.request).toHaveBeenCalledTimes(2);
  jest.mocked(PermissionsAndroid.check).mockResolvedValueOnce(true);
  expect(await requestQrCameraPermission()).toBe('granted');
  jest.mocked(PermissionsAndroid.request).mockResolvedValueOnce('denied');
  expect(await requestQrCameraPermission()).toBe('denied');
  expect(PermissionsAndroid.request).toHaveBeenCalledTimes(3);
});
test('erro de API ou plataforma sem scanner mantém indisponibilidade explícita', async () => {
  jest
    .mocked(PermissionsAndroid.check)
    .mockRejectedValueOnce(new Error('unavailable'));
  expect(await requestQrCameraPermission()).toBe('unavailable');
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  expect(await requestQrCameraPermission()).toBe('unavailable');
});
