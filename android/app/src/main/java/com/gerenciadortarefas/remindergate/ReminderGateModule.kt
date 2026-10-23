package com.gerenciadortarefas.remindergate

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class ReminderGateModule(context: ReactApplicationContext) : NativeReminderGateSpec(context) {
  override fun getName() = NAME
  override fun schedule(notificationId: String, triggerAt: Double, promise: Promise) = run(promise) {
    ReminderGateStore.schedule(reactApplicationContext, notificationId, triggerAt)
  }
  override fun cancel(notificationId: String, promise: Promise) = run(promise) {
    ReminderGateStore.cancel(reactApplicationContext, notificationId)
  }
  override fun getScheduled(promise: Promise) = run(promise) {
    ReminderGateStore.scheduled(reactApplicationContext)
  }
  private fun run(promise: Promise, block: () -> String) {
    try { promise.resolve(block()) } catch (e: Exception) { promise.reject("REMINDER_GATE", e.message, e) }
  }
  companion object { const val NAME = "NativeReminderGate" }
}
