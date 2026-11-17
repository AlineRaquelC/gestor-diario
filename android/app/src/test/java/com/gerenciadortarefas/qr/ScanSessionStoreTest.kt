package com.gerenciadortarefas.qr
import org.junit.Assert.*
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.atomic.AtomicInteger

class ScanSessionStoreTest {
  @Test fun cancellationAndLateResultDoNotAffectNextSession() {
    val store = ScanSessionStore<String>()
    assertTrue(store.begin("old", "first"))
    assertFalse(store.begin("duplicate", "ignored"))
    assertNull(store.finish("wrong"))
    assertEquals("first", store.finish("old"))
    assertTrue(store.begin("new", "second"))
    assertNull(store.finish("old"))
    assertEquals("second", store.get("new"))
    assertEquals("second", store.finish("new"))
    assertNull(store.finish("new"))
  }
  @Test fun competingCallbacksCanDeliverOnlyOneTerminalValue() {
    val store = ScanSessionStore<String>()
    store.begin("session", "payload")
    val start = CountDownLatch(1)
    val winners = AtomicInteger()
    val threads = (1..16).map {
      Thread { start.await(); if (store.finish("session") != null) winners.incrementAndGet() }.apply { start() }
    }
    start.countDown()
    threads.forEach { it.join() }
    assertEquals(1, winners.get())
    assertTrue(store.begin("next", "available"))
  }
}
