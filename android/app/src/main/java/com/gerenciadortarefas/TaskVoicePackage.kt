package com.gerenciadortarefas

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class TaskVoicePackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      if (name == TaskVoiceModule.NAME) TaskVoiceModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(TaskVoiceModule.NAME to ReactModuleInfo(
        TaskVoiceModule.NAME, TaskVoiceModule.NAME, false, false, false, true))
  }
}
