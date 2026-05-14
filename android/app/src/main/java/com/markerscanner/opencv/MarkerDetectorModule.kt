package com.markerscanner.opencv

import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import java.nio.ByteBuffer

/**
 * MarkerDetectorModule
 *
 * React Native Native Module that exposes the C++ OpenCV marker detection
 * pipeline to JavaScript.
 *
 * Also registers a VisionCamera Frame Processor Plugin "detectMarker"
 * so it can be called directly from VisionCamera frame processor worklets.
 */
@ReactModule(name = MarkerDetectorModule.NAME)
class MarkerDetectorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "MarkerDetectorModule"

        init {
            // Load native shared library
            System.loadLibrary("markerscanner-jni")
        }
    }

    override fun getName() = NAME

    // ── JNI declaration ──────────────────────────────────────────────────────

    /**
     * Processes a single YUV_420_888 frame from VisionCamera.
     * Returns a serialised byte array; see MarkerDetectorJni.cpp for format.
     */
    private external fun nativeProcessYUV(
        yData: ByteArray,
        uData: ByteArray,
        vData: ByteArray,
        width: Int,
        height: Int,
        yStride: Int,
        uvStride: Int,
        uvPixelStride: Int,
    ): ByteArray

    // ── Public React Native method ────────────────────────────────────────────

    /**
     * JS-callable method. Accepts a frame descriptor map and returns
     * a WritableMap with detection results.
     *
     * Called from JS for any fallback path; the primary path goes
     * through the VisionCamera Frame Processor plugin.
     */
    @ReactMethod
    fun processFrame(frameData: ReadableMap, promise: Promise) {
        try {
            val yB64  = frameData.getString("yData")  ?: throw IllegalArgumentException("Missing yData")
            val uB64  = frameData.getString("uData")  ?: throw IllegalArgumentException("Missing uData")
            val vB64  = frameData.getString("vData")  ?: throw IllegalArgumentException("Missing vData")
            val w     = frameData.getInt("width")
            val h     = frameData.getInt("height")
            val ys    = frameData.getInt("yStride")
            val uvs   = frameData.getInt("uvStride")
            val uvps  = frameData.getInt("uvPixelStride")

            val yData = Base64.decode(yB64, Base64.DEFAULT)
            val uData = Base64.decode(uB64, Base64.DEFAULT)
            val vData = Base64.decode(vB64, Base64.DEFAULT)

            val raw = nativeProcessYUV(yData, uData, vData, w, h, ys, uvs, uvps)
            promise.resolve(parseNativeResult(raw))
        } catch (e: Exception) {
            promise.reject("DETECTION_ERROR", e.message, e)
        }
    }

    // ── Result parsing ────────────────────────────────────────────────────────

    private fun parseNativeResult(raw: ByteArray): WritableMap {
        val buf = ByteBuffer.wrap(raw)

        val detected = buf.get().toInt() == 1

        val confBytes = ByteArray(4).also { buf.get(it) }
        val confidence = ByteBuffer.wrap(confBytes).float

        val msBytes = ByteArray(4).also { buf.get(it) }
        val processingMs = ByteBuffer.wrap(msBytes).int

        // 8 corner floats (32 bytes)
        val cornerFloats = FloatArray(8)
        for (i in 0 until 8) {
            val b = ByteArray(4).also { buf.get(it) }
            cornerFloats[i] = ByteBuffer.wrap(b).float
        }

        val result = WritableNativeMap()
        result.putBoolean("detected", detected)
        result.putDouble("confidence", confidence.toDouble())
        result.putInt("processingTimeMs", processingMs)

        // Corners
        val corners = WritableNativeMap()
        if (detected) {
            fun pointMap(x: Float, y: Float): WritableMap = WritableNativeMap().apply {
                putDouble("x", x.toDouble())
                putDouble("y", y.toDouble())
            }
            corners.putMap("topLeft",     pointMap(cornerFloats[0], cornerFloats[1]))
            corners.putMap("topRight",    pointMap(cornerFloats[2], cornerFloats[3]))
            corners.putMap("bottomRight", pointMap(cornerFloats[4], cornerFloats[5]))
            corners.putMap("bottomLeft",  pointMap(cornerFloats[6], cornerFloats[7]))
        }
        result.putMap("corners", corners)

        // PNG image → base64
        if (detected && buf.remaining() > 0) {
            val pngBytes = ByteArray(buf.remaining()).also { buf.get(it) }
            result.putString("processedImageBase64", Base64.encodeToString(pngBytes, Base64.NO_WRAP))
        } else {
            result.putNull("processedImageBase64")
        }

        return result
    }
}
