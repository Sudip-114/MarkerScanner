/**
 * MarkerDetector.cpp
 *
 * Full implementation of the custom marker detection pipeline.
 *
 * Custom marker description
 * ─────────────────────────
 * The marker is a 7×7 grid printed in black on white background.
 * Cell (r,c) coordinates are 0-indexed, row-major, top-to-bottom.
 *
 * BORDER RING (cells at row 0, row 6, col 0, col 6):
 *   All black.
 *
 * ANCHOR SQUARES (3 finder squares, each 1×1 cell):
 *   Position (1,1) — top-left anchor
 *   Position (1,5) — top-right anchor
 *   Position (5,1) — bottom-left anchor
 *   (Note: bottom-right (5,5) is intentionally absent — creates asymmetry
 *    that allows unambiguous orientation detection)
 *
 * TIMING STRIP (row 3, cols 1–5, alternating B/W):
 *   (3,1)=B  (3,2)=W  (3,3)=B  (3,4)=W  (3,5)=B
 *
 * INTERIOR (rows 2,4, cols 2–4):
 *   All white (open space — 60%+ constraint satisfied)
 *
 * The combination of 3 anchors + timing strip + absent 4th anchor
 * makes this marker uniquely identifiable and orientation-deterministic.
 */

#include "MarkerDetector.h"
#include <android/log.h>
#include <chrono>
#include <cmath>
#include <algorithm>

#define LOG_TAG "MarkerDetector"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO,  LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN,  LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace MarkerScanner {

// ─────────────────────────────────────────────────────────────────────────────
//  Public entry point
// ─────────────────────────────────────────────────────────────────────────────

