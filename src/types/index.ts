/**
 * Global type definitions for MarkerScanner
 */

// ─── Marker Types ────────────────────────────────────────────────────────────

/** A 2D point in pixel space */
export interface Point2D {
  x: number;
  y: number;
}

/** Four corners of a detected quadrilateral, ordered: TL, TR, BR, BL */
export interface Quadrilateral {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
}

/** Result from the native marker detection pipeline */
export interface MarkerDetectionResult {
  /** Whether a valid marker was found in this frame */
  detected: boolean;
  /** Corner points in frame coordinates (null if not detected) */
  corners: Quadrilateral | null;
  /** Perspective-corrected, orientation-normalized base64 PNG (300×300) */
  processedImageBase64: string | null;
  /** Confidence score 0–1 */
  confidence: number;
  /** Processing time in ms */
  processingTimeMs: number;
}

/** A fully captured and processed marker entry */
export interface CapturedMarker {
  id: string;
  /** base64 PNG 300×300 */
  imageBase64: string;
  capturedAt: number; // epoch ms
  frameIndex: number;
  processingTimeMs: number;
}

// ─── Camera Types ─────────────────────────────────────────────────────────────

export interface FrameDimensions {
  width: number;
  height: number;
}

// ─── Navigation Types ─────────────────────────────────────────────────────────

export type RootStackParamList = {
  Scanner: undefined;
  Gallery: undefined;
};

// ─── Store Types ──────────────────────────────────────────────────────────────

export interface ScannerStore {
  capturedMarkers: CapturedMarker[];
  isScanning: boolean;
  totalFramesProcessed: number;
  lastDetectionResult: MarkerDetectionResult | null;
  addMarker: (marker: CapturedMarker) => void;
  clearMarkers: () => void;
  setScanning: (value: boolean) => void;
  incrementFrameCount: () => void;
  setLastDetectionResult: (result: MarkerDetectionResult) => void;
}
