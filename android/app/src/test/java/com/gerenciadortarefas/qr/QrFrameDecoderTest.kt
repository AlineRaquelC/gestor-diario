package com.gerenciadortarefas.qr
import com.google.zxing.*
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.oned.Code128Writer
import org.junit.Assert.*
import org.junit.Test
import java.nio.ByteBuffer

class QrFrameDecoderTest {
  private val payload = """{"version":1,"title":"QA66 café","priority":"medium"}"""
  private fun luminance(matrix: com.google.zxing.common.BitMatrix) =
    ByteArray(matrix.width * matrix.height) { i -> if (matrix[i % matrix.width, i / matrix.width]) 0 else 255.toByte() }
  @Test fun decodesKnownUtf8QrFromPaddedCroppedPlane() {
    val matrix = QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, 320, 320,
      mapOf(EncodeHintType.CHARACTER_SET to "UTF-8"))
    val width = matrix.width
    val stride = (width + 4) * 2 + 16
    val offset = 7
    val bytes = ByteArray(offset + stride * (matrix.height + 3)) { 127 }
    for (y in 0 until matrix.height) for (x in 0 until width) {
      bytes[offset + (y + 2) * stride + (x + 3) * 2] = if (matrix[x,y]) 0 else 255.toByte()
    }
    val buffer = ByteBuffer.wrap(bytes).apply { position(offset) }.asReadOnlyBuffer()
    assertEquals(payload, QrFrameDecoder().decode(buffer, stride, 2, 3, 2, width, matrix.height))
  }
  @Test fun decodesQuarterTurnWithoutUnsupportedLuminanceRotation() {
    val matrix = QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, 320, 320,
      mapOf(EncodeHintType.CHARACTER_SET to "UTF-8"))
    val y = luminance(matrix)
    val rotated = ByteArray(y.size)
    for (row in 0 until matrix.height) for (col in 0 until matrix.width) {
      rotated[col * matrix.height + matrix.height - row - 1] = y[row * matrix.width + col]
    }
    assertEquals(payload, QrFrameDecoder().decodeLuminance(rotated, matrix.height, matrix.width))
  }
  @Test fun doesNotDecodeLinearBarcodeOrBlankFrame() {
    val barcode = Code128Writer().encode("QA66", BarcodeFormat.CODE_128, 640, 240)
    val decoder = QrFrameDecoder()
    assertNull(decoder.decodeLuminance(luminance(barcode), barcode.width, barcode.height))
    assertNull(decoder.decodeLuminance(ByteArray(320 * 320) { 255.toByte() }, 320, 320))
  }
}
