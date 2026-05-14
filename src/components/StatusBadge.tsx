/**
 * StatusBadge
 * Shows current detection state with animated indicator.
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {useAnimatedStyle, withRepeat, withTiming, useSharedValue, useEffect} from 'react-native-reanimated';
import {COLORS} from '../constants';

interface StatusBadgeProps {
  detected: boolean;
  confidence: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({detected, confidence}) => {
  const opacity = useSharedValue(1);

  // Blink the dot when not detecting
  React.useEffect(() => {
    if (!detected) {
      opacity.value = withRepeat(withTiming(0.2, {duration: 700}), -1, true);
    } else {
      opacity.value = 1;
    }
  }, [detected, opacity]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const color = detected ? COLORS.success : COLORS.warning;
  const label = detected ? 'DETECTED' : 'SCANNING';

  return (
    <View style={styles.badge}>
      <Animated.View style={[styles.dot, {backgroundColor: color}, dotStyle]} />
      <View>
        <Text style={[styles.label, {color}]}>{label}</Text>
        {detected && (
          <Text style={styles.confidence}>
            {Math.round(confidence * 100)}% conf.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  label: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  confidence: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: COLORS.textMuted,
    marginTop: 1,
  },
});
