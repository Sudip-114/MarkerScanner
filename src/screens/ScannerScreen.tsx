/**
 * ScannerScreen
 *
 * Primary screen showing:
 * - Live camera preview
 * - Real-time bounding-box overlay using Skia
 * - Detection status indicator
 * - Progress counter
 * - Navigation to Gallery
 */

import React, {useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
} from 'react-native-vision-camera';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

import {useMarkerDetection} from '../hooks/useMarkerDetection';
import {useScannerStore} from '../store/useScannerStore';
import {DetectionOverlay} from '../components/DetectionOverlay';
import {StatusBadge} from '../components/StatusBadge';
import {ProgressBar} from '../components/ProgressBar';
import {COLORS, SPACING, MARKER_CONSTANTS, CAMERA_CONSTANTS} from '../constants';
import type {RootStackParamList} from '../types';

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;

export const ScannerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  // ── Camera setup ──────────────────────────────────────────────────────────

  const device = useCameraDevice('back');
  const format = useCameraFormat(device, [
    {
      videoResolution: {
        width: CAMERA_CONSTANTS.MAX_RESOLUTION,
        height: CAMERA_CONSTANTS.MAX_RESOLUTION,
      },
    },
    {fps: CAMERA_CONSTANTS.FRAME_RATE},
  ]);

  // ── Detection hook ────────────────────────────────────────────────────────

  const {frameProcessor, permissionGranted, capturedCount, isComplete} =
    useMarkerDetection();

  const {lastDetectionResult, totalFramesProcessed, isScanning} =
    useScannerStore();

  // ── Animations ────────────────────────────────────────────────────────────

  const pulseAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0);

  React.useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1.15, {duration: 900}),
      -1,
      true,
    );
    glowAnim.value = withRepeat(withTiming(1, {duration: 1200}), -1, true);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{scale: pulseAnim.value}],
  }));

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleViewGallery = useCallback(() => {
    navigation.navigate('Gallery');
  }, [navigation]);

  // ── Guard: no device / no permission ─────────────────────────────────────

  if (!device || !permissionGranted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {!permissionGranted
            ? 'Camera permission denied.\nPlease grant camera access in Settings.'
            : 'No camera device found.'}
        </Text>
      </View>
    );
  }

  const isDetected = lastDetectionResult?.detected ?? false;
  const progress = capturedCount / MARKER_CONSTANTS.TARGET_MARKER_COUNT;

  return (
    <View style={styles.root}>
      {/* ── Camera Preview ── */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        isActive={isScanning || !isComplete}
        frameProcessor={frameProcessor}
        frameProcessorFps={CAMERA_CONSTANTS.FRAME_RATE / CAMERA_CONSTANTS.PROCESS_EVERY_N_FRAMES}
        photo={false}
        video={false}
        audio={false}
        enableZoomGesture={false}
      />

      {/* ── Detection Overlay (Skia bounding box) ── */}
      {lastDetectionResult?.corners && (
        <DetectionOverlay
          corners={lastDetectionResult.corners}
          frameWidth={format?.videoWidth ?? SCREEN_W}
          frameHeight={format?.videoHeight ?? SCREEN_H}
          screenWidth={SCREEN_W}
          screenHeight={SCREEN_H}
          detected={isDetected}
        />
      )}

      {/* ── Viewfinder crosshair ── */}
      <View style={styles.viewfinderContainer} pointerEvents="none">
        <View
          style={[
            styles.viewfinder,
            isDetected && styles.viewfinderDetected,
          ]}>
          {/* Corner decorators */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Center dot pulse */}
          {isDetected && (
            <Animated.View style={[styles.centerDot, pulseStyle]} />
          )}
        </View>
      </View>

      {/* ── Top HUD ── */}
      <View style={[styles.topHud, {paddingTop: insets.top + SPACING.sm}]}>
        <View style={styles.topHudRow}>
          <View>
            <Text style={styles.appTitle}>MARKER SCANNER</Text>
            <Text style={styles.appSubtitle}>Custom Marker Detection</Text>
          </View>
          <StatusBadge detected={isDetected} confidence={lastDetectionResult?.confidence ?? 0} />
        </View>
      </View>

      {/* ── Bottom HUD ── */}
      <View style={[styles.bottomHud, {paddingBottom: insets.bottom + SPACING.md}]}>
        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>MARKERS CAPTURED</Text>
            <Text style={styles.progressCount}>
              <Text style={styles.progressCountCurrent}>{capturedCount}</Text>
              <Text style={styles.progressCountTotal}>
                /{MARKER_CONSTANTS.TARGET_MARKER_COUNT}
              </Text>
            </Text>
          </View>
          <ProgressBar progress={progress} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalFramesProcessed}</Text>
            <Text style={styles.statLabel}>FRAMES</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {lastDetectionResult?.processingTimeMs
                ? `${lastDetectionResult.processingTimeMs}ms`
                : '—'}
            </Text>
            <Text style={styles.statLabel}>LAST PROC.</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                {color: isDetected ? COLORS.success : COLORS.textMuted},
              ]}>
              {isDetected ? 'DETECTED' : 'SCANNING'}
            </Text>
            <Text style={styles.statLabel}>STATUS</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.actionButtonGallery,
              capturedCount === 0 && styles.actionButtonDisabled,
            ]}
            onPress={handleViewGallery}
            disabled={capturedCount === 0}>
            <Text style={styles.actionButtonText}>
              VIEW GALLERY ({capturedCount})
            </Text>
          </TouchableOpacity>

          {isComplete && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonComplete]}
              onPress={handleViewGallery}>
              <Text style={styles.actionButtonTextPrimary}>
                VIEW ALL 20 RESULTS →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'monospace',
  },

  // Viewfinder
  viewfinderContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: 220,
    height: 220,
    borderRadius: 4,
  },
  viewfinderDetected: {},
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  centerDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
    alignSelf: 'center',
    top: '50%',
    marginTop: -5,
  },

  // Top HUD
  topHud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.overlay,
  },
  topHudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 3,
  },
  appSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginTop: 2,
  },

  // Bottom HUD
  bottomHud: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.overlay,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.md,
  },
  progressSection: {
    gap: SPACING.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  progressCount: {},
  progressCountCurrent: {
    color: COLORS.primary,
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  progressCountTotal: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: 'monospace',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.xs,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },

  // Action buttons
  actionsRow: {
    gap: SPACING.sm,
  },
  actionButton: {
    borderRadius: 6,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionButtonGallery: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  actionButtonComplete: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDim,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  actionButtonTextPrimary: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'monospace',
    letterSpacing: 2,
    fontWeight: '700',
  },
});
