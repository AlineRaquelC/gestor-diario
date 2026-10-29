package com.gerenciadortarefas.reminders

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class TaskReminderModule(context: ReactApplicationContext) : NativeTaskRemindersSpec(context) {
  override fun getName() = NAME
  override fun schedule(notificationId: String, triggerAt: Double, promise: Promise) = run(promise) {
    TaskReminderStore.schedule(reactApplicationContext, notificationId, triggerAt)
  }
  override fun cancel(notificationId: String, promise: Promise) = run(promise) {
    TaskReminderStore.cancel(reactApplicationContext, notificationId)
  }
  override fun getScheduled(promise: Promise) = run(promise) {
    TaskReminderStore.scheduled(reactApplicationContext)
  }
  private fun run(promise: Promise, block: () -> String) {
    try { promise.resolve(block()) } catch (e: Exception) { promise.reject("TASK_REMINDER", e.message, e) }
  }
  companion object { const val NAME = "NativeTaskReminders" }
}
