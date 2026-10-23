package com.gerenciadortarefas.remindergate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ReminderAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == "com.gerenciadortarefas.REMINDER_GATE_ALARM") {
      intent.getStringExtra("notificationId")?.let { ReminderGateStore.deliver(context, it) }
    }
  }
}
