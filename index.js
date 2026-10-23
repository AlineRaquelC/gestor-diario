/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

// Debug-only Activity owns this probe; release has no route or launcher for it.
if (__DEV__) {
  AppRegistry.registerComponent('ReminderGate', () => require('./src/dev/ReminderGate').default);
}
