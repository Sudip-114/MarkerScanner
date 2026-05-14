package com.markerscanner.camera

import android.graphics.ImageFormat
import android.util.Base64
import androidx.camera.core.ImageProxy
import com.facebook.react.bridge.WritableNativeMap
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import com.markerscanner.opencv.MarkerDetectorModule
import java.nio.ByteBuffer

/**
 * VisionCamera Frame Processor Plugin
 *
 * Registered as "detectMarker" — called from JS worklet via:
 *   const result = detectMarker(frame)
 *
 * Bridges between the VisionCamera Frame object (wrapping Android ImageProxy)
 * and our native JNI detection pipeline.
 */
class MarkerDetectorPlugin(proxy: VisionCameraProxy, options: Map<String, Any>?) :
    FrameProcessorPlugin() {

    companion object {
        // Thread-local native library loader guard
        @Volatile private var nativeLibLoaded = false

        @Synchronized
        fun ensureNativeLib() {
            if (!nativeLibLoaded) {
                System.loadLibrary("markerscanner-jni")
                nativeLibLoaded = true
            }
        }
    }

    // JNI declaration (same function as in MarkerDetectorModule, shared native lib)
    private external fun nativeProcessYUV(
        yData: ByteArray, uData: ByteArray, vData: ByteArray,
        width: Int, height: Int,
        yStride: Int, uvStride: Int, uvPixelStride: Int,
    ): ByteArray

    init {
        ensureNativeLib()
    }

    /**
     * Called on every camera frame in the VisionCamera pipeline thread.
     * Must be fast — runs on a high-priority background thread.
     */
    override fun callback(frame: Frame, arguments: Map<String, Any>?): Any? {
        val image = frame.image

        return try {
            when (image.format) {
                ImageFormat.YUV_420_888 -> processYUV420(image)
                else -> {
                    // Unsupported format — return not-detected stub
                    WritableNativeMap().apply { putBoolean("detected", false) }
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("MarkerDetectorPlugin", "Frame processing error: ${e.message}")
            null
        }
    }

    // ── YUV_420_888 processing ────────────────────────────────────────────────

    private fun processYUV420(image: ImageProxy): Map<String, Any?> {
        val yPlane  = image.planes[0]
        val uPlane  = image.planes[1]
        val vPlane  = image.planes[2]

        val yBuf  = yPlane.buffer
        val uBuf  = uPlane.buffer
        val vBuf  = vPlane.buffer

        val yBytes  = ByteArray(yBuf.remaining()).also { yBuf.get(it) }
        val uBytes  = ByteArray(uBuf.remaining()).also { uBuf.get(it) }
        val vBytes  = ByteArray(vBuf.remaining()).also { vBuf.get(it) }

        val raw = nativeProcessYUV(
            yBytes, uBytes, vBytes,
            image.width, image.height,
            yPlane.rowStride,
            uPlane.rowStride,
            uPlane.pixelStride,
        )

        return parseRawResult(raw)
    }

    // ── Parse native serialised result ─────────────────────────────────────────

    private fun parseRawResult(raw: ByteArray): Map<String, Any?> {
        val buf = ByteBuffer.wrap(raw)

        val detected   = buf.get().toInt() == 1
        val confidence = buf.float
        val procMs     = buf.int
        val cx = Array(4) { floatArrayOf(buf.float, buf.float) }

        val result = mutableMapOf<String, Any?>()
        result["detected"]       = detected
        result["confidence"]     = confidence.toDouble()
        result["processingTimeMs"] = procMs

        if (detected) {
            result["corners"] = mapOf(
                "topLeft"     to mapOf("x" to cx[0][0].toDouble(), "y" to cx[0][1].toDouble()),
                "topRight"    to mapOf("x" to cx[1][0].toDouble(), "y" to cx[1][1].toDouble()),
                "bottomRight" to mapOf("x" to cx[2][0].toDouble(), "y" to cx[2][1].toDouble()),
                "bottomLeft"  to mapOf("x" to cx[3][0].toDouble(), "y" to cx[3][1].toDouble()),
            )
            if (buf.remaining() > 0) {
                val png = ByteArray(buf.remaining()).also { buf.get(it) }
                result["processedImageBase64"] = Base64.encodeToString(png, Base64.NO_WRAP)
            } else {
                result["processedImageBase64"] = null
            }
        } else {
            result["corners"] = null
            result["processedImageBase64"] = null
        }

        return result
    }
}
