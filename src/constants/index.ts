/**
 * Application-wide constants
 */

// ─── Marker Detection ─────────────────────────────────────────────────────────

export const MARKER_CONSTANTS = {
  /** Target output size in pixels */
  OUTPUT_SIZE: 300,

  /** Minimum area ratio: marker must occupy at least this fraction of frame area */
  MIN_AREA_RATIO: 0.005,

  /** Maximum area ratio: marker must not exceed this fraction of frame area */
  MAX_AREA_RATIO: 0.7,

  /** How close to 1.0 the aspect ratio must be for a square */
  ASPECT_RATIO_TOLERANCE: 0.15,

  /** Minimum detection confidence to accept a result */
  MIN_CONFIDENCE: 0.75,

  /** Number of markers to collect before stopping */
  TARGET_MARKER_COUNT: 20,

  /** Minimum ms between accepted captures (throttle duplicates) */
  MIN_CAPTURE_INTERVAL_MS: 800,

  /**
   * Border pattern descriptor for the custom marker.
   * The marker has a distinctive thick black border with 4 corner "anchor" squares
   * and 3 alignment squares at midpoints of top/bottom edges.
   * This encodes the binary pattern checked after perspective correction.
   *
   * Pattern grid is 7×7 cells. Black=1, White=0.
   * Row-major, top-to-bottom.
   */
  MARKER_GRID_SIZE: 7,

  /** Cell size used for template validation (pixels in normalized 300×300 space) */
  MARKER_CELL_SIZE: 300 / 7,
} as const;

// ─── Camera ───────────────────────────────────────────────────────────────────

export const CAMERA_CONSTANTS = {
  MIN_RESOLUTION: 2000,
  MAX_RESOLUTION: 3000,
  /** Preferred frame rate for processing */
  FRAME_RATE: 30,
  /** Process 1 in every N frames (skip frames to maintain UI responsiveness) */
  PROCESS_EVERY_N_FRAMES: 2,
} as const;

// ─── UI ───────────────────────────────────────────────────────────────────────

export const COLORS = {
  background: '#0A0A0F',
  surface: '#12121A',
  surfaceElevated: '#1C1C28',
  border: '#2A2A3E',
  primary: '#00E5FF',
  primaryDim: '#00E5FF33',
  success: '#00FF94',
  successDim: '#00FF9433',
  warning: '#FFB700',
  warningDim: '#FFB70033',
  danger: '#FF3D57',
  dangerDim: '#FF3D5733',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A8AA8',
  textMuted: '#4A4A6A',
  overlay: 'rgba(10, 10, 15, 0.85)',
} as const;

export const FONTS = {
  mono: 'monospace',
  system: 'sans-serif',
  systemBold: 'sans-serif-medium',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
