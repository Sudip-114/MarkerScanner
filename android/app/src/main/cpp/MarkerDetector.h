#pragma once

/**
 * MarkerDetector.h
 *
 * Core computer vision pipeline for detecting and extracting
 * the custom square marker from a camera frame.
 *
 * Pipeline:
 *   1. Grayscale conversion
 *   2. Adaptive threshold (Gaussian, block-size 11)
 *   3. Contour detection (RETR_LIST, CHAIN_APPROX_SIMPLE)
 *   4. Polygon approximation (approxPolyDP)
 *   5. Quadrilateral filter (4 corners, convex, area in range)
 *   6. Aspect ratio check (square-ness)
 *   7. Perspective warp → 300×300 canonical image
 *   8. Marker pattern validation (border + anchor squares)
 *   9. Orientation normalization
 *  10. Return 300×300 result
 */

#include <opencv2/opencv.hpp>
#include <vector>
#include <optional>

namespace MarkerScanner {

// ─── Constants ────────────────────────────────────────────────────────────────

constexpr int   OUTPUT_SIZE          = 300;
constexpr int   GRID_CELLS           = 7;
constexpr float CELL_PX              = static_cast<float>(OUTPUT_SIZE) / GRID_CELLS;
// Minimum and maximum ratio of marker area to total frame area
constexpr float MIN_AREA_RATIO       = 0.004f;
constexpr float MAX_AREA_RATIO       = 0.70f;
// How close to 1.0 the aspect ratio must be
constexpr float ASPECT_TOL           = 0.15f;
// Polygon approximation epsilon (fraction of perimeter)
constexpr float POLY_EPSILON_FACTOR  = 0.03f;
// Threshold for inner white area fraction (must be ≥ 60%)
constexpr float MIN_INNER_WHITE      = 0.60f;
// Border black fraction threshold
constexpr float MIN_BORDER_BLACK     = 0.70f;
// Anchor pattern match threshold (out of 3 anchor squares)
constexpr int   MIN_ANCHOR_MATCHES   = 3;

// ─── Data Structures ─────────────────────────────────────────────────────────

struct Corner {
    float x, y;
};

struct DetectionResult {
    bool         detected       = false;
    Corner       corners[4];        // TL, TR, BR, BL (frame coordinates)
    cv::Mat      processedImage;    // 300×300 RGBA Mat
    float        confidence     = 0.f;
    int64_t      processingMs   = 0;
};

// ─── Detector Class ───────────────────────────────────────────────────────────

class MarkerDetector {
public:
    MarkerDetector() = default;
    ~MarkerDetector() = default;

    /**
     * Process a single camera frame.
     * @param frame  Input YUV_420_888 or RGBA Mat (as decoded by VisionCamera JNI bridge)
     * @return       Detection result (detected=false if no valid marker found)
     */
    DetectionResult processFrame(const cv::Mat& frame);

private:
    // ── Pipeline stages ──────────────────────────────────────────────────────

    cv::Mat         preprocessFrame(const cv::Mat& frame);
    std::vector<std::vector<cv::Point>> findCandidateContours(const cv::Mat& thresholded);
    std::optional<std::vector<cv::Point>> selectBestQuadrilateral(
        const std::vector<std::vector<cv::Point>>& quads,
        const cv::Size& frameSize
    );
    cv::Mat         perspectiveWarp(const cv::Mat& frame,
                                    const std::vector<cv::Point>& corners);
    bool            validateMarkerPattern(const cv::Mat& warped300);
    cv::Mat         correctOrientation(const cv::Mat& warped300);
    float           computeConfidence(const cv::Mat& warped300,
                                      const std::vector<cv::Point>& quad,
                                      const cv::Size& frameSize);

    // ── Helpers ───────────────────────────────────────────────────────────────

    std::vector<cv::Point> orderCorners(const std::vector<cv::Point>& corners);
    float   cellMeanBrightness(const cv::Mat& img, int row, int col) const;
    bool    isCellBlack(const cv::Mat& img, int row, int col) const;
    bool    isCellWhite(const cv::Mat& img, int row, int col) const;
    int     detectRotationSteps(const cv::Mat& warped) const;

    // ── Reusable scratch buffers (avoids per-frame allocation) ────────────────
    cv::Mat m_gray;
    cv::Mat m_thresh;
    cv::Mat m_hierarchy_dummy;
};

} // namespace MarkerScanner
