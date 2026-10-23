package com.gerenciadortarefas.remindergate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ReminderRecoveryReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      ReminderGateStore.recover(context, intent.action!!)
    }
  }
}
