/**
 * useMarkerDetection
 *
 * Custom hook that:
 * 1. Manages camera permissions
 * 2. Creates the VisionCamera frame processor that calls the native OpenCV pipeline
 * 3. Throttles captures and de-duplicates results
 * 4. Feeds processed markers into the global store
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {NativeModules, Platform} from 'react-native';
import {
  useFrameProcessor,
  type Frame,
} from 'react-native-vision-camera';
import {runOnJS} from 'react-native-reanimated';
import {useScannerStore} from '../store/useScannerStore';
import {MARKER_CONSTANTS, CAMERA_CONSTANTS} from '../constants';
import type {MarkerDetectionResult, CapturedMarker} from '../types';
import {generateUUID} from '../utils/uuid';

// ─── Native Module Bridge ────────────────────────────────────────────────────

const {MarkerDetectorModule} = NativeModules;

if (!MarkerDetectorModule) {
  console.error(
    '[useMarkerDetection] MarkerDetectorModule not found. ' +
      'Ensure the native module is linked and the app is rebuilt.',
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMarkerDetection() {
  const {
    capturedMarkers,
    isScanning,
    addMarker,
    incrementFrameCount,
    setLastDetectionResult,
    setScanning,
  } = useScannerStore();

  const frameCountRef = useRef(0);
  const lastCaptureTimeRef = useRef(0);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // ── Permission ────────────────────────────────────────────────────────────

  useEffect(() => {
    const requestPermission = async () => {
      try {
        if (Platform.OS === 'android') {
          const {PermissionsAndroid} = require('react-native');
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission Required',
              message:
                'MarkerScanner needs camera access to detect and extract markers.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            },
          );
          setPermissionGranted(
            result === PermissionsAndroid.RESULTS.GRANTED,
          );
        } else {
          setPermissionGranted(true);
        }
      } catch (e) {
        console.error('[useMarkerDetection] Permission error:', e);
      }
    };
    requestPermission();
  }, []);

  // ── Auto-stop when target reached ────────────────────────────────────────

  useEffect(() => {
    if (capturedMarkers.length >= MARKER_CONSTANTS.TARGET_MARKER_COUNT) {
      setScanning(false);
    }
  }, [capturedMarkers.length, setScanning]);

  // ── JS-side result handler (called from worklet via runOnJS) ─────────────

  const handleDetectionResult = useCallback(
    (result: MarkerDetectionResult, frameIndex: number) => {
      setLastDetectionResult(result);

      if (!result.detected || !result.processedImageBase64) {
        return;
      }

      // Throttle: require minimum interval between captures
      const now = Date.now();
      if (now - lastCaptureTimeRef.current < MARKER_CONSTANTS.MIN_CAPTURE_INTERVAL_MS) {
        return;
      }

      // Confidence gate
      if (result.confidence < MARKER_CONSTANTS.MIN_CONFIDENCE) {
        return;
      }

      lastCaptureTimeRef.current = now;

      const marker: CapturedMarker = {
        id: generateUUID(),
        imageBase64: result.processedImageBase64,
        capturedAt: now,
        frameIndex,
        processingTimeMs: result.processingTimeMs,
      };

      addMarker(marker);
    },
    [addMarker, setLastDetectionResult],
  );

  const handleFrameIncrement = useCallback(() => {
    incrementFrameCount();
  }, [incrementFrameCount]);

  // ── Frame Processor ──────────────────────────────────────────────────────

  const frameProcessor = useFrameProcessor(
    (frame: Frame) => {
      'worklet';

      // Frame skipping for performance
      frameCountRef.current = (frameCountRef.current + 1);
      if (frameCountRef.current % CAMERA_CONSTANTS.PROCESS_EVERY_N_FRAMES !== 0) {
        return;
      }

      runOnJS(handleFrameIncrement)();

      if (!isScanning) {
        return;
      }

      // Call native OpenCV processing module via the VisionCamera plugin
      // The plugin is registered as 'detectMarker' in the native side
      try {
        // @ts-ignore - VisionCamera plugin call
        const rawResult = detectMarker(frame);

        if (rawResult) {
          const result: MarkerDetectionResult = {
            detected: rawResult.detected ?? false,
            corners: rawResult.corners ?? null,
            processedImageBase64: rawResult.processedImageBase64 ?? null,
            confidence: rawResult.confidence ?? 0,
            processingTimeMs: rawResult.processingTimeMs ?? 0,
          };
          runOnJS(handleDetectionResult)(result, frameCountRef.current);
        }
      } catch (e) {
        // Silently handle per-frame errors to not disrupt streaming
      }
    },
    [isScanning, handleDetectionResult, handleFrameIncrement],
  );

  return {
    frameProcessor,
    permissionGranted,
    capturedCount: capturedMarkers.length,
    isComplete: capturedMarkers.length >= MARKER_CONSTANTS.TARGET_MARKER_COUNT,
  };
}
