import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, typography } from '../theme/colors';

const { width } = Dimensions.get('window');
const RETICLE_WIDTH = width * 0.82;
const RETICLE_HEIGHT = RETICLE_WIDTH * 0.52;

export const BarcodeScannerReticle: React.FC = () => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Laser line scan loop
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle breathing pulse for corner reticles
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    scanLoop.start();
    pulseLoop.start();

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
    };
  }, [animatedValue, pulseValue]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [12, RETICLE_HEIGHT - 14],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.reticleBox}>
        {/* Corner Brackets */}
        <Animated.View style={[styles.corner, styles.topLeft, { opacity: pulseValue }]} />
        <Animated.View style={[styles.corner, styles.topRight, { opacity: pulseValue }]} />
        <Animated.View style={[styles.corner, styles.bottomLeft, { opacity: pulseValue }]} />
        <Animated.View style={[styles.corner, styles.bottomRight, { opacity: pulseValue }]} />

        {/* Central Crosshair Alignment Markers */}
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />

        {/* Animated Amber Gold Laser Line */}
        <Animated.View
          style={[
            styles.laserLine,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.laserDotLeft} />
          <View style={styles.laserCore} />
          <View style={styles.laserDotRight} />
        </Animated.View>
      </View>

      <View style={styles.instructionContainer}>
        <View style={styles.instructionBadge}>
          <Text style={styles.instructionText}>Align book barcode or ISBN</Text>
        </View>
        <View style={styles.subInstructionBadge}>
          <Text style={styles.subInstructionText}>
            Instant optical detection · Automatic metadata resolution
          </Text>
        </View>
      </View>
    </View>
  );
};

const CORNER_SIZE = 26;
const CORNER_BORDER_WIDTH = 2.5;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleBox: {
    width: RETICLE_WIDTH,
    height: RETICLE_HEIGHT,
    position: 'relative',
    backgroundColor: 'rgba(9, 10, 11, 0.28)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_BORDER_WIDTH,
    borderLeftWidth: CORNER_BORDER_WIDTH,
    borderTopLeftRadius: 14,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_BORDER_WIDTH,
    borderRightWidth: CORNER_BORDER_WIDTH,
    borderTopRightRadius: 14,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_BORDER_WIDTH,
    borderLeftWidth: CORNER_BORDER_WIDTH,
    borderBottomLeftRadius: 14,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_BORDER_WIDTH,
    borderRightWidth: CORNER_BORDER_WIDTH,
    borderBottomRightRadius: 14,
  },
  crosshairH: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 20,
    height: 1,
    marginLeft: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  crosshairV: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 1,
    height: 20,
    marginTop: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  laserLine: {
    height: 2,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 6,
  },
  laserCore: {
    flex: 1,
    height: 2,
    backgroundColor: colors.primaryLight,
  },
  laserDotLeft: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  laserDotRight: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  instructionContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  instructionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(9, 10, 11, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  instructionText: {
    color: colors.text,
    fontSize: 13,
    fontFamily: typography.sansMedium,
    letterSpacing: 0.2,
  },
  subInstructionBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(9, 10, 11, 0.6)',
  },
  subInstructionText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: typography.sans,
    textAlign: 'center',
  },
});
