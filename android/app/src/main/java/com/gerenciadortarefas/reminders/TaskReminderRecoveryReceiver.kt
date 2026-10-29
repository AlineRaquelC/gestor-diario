package com.gerenciadortarefas.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class TaskReminderRecoveryReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      TaskReminderStore.recover(context, intent.action!!)
    }
  }
}
