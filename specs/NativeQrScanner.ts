import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Empty string is normal cancellation; actual QR payloads never use that sentinel.
  startScan(sessionId: string): Promise<string>;
  cancel(sessionId: string): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('NativeQrScanner');
