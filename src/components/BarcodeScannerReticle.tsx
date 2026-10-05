import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { BookOpen, ScanText } from 'lucide-react-native';
import { colors, typography } from '../theme/colors';

const { width } = Dimensions.get('window');
const BARCODE_WIDTH = width * 0.82;
const BARCODE_HEIGHT = BARCODE_WIDTH * 0.52;

const OCR_WIDTH = width * 0.76;
const OCR_HEIGHT = OCR_WIDTH * 1.35; // Standard 3:4 portrait book aspect ratio

interface BarcodeScannerReticleProps {
  mode?: 'barcode' | 'ocr';
}

export const BarcodeScannerReticle: React.FC<BarcodeScannerReticleProps> = ({
  mode = 'barcode',
}) => {
  const isOcr = mode === 'ocr';
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(0.6)).current;

  const currentHeight = isOcr ? OCR_HEIGHT : BARCODE_HEIGHT;
  const currentWidth = isOcr ? OCR_WIDTH : BARCODE_WIDTH;

  useEffect(() => {
    // Laser line scan loop
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: isOcr ? 2800 : 2200,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: isOcr ? 2800 : 2200,
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
  }, [animatedValue, pulseValue, isOcr]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [12, currentHeight - 16],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <View
        style={[
          styles.reticleBox,
          {
            width: currentWidth,
            height: currentHeight,
          },
          isOcr && styles.reticleBoxOcr,
        ]}
      >
        {/* Corner Brackets */}
        <Animated.View style={[styles.corner, styles.topLeft, { opacity: pulseValue }]} />
        <Animated.View style={[styles.corner, styles.topRight, { opacity: pulseValue }]} />
        <Animated.View style={[styles.corner, styles.bottomLeft, { opacity: pulseValue }]} />
        <Animated.View style={[styles.corner, styles.bottomRight, { opacity: pulseValue }]} />

        {/* Central Crosshair Alignment Markers */}
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />

        {/* Mode Icon Watermark for OCR Mode */}
        {isOcr && (
          <View style={styles.ocrWatermark}>
            <ScanText size={38} color="rgba(255, 255, 255, 0.14)" />
          </View>
        )}

        {/* Animated Laser Line */}
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
        <BlurView intensity={60} tint="dark" style={styles.instructionBadge}>
          <Text style={styles.instructionText}>
            {isOcr ? 'Align book cover or spine within frame' : 'Align book barcode or ISBN'}
          </Text>
        </BlurView>
        <BlurView intensity={40} tint="dark" style={styles.subInstructionBadge}>
          <Text style={styles.subInstructionText}>
            {isOcr
              ? 'Tesseract OCR text recognition · Multi-provider title matching'
              : 'Instant optical detection · Automatic metadata resolution'}
          </Text>
        </BlurView>
      </View>
    </View>
  );
};

const CORNER_SIZE = 28;
const CORNER_BORDER_WIDTH = 2.5;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleBox: {
    position: 'relative',
    backgroundColor: 'rgba(9, 10, 11, 0.28)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  reticleBoxOcr: {
    borderRadius: 24,
    backgroundColor: 'rgba(9, 10, 11, 0.22)',
  },
  ocrWatermark: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_BORDER_WIDTH,
    borderRightWidth: CORNER_BORDER_WIDTH,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_BORDER_WIDTH,
    borderLeftWidth: CORNER_BORDER_WIDTH,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_BORDER_WIDTH,
    borderRightWidth: CORNER_BORDER_WIDTH,
    borderBottomRightRadius: 16,
  },
  crosshairH: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 20,
    height: 1,
    marginLeft: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  crosshairV: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 1,
    height: 20,
    marginTop: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
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
    gap: 10,
  },
  instructionBadge: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: typography.sansSemiBold,
    letterSpacing: 0.3,
  },
  subInstructionBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  subInstructionText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontFamily: typography.sansMedium,
    textAlign: 'center',
  },
});
