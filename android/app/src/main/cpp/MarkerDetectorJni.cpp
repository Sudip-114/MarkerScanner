/**
 * MarkerDetectorJni.cpp
 *
 * JNI bridge exposing the C++ MarkerDetector to Java/Kotlin.
 * Also implements the VisionCamera Frame Processor Plugin interface.
 *
 * The Frame Processor Plugin name registered here is "detectMarker".
 * It is referenced in the JS Frame Processor worklet as: detectMarker(frame)
 */

#include <jni.h>
#include <string>
#include <android/log.h>
#include <android/bitmap.h>

#include "MarkerDetector.h"
#include <opencv2/opencv.hpp>

#define LOG_TAG "MarkerDetectorJni"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO,  LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Thread-local detector instance (avoid contention; one per VisionCamera thread)
thread_local static MarkerScanner::MarkerDetector tl_detector;

extern "C" {

// ─────────────────────────────────────────────────────────────────────────────
//  Core JNI method called from Java MarkerDetectorModule
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processes a YUV_420_888 camera frame passed as raw byte arrays.
 *
 * @param yData    Y plane bytes
 * @param uData    U plane bytes
 * @param vData    V plane bytes
 * @param width    Frame width in pixels
 * @param height   Frame height in pixels
 * @param yStride  Y plane row stride
 * @param uvStride UV plane row stride
 * @param uvPixelStride UV pixel stride
 *
 * @return jbyteArray: serialized result as:
 *   [0]    detected (0 or 1)
 *   [1-4]  confidence as float (4 bytes)
 *   [5-8]  processingMs as int32 (4 bytes)
 *   [9-40] 8 floats: TL.x TL.y TR.x TR.y BR.x BR.y BL.x BL.y
 *   [41..] PNG-encoded 300×300 image (if detected)
 */
JNIEXPORT jbyteArray JNICALL
Java_com_markerscanner_opencv_MarkerDetectorModule_nativeProcessYUV(
    JNIEnv* env,
    jobject /* this */,
    jbyteArray yData,
    jbyteArray uData,
    jbyteArray vData,
    jint width,
    jint height,
    jint yStride,
    jint uvStride,
    jint uvPixelStride)
{
    // ── Convert YUV_420_888 → RGBA Mat ──────────────────────────────────────

    jbyte* yPtr = env->GetByteArrayElements(yData, nullptr);
    jbyte* uPtr = env->GetByteArrayElements(uData, nullptr);
    jbyte* vPtr = env->GetByteArrayElements(vData, nullptr);

    cv::Mat yuv(height + height / 2, width, CV_8UC1);

    // Fill Y plane
    for (int row = 0; row < height; row++) {
        memcpy(yuv.ptr(row), yPtr + row * yStride, width);
    }

    // Fill UV interleaved (NV21 layout for OpenCV conversion)
    for (int row = 0; row < height / 2; row++) {
        uchar* uvRow = yuv.ptr(height + row);
        for (int col = 0; col < width / 2; col++) {
            uvRow[col * 2]     = static_cast<uchar>(vPtr[row * uvStride + col * uvPixelStride]);
            uvRow[col * 2 + 1] = static_cast<uchar>(uPtr[row * uvStride + col * uvPixelStride]);
        }
    }

    env->ReleaseByteArrayElements(yData, yPtr, JNI_ABORT);
    env->ReleaseByteArrayElements(uData, uPtr, JNI_ABORT);
    env->ReleaseByteArrayElements(vData, vPtr, JNI_ABORT);

    cv::Mat rgba;
    cv::cvtColor(yuv, rgba, cv::COLOR_YUV2RGBA_NV21);

    // ── Run detection pipeline ───────────────────────────────────────────────

    auto result = tl_detector.processFrame(rgba);

    // ── Serialise result ─────────────────────────────────────────────────────

    std::vector<uchar> pngBuffer;
    if (result.detected && !result.processedImage.empty()) {
        cv::imencode(".png", result.processedImage, pngBuffer);
    }

    // Header: 1 + 4 + 4 + 32 = 41 bytes
    // Body: PNG data (variable)
    size_t headerSize = 41;
    size_t totalSize = headerSize + pngBuffer.size();

    jbyteArray output = env->NewByteArray(static_cast<jsize>(totalSize));
    std::vector<jbyte> buf(totalSize, 0);

    buf[0] = result.detected ? 1 : 0;

    // confidence (float, 4 bytes)
    uint32_t confBits;
    memcpy(&confBits, &result.confidence, 4);
    buf[1] = (confBits >> 24) & 0xFF;
    buf[2] = (confBits >> 16) & 0xFF;
    buf[3] = (confBits >> 8)  & 0xFF;
    buf[4] = confBits         & 0xFF;

    // processingMs (int32, 4 bytes)
    int32_t ms = static_cast<int32_t>(result.processingMs);
    buf[5] = (ms >> 24) & 0xFF;
    buf[6] = (ms >> 16) & 0xFF;
    buf[7] = (ms >> 8)  & 0xFF;
    buf[8] = ms         & 0xFF;

    // Corners: 8 floats = 32 bytes (starting at buf[9])
    float cornerData[8] = {
        result.corners[0].x, result.corners[0].y,
        result.corners[1].x, result.corners[1].y,
        result.corners[2].x, result.corners[2].y,
        result.corners[3].x, result.corners[3].y,
    };
    uint32_t bits;
    for (int i = 0; i < 8; i++) {
        memcpy(&bits, &cornerData[i], 4);
        buf[9 + i * 4 + 0] = (bits >> 24) & 0xFF;
        buf[9 + i * 4 + 1] = (bits >> 16) & 0xFF;
        buf[9 + i * 4 + 2] = (bits >> 8)  & 0xFF;
        buf[9 + i * 4 + 3] = bits         & 0xFF;
    }

    // PNG payload
    if (!pngBuffer.empty()) {
        memcpy(buf.data() + headerSize, pngBuffer.data(), pngBuffer.size());
    }

    env->SetByteArrayRegion(output, 0, static_cast<jsize>(totalSize),
                            buf.data());
    return output;
}

} // extern "C"
