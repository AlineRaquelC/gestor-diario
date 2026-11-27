package com.gerenciadortarefas

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.gerenciadortarefas.reminders.NativeTaskVoiceSpec

class TaskVoiceModule(private val context: ReactApplicationContext) :
    NativeTaskVoiceSpec(context), LifecycleEventListener {
  companion object { const val NAME = "NativeTaskVoice" }

  private val main = Handler(Looper.getMainLooper())
  private var current: Session? = null

  init { context.addLifecycleEventListener(this) }

  override fun getName() = NAME

  private fun onDeviceAvailable() = Build.VERSION.SDK_INT >= 31 &&
      SpeechRecognizer.isOnDeviceRecognitionAvailable(context)

  override fun isAvailable(result: Promise) {
    main.post {
      try {
        result.resolve(onDeviceAvailable())
      } catch (_: RuntimeException) {
        result.resolve(false)
      }
    }
  }

  override fun start(result: Promise) {
    main.post {
      try {
        when {
          current != null -> result.reject("BUSY", "Já existe uma sessão de voz.")
          !onDeviceAvailable() ->
            result.reject("UNAVAILABLE", "Reconhecimento on-device indisponível.")
          context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED ->
            result.reject("PERMISSION", "Microfone não autorizado.")
          else -> startLocal(result)
        }
      } catch (_: RuntimeException) {
        result.reject("START_FAILED", "Não foi possível iniciar o reconhecimento local.")
      }
    }
  }

  @android.annotation.TargetApi(31)
  private fun startLocal(result: Promise) {
    val recognizer = try {
      SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
    } catch (_: RuntimeException) {
      result.reject("START_FAILED", "Não foi possível criar o reconhecedor local.")
      return
    }
    val session = Session(recognizer, result)
    current = session
    val request = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
        .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
        .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
    try {
      recognizer.setRecognitionListener(session)
      main.postDelayed(session.timeout, 18_000)
      recognizer.startListening(request)
    } catch (_: RuntimeException) {
      finish(session, code = "START_FAILED", message = "Não foi possível iniciar a captura.")
    }
  }

  override fun cancel(result: Promise) {
    main.post {
      cancelCurrent()
      result.resolve(null)
    }
  }

  private fun cancelCurrent() {
    current?.let { finish(it, code = "CANCELLED", message = "Captura cancelada.") }
  }

  private fun finish(session: Session, text: String? = null, code: String = "", message: String = "") {
    if (current !== session) return
    current = null
    main.removeCallbacks(session.timeout)
    try {
      if (text == null) session.recognizer.cancel()
    } catch (_: RuntimeException) {
      Log.w(NAME, "Falha ao cancelar o reconhecedor.")
    } finally {
      try {
        session.recognizer.destroy()
      } catch (_: RuntimeException) {
        Log.w(NAME, "Falha ao liberar o reconhecedor.")
      } finally {
        if (text == null) session.result.reject(code, message) else session.result.resolve(text)
      }
    }
  }

  override fun onHostResume() = Unit
  override fun onHostPause() { main.post { cancelCurrent() } }
  override fun onHostDestroy() { main.post { cancelCurrent() } }

  override fun invalidate() {
    context.removeLifecycleEventListener(this)
    main.post { cancelCurrent() }
    super.invalidate()
  }

  private inner class Session(val recognizer: SpeechRecognizer, val result: Promise) : RecognitionListener {
    val timeout = Runnable { finish(this, code = "TIMEOUT", message = "A captura terminou sem resultado.") }
    override fun onReadyForSpeech(params: Bundle?) = Unit
    override fun onBeginningOfSpeech() = Unit
    override fun onRmsChanged(rmsdB: Float) = Unit
    override fun onBufferReceived(buffer: ByteArray?) = Unit
    override fun onEndOfSpeech() = Unit
    override fun onPartialResults(partialResults: Bundle?) = Unit
    override fun onEvent(eventType: Int, params: Bundle?) = Unit

    override fun onError(error: Int) {
      val explanation = when (error) {
        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Nenhuma fala detectada."
        SpeechRecognizer.ERROR_NO_MATCH -> "Nenhuma transcrição reconhecida."
        SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE ->
          "O modelo de português do Brasil está indisponível. Você pode continuar digitando."
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microfone não autorizado."
        SpeechRecognizer.ERROR_AUDIO -> "Não foi possível usar o microfone."
        else -> "O reconhecedor encerrou a captura."
      }
      finish(this, code = "ANDROID_$error", message = explanation)
    }

    override fun onResults(results: Bundle?) {
      val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
      if (text.isNullOrBlank()) {
        finish(this, code = "EMPTY", message = "O serviço retornou uma transcrição vazia.")
      } else {
        finish(this, text = text)
      }
    }
  }
}
