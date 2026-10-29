package com.gerenciadortarefas.reminders

import android.annotation.SuppressLint
import android.os.Build
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject

/** Native trigger records contain only technical identity and UTC time. */
@SuppressLint("ApplySharedPref") // Durable writes must complete before confirming native operations.
object TaskReminderStore {
  const val CHANNEL = "project-task-reminders"
  private const val PREFS = "task_reminders"
  private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  private fun alarms(c: Context) = c.getSystemService(AlarmManager::class.java)
  private fun intent(c: Context, id: String) = Intent(c, TaskReminderAlarmReceiver::class.java)
    .setAction("com.gerenciadortarefas.TASK_REMINDER_ALARM")
    .setData(Uri.parse("task-reminders:" + Uri.encode(id)))
    .putExtra("notificationId", id)
  private fun pending(c: Context, id: String, flags: Int) = PendingIntent.getBroadcast(
    c, 0, intent(c, id), flags or PendingIntent.FLAG_IMMUTABLE)

  private fun channel(c: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      c.getSystemService(NotificationManager::class.java).createNotificationChannel(
        NotificationChannel(CHANNEL, "Lembretes de tarefas", NotificationManager.IMPORTANCE_HIGH))
    }
  }

  fun usable(c: Context): Boolean {
    channel(c)
    return NotificationManagerCompat.from(c).areNotificationsEnabled() &&
      (Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
        c.getSystemService(NotificationManager::class.java).getNotificationChannel(CHANNEL).importance != NotificationManager.IMPORTANCE_NONE)
  }

  private fun arm(c: Context, id: String, at: Long) {
    alarms(c).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at,
      pending(c, id, PendingIntent.FLAG_UPDATE_CURRENT)!!)
  }

  @Synchronized fun schedule(c: Context, id: String, at: Double): String {
    require(Regex("^task-reminder:[^:]+:[^:]+$").matches(id)) { "Canonical Task/Reminder identity required" }
    require(at.isFinite() && at > System.currentTimeMillis() && at <= Long.MAX_VALUE.toDouble()) { "Future trigger required" }
    check(usable(c)) { "Notifications unavailable; schedule refused" }
    val record = JSONObject().put("notificationId", id).put("triggerAt", at.toLong())
    check(prefs(c).edit().putString(id, record.toString()).commit()) { "Could not persist reminder record" }
    try { arm(c, id, at.toLong()) } catch (e: Exception) {
      prefs(c).edit().remove(id).commit()
      pending(c, id, PendingIntent.FLAG_NO_CREATE)?.let { alarms(c).cancel(it); it.cancel() }
      throw e
    }
    Log.i("TaskReminders", "scheduled $record")
    return record.toString()
  }

  @Synchronized fun cancel(c: Context, id: String): String {
    pending(c, id, PendingIntent.FLAG_NO_CREATE)?.let { alarms(c).cancel(it); it.cancel() }
    check(prefs(c).edit().remove(id).commit()) { "Could not remove reminder record" }
    c.getSystemService(NotificationManager::class.java).cancel(id, 0)
    Log.i("TaskReminders", "cancelled $id")
    return scheduled(c)
  }

  @Synchronized fun scheduled(c: Context): String {
    val records = org.json.JSONArray()
    prefs(c).all.values.forEach { records.put(JSONObject(it as String)) }
    return JSONObject().put("usable", usable(c)).put("records", records).toString()
  }

  /** Recovery NEVER publishes, even when invoked after stopped state ends. */
  @Synchronized fun recover(c: Context, reason: String) {
    val now = System.currentTimeMillis()
    prefs(c).all.forEach { (id, raw) ->
      val record = JSONObject(raw as String)
      val at = record.getLong("triggerAt")
      if (at <= now || !usable(c)) {
        cancel(c, id)
        Log.i("TaskReminders", "recovery discarded id=$id triggerAt=$at now=$now reason=$reason")
      } else {
        arm(c, id, at)
        Log.i("TaskReminders", "recovery rearmed id=$id triggerAt=$at now=$now reason=$reason")
      }
    }
  }

  /** Only a real AlarmManager delivery may publish late. Recovery has a separate path. */
  @SuppressLint("MissingPermission") // usable() checks global permission/channel; notify also catches revocation.
  @Synchronized fun deliver(c: Context, id: String) {
    val raw = prefs(c).getString(id, null) ?: return
    val record = JSONObject(raw)
    val at = record.getLong("triggerAt")
    val now = System.currentTimeMillis()
    if (now < at) { arm(c, id, at); return }
    check(prefs(c).edit().remove(id).commit()) { "Could not consume reminder record" }
    if (!usable(c)) {
      Log.i("TaskReminders", "delivery denied id=$id triggerAt=$at now=$now")
      return
    }
    val notification = NotificationCompat.Builder(c, CHANNEL)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle("Gestor Diário")
      .setContentText("Você tem uma tarefa próxima do prazo.")
      .setAutoCancel(true).build()
    try {
      c.getSystemService(NotificationManager::class.java).notify(id, 0, notification)
      Log.i("TaskReminders", "delivered id=$id triggerAt=$at deliveredAt=$now delayMs=${now - at}")
    } catch (e: SecurityException) {
      Log.i("TaskReminders", "delivery permission revoked id=$id")
    }
  }
}