DetectionResult MarkerDetector::processFrame(const cv::Mat& frame) {
    auto t0 = std::chrono::steady_clock::now();

    DetectionResult result;

    // 1. Pre-process (grayscale + adaptive threshold)
    cv::Mat thresh = preprocessFrame(frame);

    // 2. Find quadrilateral contour candidates
    auto contours = findCandidateContours(thresh);

    // 3. Pick the best quad that passes geometric filters
    auto quadOpt = selectBestQuadrilateral(contours, frame.size());
    if (!quadOpt.has_value()) {
        auto t1 = std::chrono::steady_clock::now();
        result.processingMs = std::chrono::duration_cast<std::chrono::milliseconds>(t1-t0).count();
        return result;
    }

    const auto& quad = *quadOpt;

    // 4. Perspective-correct warp to 300×300
    cv::Mat warped = perspectiveWarp(frame, quad);
    if (warped.empty()) {
        return result;
    }

    // 5. Validate custom marker pattern
    if (!validateMarkerPattern(warped)) {
        return result;
    }

    // 6. Orientation correction
    cv::Mat oriented = correctOrientation(warped);

    // 7. Compute confidence
    float confidence = computeConfidence(warped, quad, frame.size());

    // 8. Fill result
    result.detected     = true;
    result.confidence   = confidence;
    result.processedImage = oriented;

    // Store corners (ordered: TL, TR, BR, BL)
    auto ordered = orderCorners(quad);
    for (int i = 0; i < 4; i++) {
        result.corners[i] = {static_cast<float>(ordered[i].x),
                             static_cast<float>(ordered[i].y)};
    }

    auto t1 = std::chrono::steady_clock::now();
    result.processingMs = std::chrono::duration_cast<std::chrono::milliseconds>(t1-t0).count();

    LOGI("Marker detected — confidence=%.2f  time=%lldms",
         confidence, (long long)result.processingMs);

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Stage 1 — Pre-processing
// ─────────────────────────────────────────────────────────────────────────────

cv::Mat MarkerDetector::preprocessFrame(const cv::Mat& frame) {
    // Convert to grayscale
    if (frame.channels() == 4) {
        cv::cvtColor(frame, m_gray, cv::COLOR_RGBA2GRAY);
    } else if (frame.channels() == 3) {
        cv::cvtColor(frame, m_gray, cv::COLOR_BGR2GRAY);
    } else {
        m_gray = frame.clone();
    }

    // Slight Gaussian blur to remove sensor noise before thresholding
    cv::GaussianBlur(m_gray, m_gray, cv::Size(5, 5), 0);

    // Adaptive threshold — handles uneven illumination
    // Block size 11, constant C=2
    cv::adaptiveThreshold(
        m_gray, m_thresh,
        255,
        cv::ADAPTIVE_THRESH_GAUSSIAN_C,
        cv::THRESH_BINARY_INV,  // black→white so contours are white on black
        11, 2
    );

    // Morphological close to join broken edges
    cv::Mat kernel = cv::getStructuringElement(cv::MORPH_RECT, {3, 3});
    cv::morphologyEx(m_thresh, m_thresh, cv::MORPH_CLOSE, kernel);

    return m_thresh;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Stage 2 — Contour detection
// ─────────────────────────────────────────────────────────────────────────────

std::vector<std::vector<cv::Point>>
MarkerDetector::findCandidateContours(const cv::Mat& thresholded) {
    std::vector<std::vector<cv::Point>> contours;
    std::vector<cv::Vec4i> hierarchy;

    cv::findContours(
        thresholded, contours, hierarchy,
        cv::RETR_LIST,
        cv::CHAIN_APPROX_SIMPLE
    );

    std::vector<std::vector<cv::Point>> quads;
    quads.reserve(16);

    for (auto& c : contours) {
        // Skip tiny contours
        double area = cv::contourArea(c);
        if (area < 200.0) continue;

        // Approximate polygon
        double peri = cv::arcLength(c, true);
        std::vector<cv::Point> approx;
        cv::approxPolyDP(c, approx, POLY_EPSILON_FACTOR * peri, true);

        // Must be a quadrilateral
        if (approx.size() != 4) continue;

        // Must be convex
        if (!cv::isContourConvex(approx)) continue;

        quads.push_back(std::move(approx));
    }

    return quads;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Stage 3 — Select best quadrilateral
// ─────────────────────────────────────────────────────────────────────────────

std::optional<std::vector<cv::Point>>
MarkerDetector::selectBestQuadrilateral(
    const std::vector<std::vector<cv::Point>>& quads,
    const cv::Size& frameSize)
{
    const float frameArea = static_cast<float>(frameSize.width * frameSize.height);

    std::optional<std::vector<cv::Point>> best;
    double bestScore = -1.0;

    for (const auto& q : quads) {
        double area = cv::contourArea(q);
        float areaRatio = static_cast<float>(area) / frameArea;

        // Area range filter
        if (areaRatio < MIN_AREA_RATIO || areaRatio > MAX_AREA_RATIO) continue;

        // Bounding rect aspect ratio (must be close to 1.0 = square)
        cv::Rect bb = cv::boundingRect(q);
        if (bb.width == 0 || bb.height == 0) continue;

        float ar = static_cast<float>(bb.width) / static_cast<float>(bb.height);
        if (std::abs(ar - 1.0f) > ASPECT_TOL) continue;

        // Solidity: area / hull area (high solidity = compact, square-like)
        std::vector<cv::Point> hull;
        cv::convexHull(q, hull);
        double hullArea = cv::contourArea(hull);
        if (hullArea < 1.0) continue;
        double solidity = area / hullArea;
        if (solidity < 0.85) continue;

        // Score = area (prefer larger markers, up to a point)
        // We'll pick the largest valid quad as primary candidate
        double score = area;
        if (score > bestScore) {
            bestScore = score;
            best = q;
        }
    }

    return best;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Stage 4 — Perspective warp
// ─────────────────────────────────────────────────────────────────────────────

cv::Mat MarkerDetector::perspectiveWarp(
    const cv::Mat& frame,
    const std::vector<cv::Point>& corners)
{
    auto ordered = orderCorners(corners);

    // Source points (frame coordinates)
    std::vector<cv::Point2f> src = {
        {static_cast<float>(ordered[0].x), static_cast<float>(ordered[0].y)}, // TL
        {static_cast<float>(ordered[1].x), static_cast<float>(ordered[1].y)}, // TR
        {static_cast<float>(ordered[2].x), static_cast<float>(ordered[2].y)}, // BR
        {static_cast<float>(ordered[3].x), static_cast<float>(ordered[3].y)}, // BL
    };

    // Destination: 300×300 square
    std::vector<cv::Point2f> dst = {
        {0.f,                          0.f},
        {static_cast<float>(OUTPUT_SIZE - 1), 0.f},
        {static_cast<float>(OUTPUT_SIZE - 1), static_cast<float>(OUTPUT_SIZE - 1)},
        {0.f,                          static_cast<float>(OUTPUT_SIZE - 1)},
    };

    cv::Mat H = cv::getPerspectiveTransform(src, dst);

    cv::Mat warped;
    cv::Mat grayFrame;
    if (frame.channels() > 1) {
        cv::cvtColor(frame, grayFrame, frame.channels() == 4 ? cv::COLOR_RGBA2GRAY : cv::COLOR_BGR2GRAY);
    } else {
        grayFrame = frame;
    }

    cv::warpPerspective(grayFrame, warped, H, {OUTPUT_SIZE, OUTPUT_SIZE},
                        cv::INTER_LINEAR, cv::BORDER_CONSTANT, cv::Scalar(255));

    return warped;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Stage 5 — Marker pattern validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates the marker pattern against the canonical 7×7 grid spec.
 * Returns true only if the pattern matches (in any of 4 rotations).
 */
bool MarkerDetector::validateMarkerPattern(const cv::Mat& warped300) {
    // Binarise the warped image
    cv::Mat binary;
    cv::threshold(warped300, binary, 128, 255, cv::THRESH_BINARY | cv::THRESH_OTSU);

    // --- Check outer border ring (all cells must be black) ---
    int borderBlackCount = 0;
    int borderTotal = 0;
    for (int r = 0; r < GRID_CELLS; r++) {
        for (int c = 0; c < GRID_CELLS; c++) {
            bool isBorder = (r == 0 || r == GRID_CELLS-1 || c == 0 || c == GRID_CELLS-1);
            if (!isBorder) continue;
            borderTotal++;
            if (isCellBlack(binary, r, c)) borderBlackCount++;
        }
    }
    float borderFrac = static_cast<float>(borderBlackCount) / borderTotal;
    if (borderFrac < MIN_BORDER_BLACK) return false;

    // --- Check inner area white fraction (must be ≥ 60%) ---
    int innerWhiteCount = 0;
    int innerTotal = 0;
    for (int r = 1; r < GRID_CELLS - 1; r++) {
        for (int c = 1; c < GRID_CELLS - 1; c++) {
            innerTotal++;
            if (isCellWhite(binary, r, c)) innerWhiteCount++;
        }
    }
    float innerFrac = static_cast<float>(innerWhiteCount) / innerTotal;
    if (innerFrac < MIN_INNER_WHITE) return false;

    // --- Check anchor squares (in any rotation) ---
    // The 3 expected anchor positions for 0° (canonical orientation):
    //   (1,1), (1,5), (5,1)  — all black
    //   (5,5) — white (absent anchor, key distinguisher)
    int anchorsFound = detectRotationSteps(binary);
    // detectRotationSteps returns -1 if pattern not found, else 0..3
    return (anchorsFound >= 0);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Stage 6 — Orientation correction
// ─────────────────────────────────────────────────────────────────────────────

cv::Mat MarkerDetector::correctOrientation(const cv::Mat& warped300) {
    cv::Mat binary;
    cv::threshold(warped300, binary, 128, 255, cv::THRESH_BINARY | cv::THRESH_OTSU);

    int steps = detectRotationSteps(binary);
    if (steps <= 0) return warped300; // Already correct or unknown

    // Rotate by steps*90° counter-clockwise
    cv::Mat oriented;
    int rotCode = -1;
    switch (steps) {
        case 1: rotCode = cv::ROTATE_90_CLOCKWISE; break;
        case 2: rotCode = cv::ROTATE_180; break;
        case 3: rotCode = cv::ROTATE_90_COUNTERCLOCKWISE; break;
        default: return warped300;
    }
    cv::rotate(warped300, oriented, rotCode);
    return oriented;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Confidence score
// ─────────────────────────────────────────────────────────────────────────────

float MarkerDetector::computeConfidence(
    const cv::Mat& warped300,
    const std::vector<cv::Point>& quad,
    const cv::Size& frameSize)
{
    cv::Mat binary;
    cv::threshold(warped300, binary, 128, 255, cv::THRESH_BINARY | cv::THRESH_OTSU);

    // Factor 1: border blackness (higher = more confident)
    int borderBlack = 0, borderTotal = 0;
    for (int r = 0; r < GRID_CELLS; r++) {
        for (int c = 0; c < GRID_CELLS; c++) {
            if (r == 0 || r == GRID_CELLS-1 || c == 0 || c == GRID_CELLS-1) {
                borderTotal++;
                if (isCellBlack(binary, r, c)) borderBlack++;
            }
        }
    }
    float borderScore = static_cast<float>(borderBlack) / borderTotal;

    // Factor 2: area ratio within preferred range (penalise extremes)
    float frameArea = static_cast<float>(frameSize.width * frameSize.height);
    float area = static_cast<float>(cv::contourArea(quad));
    float areaRatio = area / frameArea;
    float areaScore = 1.0f - std::abs(areaRatio - 0.1f) / 0.1f;
    areaScore = std::max(0.0f, std::min(1.0f, areaScore));

    // Factor 3: quad regularity (how close to a perfect square)
    auto ordered = orderCorners(quad);
    float sides[4];
    for (int i = 0; i < 4; i++) {
        auto& p0 = ordered[i];
        auto& p1 = ordered[(i+1) % 4];
        float dx = p1.x - p0.x, dy = p1.y - p0.y;
        sides[i] = std::sqrt(dx*dx + dy*dy);
    }
    float meanSide = (sides[0]+sides[1]+sides[2]+sides[3]) / 4.f;
    float variance = 0.f;
    for (int i = 0; i < 4; i++) {
        float d = sides[i] - meanSide;
        variance += d*d;
    }
    variance /= 4.f;
    float squareScore = std::max(0.f, 1.f - std::sqrt(variance) / (meanSide + 1e-5f));

    return 0.5f * borderScore + 0.2f * areaScore + 0.3f * squareScore;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Order corners as: TL, TR, BR, BL
 * Uses centroid + angle heuristic.
 */
std::vector<cv::Point> MarkerDetector::orderCorners(const std::vector<cv::Point>& pts) {
    cv::Point2f centroid(0, 0);
    for (auto& p : pts) centroid += cv::Point2f(p);
    centroid *= (1.f / pts.size());

    // Sort by angle relative to centroid
    std::vector<std::pair<double, cv::Point>> angledPts;
    for (auto& p : pts) {
        double angle = std::atan2(p.y - centroid.y, p.x - centroid.x);
        angledPts.push_back({angle, p});
    }
    std::sort(angledPts.begin(), angledPts.end(),
              [](auto& a, auto& b) { return a.first < b.first; });

    // After angle sort: right, bottom-right, bottom-left, top-left (roughly)
    // We need: TL, TR, BR, BL
    // Sum of coords: TL has min sum, BR has max sum
    // Diff of coords: TR has min diff, BL has max diff
    std::vector<cv::Point> sorted;
    for (auto& ap : angledPts) sorted.push_back(ap.second);

    // Compute sums and diffs
    int minSumIdx = 0, maxSumIdx = 0, minDiffIdx = 0, maxDiffIdx = 0;
    for (int i = 1; i < 4; i++) {
        if (sorted[i].x + sorted[i].y < sorted[minSumIdx].x + sorted[minSumIdx].y) minSumIdx = i;
        if (sorted[i].x + sorted[i].y > sorted[maxSumIdx].x + sorted[maxSumIdx].y) maxSumIdx = i;
        if (sorted[i].x - sorted[i].y < sorted[minDiffIdx].x - sorted[minDiffIdx].y) minDiffIdx = i;
        if (sorted[i].x - sorted[i].y > sorted[maxDiffIdx].x - sorted[maxDiffIdx].y) maxDiffIdx = i;
    }

    return {sorted[minSumIdx], sorted[minDiffIdx], sorted[maxSumIdx], sorted[maxDiffIdx]};
    //      TL                  TR                  BR                  BL
}

float MarkerDetector::cellMeanBrightness(const cv::Mat& img, int row, int col) const {
    int x0 = static_cast<int>(col * CELL_PX);
    int y0 = static_cast<int>(row * CELL_PX);
    int x1 = static_cast<int>((col + 1) * CELL_PX);
    int y1 = static_cast<int>((row + 1) * CELL_PX);
    x1 = std::min(x1, img.cols - 1);
    y1 = std::min(y1, img.rows - 1);
    cv::Rect cellRect(x0, y0, x1 - x0, y1 - y0);
    if (cellRect.width <= 0 || cellRect.height <= 0) return 128.f;
    cv::Mat cell = img(cellRect);
    return static_cast<float>(cv::mean(cell)[0]);
}

bool MarkerDetector::isCellBlack(const cv::Mat& img, int row, int col) const {
    // In a binary image (0=black, 255=white): black means mean < 128
    return cellMeanBrightness(img, row, col) < 128.f;
}

bool MarkerDetector::isCellWhite(const cv::Mat& img, int row, int col) const {
    return cellMeanBrightness(img, row, col) >= 128.f;
}

/**
 * Detect how many 90° clockwise rotations are needed to reach canonical orientation.
 * Returns 0,1,2,3 for number of CW rotations needed.
 * Returns -1 if the pattern doesn't match in any orientation.
 *
 * Canonical orientation: absent anchor at bottom-right (5,5)
 * Rotation 1 (90° CW): absent anchor at bottom-left (5,1)  → was BR, now BL
 * Rotation 2 (180°):   absent anchor at top-left (1,1)     → was BR, now TL
 * Rotation 3 (270° CW): absent anchor at top-right (1,5)   → was BR, now TR
 *
 * Anchor positions per rotation (0-indexed cell coords after rotation):
 *   0°:   anchors at (1,1),(1,5),(5,1); absent (5,5)
 *   90°CW: anchors at (1,1),(5,1),(5,5); absent (1,5)
 *   180°:  anchors at (1,5),(5,1),(5,5); absent (1,1)
 *   270°CW: anchors at (1,1),(1,5),(5,5); absent (5,1)
 */
int MarkerDetector::detectRotationSteps(const cv::Mat& binary) const {
    // Anchor cell positions (row, col)
    static const int anchorPos[4][2] = {{1,1}, {1,5}, {5,1}, {5,5}};

    // For each candidate rotation, specify which 3 are present (1=present, 0=absent)
    // Rotation 0: (1,1)✓ (1,5)✓ (5,1)✓ (5,5)✗
    // Rotation 1: (1,1)✓ (1,5)✗ (5,1)✓ (5,5)✓
    // Rotation 2: (1,1)✗ (1,5)✓ (5,1)✓ (5,5)✓
    // Rotation 3: (1,1)✓ (1,5)✓ (5,1)✗ (5,5)✓
    static const int patterns[4][4] = {
        {1, 1, 1, 0}, // rot 0
        {1, 0, 1, 1}, // rot 1
        {0, 1, 1, 1}, // rot 2
        {1, 1, 0, 1}, // rot 3
    };

    for (int rot = 0; rot < 4; rot++) {
        int matches = 0;
        for (int a = 0; a < 4; a++) {
            int r = anchorPos[a][0], c = anchorPos[a][1];
            bool expectedBlack = (patterns[rot][a] == 1);
            bool actuallyBlack  = isCellBlack(binary, r, c);
            if (expectedBlack == actuallyBlack) matches++;
        }
        if (matches >= MIN_ANCHOR_MATCHES) {
            return rot; // This rotation aligns
        }
    }

    return -1; // No rotation matched
}

} // namespace MarkerScanner
