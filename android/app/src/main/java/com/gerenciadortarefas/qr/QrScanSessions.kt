package com.gerenciadortarefas.qr

import java.lang.ref.WeakReference

/** Accessed on the main thread. Stores no frames and delivers each terminal result once. */
internal object QrScanSessions {
  class Pending(val complete: (String, String?) -> Unit) {
    var activity: WeakReference<QrScannerActivity>? = null
  }
  private val store = ScanSessionStore<Pending>()
  fun begin(id: String, complete: (String, String?) -> Unit) = store.begin(id, Pending(complete))
  fun isActive(id: String) = store.get(id) != null
  fun attach(id: String, activity: QrScannerActivity): Boolean {
    val pending = store.get(id) ?: return false
    // Do not let an accidental duplicate Activity claim an existing session.
    if (pending.activity?.get() != null) return false
    pending.activity = WeakReference(activity)
    return true
  }
  fun complete(id: String, payload: String = "", error: String? = null) {
    store.finish(id)?.complete?.invoke(payload, error)
  }
  fun cancel(id: String) {
    val activity = store.get(id)?.activity?.get()
    if (activity != null) activity.cancelScan() else complete(id)
  }
}
