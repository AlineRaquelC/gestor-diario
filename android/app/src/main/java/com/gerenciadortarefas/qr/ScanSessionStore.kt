package com.gerenciadortarefas.qr

/** Session identity and terminal delivery, independent of Android and testable on JVM. */
internal class ScanSessionStore<T> {
  private var active: Pair<String, T>? = null
  @Synchronized fun begin(id: String, value: T): Boolean {
    if (active != null) return false
    active = id to value
    return true
  }
  @Synchronized fun get(id: String): T? = active?.takeIf { it.first == id }?.second
  @Synchronized fun finish(id: String): T? {
    val value = get(id) ?: return null
    active = null
    return value
  }
}
