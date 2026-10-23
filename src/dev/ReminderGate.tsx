/** T02 probe only: no Task data, navigation or production scheduling. */
import React, { useState } from 'react';
import {
  Button,
  PermissionsAndroid,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import nativeGate from '../../specs/NativeReminderGate';
import { resolveTaskInstant } from '../domain/reminders';

const id = 'task-reminder:gate-task:gate-reminder';

export default function ReminderGate() {
  const [result, setResult] = useState('T02: isolated Android gate');
  const run = async (action: string) => {
    try {
      let evidence: unknown;
      if (action === 'permission') {
        evidence = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      } else if (action === 'cancel') {
        evidence = await nativeGate.cancel(id);
      } else if (action === 'scheduleOther') {
        evidence = await nativeGate.schedule(
          `${id}-other`,
          Date.now() + 180000,
        );
      } else if (action === 'cancelOther') {
        evidence = await nativeGate.cancel(`${id}-other`);
      } else if (action === 'schedule' || action === 'schedule180') {
        const timestamp =
          Date.now() + (action === 'schedule180' ? 180000 : 60000);
        evidence = await nativeGate.schedule(id, timestamp);
      } else if (action === 'timezone') {
        evidence = {
          saoPaulo: resolveTaskInstant(
            '2026-10-24',
            '09:01',
            'America/Sao_Paulo',
          ),
          kathmandu: resolveTaskInstant(
            '2026-10-24',
            '09:01',
            'Asia/Kathmandu',
          ),
        };
        for (const [date, time] of [
          ['2026-03-08', '02:30'],
          ['2026-11-01', '01:30'],
        ]) {
          let rejected = false;
          try {
            resolveTaskInstant(date, time, 'America/New_York');
          } catch {
            rejected = true;
          }
          if (!rejected) {
            throw new Error(`DST not rejected: ${date}`);
          }
        }
      } else {
        evidence = await nativeGate.getScheduled();
      }
      const output = JSON.stringify({
        action,
        at: new Date().toISOString(),
        evidence,
      });
      console.info('REMINDER_GATE', output);
      setResult(output);
    } catch (error) {
      const output = JSON.stringify({ action, error: String(error) });
      console.info('REMINDER_GATE', output);
      setResult(output);
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text>T02 — Android compatibility gate</Text>
      <Button title="Permission" onPress={() => run('permission')} />
      <Button
        title="Schedule 60s / replace same ID"
        onPress={() => run('schedule')}
      />
      <Button
        title="Schedule 180s / replace same ID"
        onPress={() => run('schedule180')}
      />
      <Button title="Cancel gate ID" onPress={() => run('cancel')} />
      <Button title="Inspect" onPress={() => run('inspect')} />
      <Button title="Timezone fixtures" onPress={() => run('timezone')} />
      <Button
        title="Schedule other gate ID 180s"
        onPress={() => run('scheduleOther')}
      />
      <Button title="Cancel other gate ID" onPress={() => run('cancelOther')} />
      <Text selectable>{result}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: 24, gap: 16 } });
