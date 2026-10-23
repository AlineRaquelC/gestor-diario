package com.gerenciadortarefas.remindergate

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class ReminderGatePackage : BaseReactPackage() {
  override fun getModule(name: String, context: ReactApplicationContext): NativeModule? =
    if (name == ReminderGateModule.NAME) ReminderGateModule(context) else null
  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(ReminderGateModule.NAME to ReactModuleInfo(
      ReminderGateModule.NAME, ReminderGateModule.NAME, false, false, false, true))
  }
}
