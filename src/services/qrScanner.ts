import { PermissionsAndroid, Platform } from 'react-native';
import NativeQrScanner from '../../specs/NativeQrScanner';
import { QrScanSession } from './qrScanSession';

export const qrScanner = new QrScanSession(NativeQrScanner ?? null);
let blocked = false;
export async function requestQrCameraPermission(): Promise<
  'granted' | 'denied' | 'blocked' | 'unavailable'
> {
  if (Platform.OS !== 'android') {
    return 'unavailable';
  }
  const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
  try {
    if (await PermissionsAndroid.check(permission)) {
      blocked = false;
      return 'granted';
    }
    if (blocked) {
      return 'blocked';
    }
    const result = await PermissionsAndroid.request(permission);
    blocked = result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
    return result === PermissionsAndroid.RESULTS.GRANTED
      ? 'granted'
      : blocked
      ? 'blocked'
      : 'denied';
  } catch {
    return 'unavailable';
  }
}
