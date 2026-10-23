/** T02 probe only: no Task, persistence, navigation or production scheduling. */
import React, { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text } from 'react-native';
import notify, {
  AlarmType,
  AndroidImportance,
  AuthorizationStatus,
  TriggerType,
} from 'react-native-notify-kit';
import { resolveTaskInstant } from '../domain/reminders';

const id = 'task-reminder:gate-task:gate-reminder';
const channelId = 'reminder-compatibility-gate';

export default function ReminderGate() {
  const [result, setResult] = useState('T02: isolated Android gate');
  const run = async (action: string) => {
    try {
      let evidence: unknown;
      if (action === 'permission') {
        evidence = await notify.requestPermission();
      } else if (action === 'cancel') {
        await notify.cancelNotification(id);
        evidence = await notify.getTriggerNotificationIds();
      } else if (action === 'schedule') {
        const permission = await notify.getNotificationSettings();
        if (permission.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
          throw new Error(
            'Notificações não autorizadas; nenhum agendamento confirmado.',
          );
        }
        await notify.createChannel({
          id: channelId,
          name: 'Reminder compatibility gate',
          importance: AndroidImportance.HIGH,
        });
        const timestamp = Date.now() + 60000;
        await notify.createTriggerNotification(
          {
            id,
            title: 'Gate de lembretes',
            body: `Disparo solicitado: ${new Date(timestamp).toISOString()}`,
            android: { channelId, pressAction: { id: 'default' } },
          },
          {
            type: TriggerType.TIMESTAMP,
            timestamp,
            alarmManager: { type: AlarmType.SET_AND_ALLOW_WHILE_IDLE },
          },
        );
        evidence = { timestamp, ids: await notify.getTriggerNotificationIds() };
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
        evidence = {
          settings: await notify.getNotificationSettings(),
          triggers: await notify.getTriggerNotifications(),
          displayed: await notify.getDisplayedNotifications(),
        };
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
      <Button title="Cancel gate ID" onPress={() => run('cancel')} />
      <Button title="Inspect" onPress={() => run('inspect')} />
      <Button title="Timezone fixtures" onPress={() => run('timezone')} />
      <Text selectable>{result}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: 24, gap: 16 } });
