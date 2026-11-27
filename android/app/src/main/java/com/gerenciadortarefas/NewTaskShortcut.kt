package com.gerenciadortarefas

import android.annotation.TargetApi
import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.util.Log
import java.util.UUID

internal const val NEW_TASK_SHORTCUT_URI = "gestordiario://shortcut/new-task"
private const val SHORTCUT_ID = "new-task"

internal class ShortcutDeliveries {
  val processToken: String = UUID.randomUUID().toString()
  private var sequence = 0L

  fun receive(action: String?, uri: String?): String? {
    if (action != Intent.ACTION_VIEW || uri != NEW_TASK_SHORTCUT_URI) return null
    return "$NEW_TASK_SHORTCUT_URI/${++sequence}"
  }

  fun restore(token: String?, uri: String?): String? =
      uri?.takeIf { token == processToken }
}

internal fun publishShortcut(sdk: Int, publish: () -> Unit, onFailure: (RuntimeException) -> Unit) {
  if (sdk >= Build.VERSION_CODES.N_MR1) {
    try {
      publish()
    } catch (error: RuntimeException) {
      onFailure(error)
    }
  }
}

internal object NewTaskShortcut {
  fun publish(context: Context) {
    publishShortcut(Build.VERSION.SDK_INT, { publishDynamic(context) }) { error ->
      Log.w("NewTaskShortcut", "Não foi possível publicar o atalho.", error)
    }
  }

  @TargetApi(Build.VERSION_CODES.N_MR1)
  private fun publishDynamic(context: Context) {
    val manager = context.getSystemService(ShortcutManager::class.java) ?: return
    val shortcuts = manager.dynamicShortcuts
    if (shortcuts.any { it.id == SHORTCUT_ID && it.isEnabled } ||
        shortcuts.size >= manager.maxShortcutCountPerActivity || manager.isRateLimitingActive) return

    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(NEW_TASK_SHORTCUT_URI), context, MainActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val shortcut = ShortcutInfo.Builder(context, SHORTCUT_ID)
        .setShortLabel(context.getString(R.string.shortcut_new_task))
        .setIcon(Icon.createWithResource(context, R.drawable.ic_shortcut_new_task))
        .setIntent(intent)
        .build()
    if (!manager.addDynamicShortcuts(listOf(shortcut))) {
      Log.w("NewTaskShortcut", "O Android não aceitou a publicação do atalho.")
    }
  }
}
