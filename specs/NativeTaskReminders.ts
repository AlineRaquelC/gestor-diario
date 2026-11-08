import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  schedule(notificationId: string, triggerAt: number): Promise<string>;
  cancel(notificationId: string): Promise<string>;
  getScheduled(): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('NativeTaskReminders');
