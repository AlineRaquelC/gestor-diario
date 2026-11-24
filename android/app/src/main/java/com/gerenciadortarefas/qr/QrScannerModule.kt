package com.gerenciadortarefas.qr

import android.content.Intent
import com.facebook.react.bridge.*
import com.gerenciadortarefas.reminders.NativeQrScannerSpec

class QrScannerModule(private val context: ReactApplicationContext) :
  NativeQrScannerSpec(context), LifecycleEventListener {
  private var ownedSession: String? = null
  private data class Delivery(val promise: Promise, val payload: String, val error: String?)
  private var pendingDelivery: Delivery? = null
  init { context.addLifecycleEventListener(this) }
  override fun getName() = NAME

  override fun startScan(sessionId: String, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      if (!sessionId.matches(Regex("[A-Za-z0-9-]{1,96}"))) {
        promise.reject("QR_SESSION", "Não foi possível iniciar a leitura."); return@runOnUiThread
      }
      val host = context.currentActivity
      if (host == null || host.isFinishing || host.isDestroyed) {
        promise.reject("QR_UNAVAILABLE", "O leitor de QR Code não está disponível agora. Você pode digitar a tarefa."); return@runOnUiThread
      }
      val lifecycle = (host as? androidx.lifecycle.LifecycleOwner)?.lifecycle
      if (lifecycle != null && !lifecycle.currentState.isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED)) {
        promise.resolve(""); return@runOnUiThread
      }
      if (ownedSession != null) {
        promise.reject("QR_BUSY", "Já existe uma leitura de QR Code em andamento."); return@runOnUiThread
      }
      if (!QrScanSessions.begin(sessionId) { payload, error ->
        pendingDelivery = Delivery(promise, payload, error)
        val resumed = (context.currentActivity as? androidx.lifecycle.LifecycleOwner)
          ?.lifecycle?.currentState?.isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED) == true
        if (resumed) deliverPending()
      }) {
        promise.reject("QR_BUSY", "Já existe uma leitura de QR Code em andamento."); return@runOnUiThread
      }
      ownedSession = sessionId
      try {
        host.startActivity(Intent(host, QrScannerActivity::class.java).putExtra(QrScannerActivity.SESSION_ID, sessionId))
      } catch (_: Exception) {
        QrScanSessions.complete(sessionId, error = "Não foi possível abrir a câmera. Você pode digitar a tarefa.")
      }
    }
  }
  override fun cancel(sessionId: String, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      if (ownedSession == sessionId) {
        QrScanSessions.cancel(sessionId)
        deliverPending(cancelled = true)
      }
      promise.resolve(null)
    }
  }
  private fun deliverPending(cancelled: Boolean = false) {
    val delivery = pendingDelivery ?: return
    pendingDelivery = null
    ownedSession = null
    if (cancelled) delivery.promise.resolve("")
    else if (delivery.error == null) delivery.promise.resolve(delivery.payload)
    else delivery.promise.reject("QR_CAMERA", delivery.error)
  }
  // React dialogs cannot be presented reliably while the scanner is still finishing.
  override fun onHostResume() { deliverPending() }
  // Opening the scanner pauses ReactActivity. Scanner onPause owns background cleanup.
  override fun onHostPause() = Unit
  override fun onHostDestroy() {
    UiThreadUtil.runOnUiThread {
      ownedSession?.let { QrScanSessions.cancel(it) }
      deliverPending(cancelled = true)
    }
  }
  override fun invalidate() {
    context.removeLifecycleEventListener(this)
    UiThreadUtil.runOnUiThread {
      ownedSession?.let { QrScanSessions.cancel(it) }
      deliverPending(cancelled = true)
    }
    super.invalidate()
  }
  companion object { const val NAME = "NativeQrScanner" }
}
