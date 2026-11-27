import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  isAvailable(): Promise<boolean>;
  start(): Promise<string>;
  cancel(): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('NativeTaskVoice');
