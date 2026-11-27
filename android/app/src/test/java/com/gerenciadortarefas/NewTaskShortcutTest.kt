package com.gerenciadortarefas

import android.content.Intent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NewTaskShortcutTest {
  @Test
  fun api24DoesNotAccessPublisher() {
    publishShortcut(24, { error("Publisher called on API 24") }, { throw it })
  }

  @Test
  fun api25AndLaterAccessPublisher() {
    var calls = 0
    listOf(25, 26, 36).forEach { sdk ->
      publishShortcut(sdk, { calls++ }, { throw it })
    }
    assertEquals(3, calls)
  }

  @Test
  fun optionalPublisherAndApiFailureDoNotBlockStartup() {
    var failure: RuntimeException? = null
    publishShortcut(25, {}, { failure = it })
    assertNull(failure)
    val rejected = IllegalStateException("Service unavailable")
    publishShortcut(36, { throw rejected }, { failure = it })
    assertEquals(rejected, failure)
  }

  @Test
  fun acceptsOnlyExactActionAndUriAndCreatesFreshDeliveryIds() {
    val deliveries = ShortcutDeliveries()
    assertNull(deliveries.receive(Intent.ACTION_MAIN, NEW_TASK_SHORTCUT_URI))
    assertNull(deliveries.receive(Intent.ACTION_VIEW, null))
    listOf("/1", "?title=payload", "#fragment", "/").forEach { suffix ->
      assertNull(deliveries.receive(Intent.ACTION_VIEW, NEW_TASK_SHORTCUT_URI + suffix))
    }
    assertEquals("$NEW_TASK_SHORTCUT_URI/1", deliveries.receive(Intent.ACTION_VIEW, NEW_TASK_SHORTCUT_URI))
    assertEquals("$NEW_TASK_SHORTCUT_URI/2", deliveries.receive(Intent.ACTION_VIEW, NEW_TASK_SHORTCUT_URI))
  }

  @Test
  fun recreationPreservesIdOnlyWithinTheSameProcess() {
    val deliveries = ShortcutDeliveries()
    val url = deliveries.receive(Intent.ACTION_VIEW, NEW_TASK_SHORTCUT_URI)
    assertEquals(url, deliveries.restore(deliveries.processToken, url))
    assertNull(ShortcutDeliveries().restore(deliveries.processToken, url))
  }
}
