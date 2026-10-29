package com.gerenciadortarefas.reminders

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class TaskReminderPackage : BaseReactPackage() {
  override fun getModule(name: String, context: ReactApplicationContext): NativeModule? =
    if (name == TaskReminderModule.NAME) TaskReminderModule(context) else null
  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(TaskReminderModule.NAME to ReactModuleInfo(
      TaskReminderModule.NAME, TaskReminderModule.NAME, false, false, false, true))
  }
}
