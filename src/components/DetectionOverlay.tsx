/**
 * DetectionOverlay
 *
 * Renders a perspective-correct bounding quad over the detected marker
 * using React Native Skia for GPU-accelerated drawing.
 */

import React, {useMemo} from 'react';
import {Canvas, Path, Skia, Paint, DashPathEffect} from '@shopify/react-native-skia';
import {StyleSheet} from 'react-native';
import type {Quadrilateral} from '../types';
import {COLORS} from '../constants';

interface DetectionOverlayProps {
  corners: Quadrilateral;
  /** Dimensions of the camera frame (source coordinates) */
  frameWidth: number;
  frameHeight: number;
  /** Screen dimensions (destination coordinates) */
  screenWidth: number;
  screenHeight: number;
  detected: boolean;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  corners,
  frameWidth,
  frameHeight,
  screenWidth,
  screenHeight,
  detected,
}) => {
  // Scale frame coordinates → screen coordinates
  const scaleX = screenWidth / frameWidth;
  const scaleY = screenHeight / frameHeight;

  const scale = (p: {x: number; y: number}) => ({
    x: p.x * scaleX,
    y: p.y * scaleY,
  });

  const tl = scale(corners.topLeft);
  const tr = scale(corners.topRight);
  const br = scale(corners.bottomRight);
  const bl = scale(corners.bottomLeft);

  // Build Skia path for the quadrilateral
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(tl.x, tl.y);
    p.lineTo(tr.x, tr.y);
    p.lineTo(br.x, br.y);
    p.lineTo(bl.x, bl.y);
    p.close();
    return p;
  }, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);

  const color = detected ? COLORS.success : COLORS.warning;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Quad outline */}
      <Path
        path={path}
        style="stroke"
        strokeWidth={2.5}
        color={color}
        opacity={0.9}>
        <DashPathEffect intervals={[8, 4]} />
      </Path>

      {/* Filled semi-transparent tint */}
      <Path
        path={path}
        style="fill"
        color={color}
        opacity={0.08}
      />
    </Canvas>
  );
};
