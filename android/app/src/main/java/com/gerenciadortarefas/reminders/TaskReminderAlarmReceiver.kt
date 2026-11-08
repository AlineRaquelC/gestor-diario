package com.gerenciadortarefas.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class TaskReminderAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == "com.gerenciadortarefas.TASK_REMINDER_ALARM") {
      intent.getStringExtra("notificationId")?.let { TaskReminderStore.deliver(context, it) }
    }
  }
}
