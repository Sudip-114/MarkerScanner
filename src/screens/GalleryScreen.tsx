/**
 * GalleryScreen
 *
 * Displays all captured 300×300 marker images in a responsive grid.
 * Each cell shows the marker image, capture time, and processing time.
 */

import React, {useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Animated, {
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';

import {useScannerStore} from '../store/useScannerStore';
import {COLORS, SPACING, MARKER_CONSTANTS} from '../constants';
import type {CapturedMarker} from '../types';

const {width: SCREEN_W} = Dimensions.get('window');
const GRID_COLS = 4;
const CELL_MARGIN = SPACING.xs;
const CELL_SIZE = (SCREEN_W - SPACING.md * 2 - CELL_MARGIN * (GRID_COLS - 1)) / GRID_COLS;

export const GalleryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {capturedMarkers, clearMarkers} = useScannerStore();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClear = useCallback(() => {
    clearMarkers();
    navigation.goBack();
  }, [clearMarkers, navigation]);

  const renderItem = useCallback(
    ({item, index}: ListRenderItemInfo<CapturedMarker>) => (
      <Animated.View
        entering={FadeInDown.delay(index * 40).springify()}
        style={styles.cellWrapper}>
        <View style={styles.cell}>
          {/* Marker image */}
          <Image
            source={{uri: `data:image/png;base64,${item.imageBase64}`}}
            style={styles.markerImage}
            resizeMode="cover"
          />
          {/* Index badge */}
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{String(index + 1).padStart(2, '0')}</Text>
          </View>
          {/* Processing time */}
          <View style={styles.cellFooter}>
            <Text style={styles.cellProcTime}>{item.processingTimeMs}ms</Text>
          </View>
        </View>
      </Animated.View>
    ),
    [],
  );

  const keyExtractor = useCallback((item: CapturedMarker) => item.id, []);

  const isComplete = capturedMarkers.length >= MARKER_CONSTANTS.TARGET_MARKER_COUNT;

  return (
    <View style={[styles.root, {paddingTop: insets.top}]}>
      {/* Header */}
      <Animated.View entering={FadeIn} style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>CAPTURED MARKERS</Text>
          <Text style={styles.headerSubtitle}>
            {capturedMarkers.length}/{MARKER_CONSTANTS.TARGET_MARKER_COUNT} · 300×300px each
          </Text>
        </View>
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Text style={styles.clearText}>RESET</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Completion banner */}
      {isComplete && (
        <Animated.View entering={FadeInDown.springify()} style={styles.completeBanner}>
          <Text style={styles.completeBannerIcon}>✓</Text>
          <Text style={styles.completeBannerText}>
            All 20 markers successfully extracted
          </Text>
        </Animated.View>
      )}

      {/* Summary stats */}
      {capturedMarkers.length > 0 && (
        <View style={styles.statsBar}>
          <StatChip
            label="TOTAL"
            value={`${capturedMarkers.length}`}
            color={COLORS.primary}
          />
          <StatChip
            label="AVG PROC."
            value={`${Math.round(
              capturedMarkers.reduce((s, m) => s + m.processingTimeMs, 0) /
                capturedMarkers.length,
            )}ms`}
            color={COLORS.warning}
          />
          <StatChip
            label="SIZE"
            value="300×300"
            color={COLORS.success}
          />
          <StatChip
            label="FORMAT"
            value="PNG"
            color={COLORS.textSecondary}
          />
        </View>
      )}

      {/* Grid */}
      {capturedMarkers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⬜</Text>
          <Text style={styles.emptyTitle}>No markers captured yet</Text>
          <Text style={styles.emptySubtitle}>
            Go back to the scanner and point the camera at your marker.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleBack}>
            <Text style={styles.emptyButtonText}>← START SCANNING</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={capturedMarkers}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={GRID_COLS}
          contentContainerStyle={[
            styles.grid,
            {paddingBottom: insets.bottom + SPACING.xl},
          ]}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

// ─── Helper component ──────────────────────────────────────────────────────────

interface StatChipProps {
  label: string;
  value: string;
  color: string;
}

const StatChip: React.FC<StatChipProps> = ({label, value, color}) => (
  <View style={statChipStyles.chip}>
    <Text style={[statChipStyles.value, {color}]}>{value}</Text>
    <Text style={statChipStyles.label}>{label}</Text>
  </View>
);

const statChipStyles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    flex: 1,
  },
  value: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  label: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    paddingRight: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 11,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 3,
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 2,
    letterSpacing: 1,
  },
  clearButton: {
    paddingLeft: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  clearText: {
    color: COLORS.danger,
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    fontWeight: '700',
  },

  // Complete banner
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    margin: SPACING.md,
    marginBottom: 0,
    backgroundColor: COLORS.successDim,
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: 6,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  completeBannerIcon: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: '700',
  },
  completeBannerText: {
    color: COLORS.success,
    fontSize: 12,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  // Grid
  grid: {
    padding: SPACING.md,
    gap: CELL_MARGIN,
  },
  row: {
    gap: CELL_MARGIN,
    marginBottom: CELL_MARGIN,
  },
  cellWrapper: {},
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE + 16,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  markerImage: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  indexBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  indexText: {
    color: COLORS.primary,
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 1,
  },
  cellFooter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellProcTime: {
    color: COLORS.textMuted,
    fontSize: 7,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  emptyButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'monospace',
    letterSpacing: 2,
    fontWeight: '700',
  },
});
