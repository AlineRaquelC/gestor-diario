package com.gerenciadortarefas

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory

class MainActivity : ReactActivity() {
  private companion object {
    val deliveries = ShortcutDeliveries()
    const val PROCESS_TOKEN = "newTaskShortcut.process"
    const val DELIVERY_URL = "newTaskShortcut.url"
  }

  private var deliveryUrl: String? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    val incoming = intent
    if (savedInstanceState == null) {
      deliveryUrl = deliveries.receive(incoming.action, incoming.dataString)
    } else {
      // Reuse an in-process delivery ID. A task restored after process death must
      // not interpret its historical base intent as a new launcher gesture.
      deliveryUrl = deliveries.restore(
          savedInstanceState.getString(PROCESS_TOKEN), savedInstanceState.getString(DELIVERY_URL))
    }
    setIntent(forReactNative(incoming, deliveryUrl))
    com.gerenciadortarefas.reminders.TaskReminderStore.recover(this, "activity-open")
    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
    super.onCreate(savedInstanceState)
    NewTaskShortcut.publish(this)
  }

  override fun onNewIntent(intent: Intent) {
    val nextDelivery = deliveries.receive(intent.action, intent.dataString)
    val reactIntent = forReactNative(intent, nextDelivery)
    // Keep the latest valid delivery available for Linking.getInitialURL even if
    // a normal launcher resume follows before JS subscribes.
    if (nextDelivery != null || deliveryUrl == null) {
      deliveryUrl = nextDelivery
      setIntent(reactIntent)
    } else {
      setIntent(forReactNative(intent, deliveryUrl))
    }
    super.onNewIntent(reactIntent)
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    outState.putString(PROCESS_TOKEN, deliveries.processToken)
    outState.putString(DELIVERY_URL, deliveryUrl)
  }

  private fun forReactNative(incoming: Intent, url: String?): Intent {
    if (url != null) return Intent(Intent.ACTION_VIEW, Uri.parse(url))
    // The delivery namespace is reserved for URLs generated here.
    if (incoming.data?.scheme.equals("gestordiario", ignoreCase = true)) {
      return Intent(incoming).setData(null)
    }
    return incoming
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "GerenciadorTarefas"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
