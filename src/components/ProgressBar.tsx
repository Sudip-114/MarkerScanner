/**
 * ProgressBar with animated fill
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  useEffect,
} from 'react-native-reanimated';
import {COLORS} from '../constants';

interface ProgressBarProps {
  progress: number; // 0 to 1
}

export const ProgressBar: React.FC<ProgressBarProps> = ({progress}) => {
  const width = useSharedValue(0);

  React.useEffect(() => {
    width.value = withSpring(progress, {
      damping: 20,
      stiffness: 120,
    });
  }, [progress, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  const isComplete = progress >= 1;

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.fill,
          fillStyle,
          isComplete && styles.fillComplete,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  fillComplete: {
    backgroundColor: COLORS.success,
  },
});
