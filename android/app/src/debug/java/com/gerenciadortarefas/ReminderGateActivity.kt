package com.gerenciadortarefas

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

/** Isolated T02 entry, absent from release and application navigation. */
class ReminderGateActivity : ReactActivity() {
  override fun getMainComponentName(): String = "ReminderGate"
  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
