package com.gerenciadortarefas.qr

import com.google.zxing.*
import com.google.zxing.common.HybridBinarizer
import java.nio.ByteBuffer

internal class QrFrameDecoder {
  private val reader = MultiFormatReader().apply {
    setHints(mapOf(
      DecodeHintType.POSSIBLE_FORMATS to listOf(BarcodeFormat.QR_CODE),
      DecodeHintType.CHARACTER_SET to "UTF-8",
      DecodeHintType.TRY_HARDER to true
    ))
  }
  /** Copy luminance only, respecting camera plane padding and crop. QR reader handles orientation. */
  fun decode(buffer: ByteBuffer, rowStride: Int, pixelStride: Int,
    left: Int, top: Int, width: Int, height: Int): String? {
    val y = ByteArray(width * height)
    val base = buffer.position()
    for (row in 0 until height) for (col in 0 until width) {
      y[row * width + col] = buffer.get(base + (top + row) * rowStride + (left + col) * pixelStride)
    }
    return decodeLuminance(y, width, height)
  }
  fun decodeLuminance(y: ByteArray, width: Int, height: Int): String? {
    val source = PlanarYUVLuminanceSource(y, width, height, 0, 0, width, height, false)
    return try {
      reader.decodeWithState(BinaryBitmap(HybridBinarizer(source))).text
    } catch (_: NotFoundException) {
      null
    } finally { reader.reset() }
  }
}
