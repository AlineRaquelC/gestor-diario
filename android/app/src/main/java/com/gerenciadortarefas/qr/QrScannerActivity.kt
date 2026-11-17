package com.gerenciadortarefas.qr

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.*
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.camera.core.*
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import android.util.Size
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class QrScannerActivity : ComponentActivity() {
  private var sessionId = ""
  private var provider: ProcessCameraProvider? = null
  private var analysis: ImageAnalysis? = null
  private val worker = Executors.newSingleThreadExecutor()
  private val decoder = QrFrameDecoder()
  private val resultQueued = AtomicBoolean(false)
  @Volatile private var terminal = false
  private var receivedFocus = false
  private var attached = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    sessionId = intent.getStringExtra(SESSION_ID) ?: ""
    // Rotation/process restoration must not restart a previous camera session.
    if (savedInstanceState != null || !QrScanSessions.attach(sessionId, this)) {
      terminal = true
      if (savedInstanceState != null) QrScanSessions.cancel(sessionId)
      finish(); return
    }
    attached = true
    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() = cancelScan()
    })
    if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
      end(error = "A permissão da câmera foi revogada. Você pode digitar a tarefa ou tentar novamente."); return
    }
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      val padding = (20 * resources.displayMetrics.density).toInt()
      setPadding(padding, padding, padding, padding)
      fitsSystemWindows = true
      setBackgroundColor(0xff101820.toInt())
    }
    fun text(value: String) = TextView(this).apply {
      text = value; textSize = 16f; setTextColor(0xffffffff.toInt()); setPadding(0, 12, 0, 12)
    }
    root.addView(text("Escanear QR Code").apply { androidx.core.view.ViewCompat.setAccessibilityHeading(this, true) })
    root.addView(text("Aponte para um QR de tarefa. A leitura apenas preenche um rascunho; nada será salvo aqui."))
    val preview = PreviewView(this).apply {
      implementationMode = PreviewView.ImplementationMode.COMPATIBLE
      importantForAccessibility = android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO
    }
    root.addView(preview, LinearLayout.LayoutParams(-1, 0, 1f))
    root.addView(text("Procurando QR Code…").apply { accessibilityLiveRegion = android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE })
    root.addView(Button(this).apply {
      text = "Cancelar"
      contentDescription = "Cancelar leitura de QR Code e voltar ao formulário"
      minHeight = (48 * resources.displayMetrics.density).toInt()
      setOnClickListener { cancelScan() }
    })
    setContentView(root)
    val future = try { ProcessCameraProvider.getInstance(this) } catch (_: Exception) {
      end(error = "O serviço de câmera não está disponível. Você pode digitar a tarefa."); return
    }
    future.addListener({
      if (terminal || !QrScanSessions.isActive(sessionId)) return@addListener
      try {
        provider = future.get()
        val selector = when {
          provider!!.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA) -> CameraSelector.DEFAULT_BACK_CAMERA
          provider!!.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA) -> CameraSelector.DEFAULT_FRONT_CAMERA
          else -> { end(error = "Nenhuma câmera está disponível. Você pode digitar a tarefa."); return@addListener }
        }
        val cameraPreview = Preview.Builder().build().also { it.setSurfaceProvider(preview.surfaceProvider) }
        analysis = ImageAnalysis.Builder()
          .setResolutionSelector(ResolutionSelector.Builder().setResolutionStrategy(
            ResolutionStrategy(Size(1280, 720), ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER)).build())
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
          .build().also { it.setAnalyzer(worker, ::analyze) }
        val camera = provider!!.bindToLifecycle(this, selector, cameraPreview, analysis)
        camera.cameraInfo.cameraState.observe(this) { state ->
          if (state.error != null && !terminal) {
            end(error = "A câmera está ocupada ou indisponível. Feche outros apps de câmera e tente novamente, ou digite a tarefa.")
          }
        }
      } catch (_: Exception) {
        end(error = "Não foi possível abrir a câmera. Você pode tentar novamente ou digitar a tarefa.")
      }
    }, ContextCompat.getMainExecutor(this))
  }

  private fun analyze(image: ImageProxy) {
    try {
      if (terminal || resultQueued.get()) return
      val plane = image.planes[0]
      val crop = image.cropRect
      val payload = decoder.decode(plane.buffer, plane.rowStride, plane.pixelStride,
        crop.left, crop.top, crop.width(), crop.height()) ?: return
      if (resultQueued.compareAndSet(false, true)) {
        runOnUiThread {
          if (!terminal) {
            if (payload.toByteArray(Charsets.UTF_8).size > MAX_PAYLOAD_BYTES) {
              end(error = "Este QR Code excede o limite de 2048 bytes.")
            } else if (payload.isEmpty()) {
              end(error = "O QR Code está vazio. Tente novamente ou digite a tarefa.")
            } else end(payload)
          }
        }
      }
    } catch (_: Exception) {
      if (resultQueued.compareAndSet(false, true)) runOnUiThread {
        if (!terminal) end(error = "Não foi possível analisar a imagem. Tente novamente ou digite a tarefa.")
      }
    } finally { image.close() }
  }

  internal fun cancelScan() = end()
  private fun end(payload: String = "", error: String? = null) {
    if (terminal) return
    terminal = true
    try {
      analysis?.clearAnalyzer()
      provider?.unbindAll()
    } catch (_: Exception) {
      // Session must still finish if the camera service disappeared during cleanup.
    } finally {
      finish()
      if (attached) QrScanSessions.complete(sessionId, payload, error)
    }
  }
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (!hasFocus && receivedFocus) cancelScan()
    if (hasFocus) receivedFocus = true
  }
  override fun onPause() {
    cancelScan()
    super.onPause()
  }
  override fun onDestroy() {
    cancelScan()
    worker.shutdown()
    super.onDestroy()
  }
  companion object {
    const val SESSION_ID = "qrSessionId"
    const val MAX_PAYLOAD_BYTES = 2048
  }
}
