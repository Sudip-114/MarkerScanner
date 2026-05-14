/**
 * Global state store using Zustand
 * Manages captured markers, scanning state, and detection results
 */

import {create} from 'zustand';
import type {ScannerStore, CapturedMarker, MarkerDetectionResult} from '../types';
import {MARKER_CONSTANTS} from '../constants';

export const useScannerStore = create<ScannerStore>(set => ({
  capturedMarkers: [],
  isScanning: true,
  totalFramesProcessed: 0,
  lastDetectionResult: null,

  addMarker: (marker: CapturedMarker) =>
    set(state => {
      // Don't add more than target count
      if (state.capturedMarkers.length >= MARKER_CONSTANTS.TARGET_MARKER_COUNT) {
        return state;
      }
      return {capturedMarkers: [...state.capturedMarkers, marker]};
    }),

  clearMarkers: () => set({capturedMarkers: [], totalFramesProcessed: 0}),

  setScanning: (value: boolean) => set({isScanning: value}),

  incrementFrameCount: () =>
    set(state => ({totalFramesProcessed: state.totalFramesProcessed + 1})),

  setLastDetectionResult: (result: MarkerDetectionResult) =>
    set({lastDetectionResult: result}),
}));
