import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from 'expo-camera';
import * as Haptics from 'expo-haptics';
import {
  Zap,
  ZapOff,
  SwitchCamera,
  Keyboard,
  Camera as CameraIcon,
  Search,
  AlertCircle,
  X,
  ScanLine,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme/colors';
import { api } from '../services/api';
import { BarcodeScannerReticle } from '../components/BarcodeScannerReticle';
import { HeaderBadge } from '../components/HeaderBadge';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ScanScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isScannedLocked, setIsScannedLocked] = useState<boolean>(false);

  // Manual ISBN Modal
  const [manualModalVisible, setManualModalVisible] = useState<boolean>(false);
  const [manualIsbn, setManualIsbn] = useState<string>('');

  const triggerHapticSuccess = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const triggerHapticError = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  };

  const handleResolveBook = async (isbn: string) => {
    setIsProcessing(true);
    setProcessingStatus(`Querying metadata for ${isbn}…`);

    try {
      const bookData = await api.getBookByIsbn(isbn);
      triggerHapticSuccess();
      setIsProcessing(false);
      navigation.navigate('BookDetail', {
        isbn,
        book: bookData,
        isEditingExisting: false,
      });
    } catch (err: any) {
      triggerHapticError();
      setIsProcessing(false);
      Alert.alert(
        'Metadata Resolution',
        `${err.message || 'Could not fetch metadata.'}\n\nWould you like to manually add details for this volume?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Catalog Manually',
            onPress: () => {
              navigation.navigate('BookDetail', {
                isbn,
                book: {
                  isbn13: isbn.length === 13 ? isbn : undefined,
                  isbn10: isbn.length === 10 ? isbn : undefined,
                  title: '',
                  authors: [],
                  subjects: [],
                },
                isEditingExisting: false,
              });
            },
          },
        ]
      );
    } finally {
      setTimeout(() => {
        setIsScannedLocked(false);
      }, 2500);
    }
  };

  // Live Barcode Scanner Callback
  const handleBarcodeScanned = async (scanningResult: BarcodeScanningResult) => {
    if (isScannedLocked || isProcessing) return;

    const data = scanningResult.data?.trim();
    if (!data) return;

    const clean = data.replace(/[-\s]/g, '');
    if (clean.length === 10 || clean.length === 13) {
      setIsScannedLocked(true);
      triggerHapticSuccess();
      await handleResolveBook(clean);
    }
  };

  // "Snap & Identify" Button: Take photo and send to FastAPI Computer Vision pipeline
  const handleSnapAndIdentify = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      setProcessingStatus('Capturing optical frame…');

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('Failed to capture frame from camera.');
      }

      setProcessingStatus('FastAPI computer vision decoding…');
      const scanResult = await api.scanBarcodeImage(photo.uri);

      if (scanResult.detected && scanResult.candidates.length > 0) {
        const foundIsbn = scanResult.candidates[0].isbn;
        triggerHapticSuccess();
        await handleResolveBook(foundIsbn);
      } else {
        triggerHapticError();
        setIsProcessing(false);
        Alert.alert(
          'No Barcode Detected',
          'The computer vision pipeline could not resolve an ISBN barcode in the image. Ensure the barcode is flat, well-lit, or enter the ISBN directly.',
          [
            { text: 'Try Again' },
            {
              text: 'Enter ISBN',
              onPress: () => setManualModalVisible(true),
            },
          ]
        );
      }
    } catch (err: any) {
      triggerHapticError();
      setIsProcessing(false);
      Alert.alert(
        'Scan Error',
        err.message || 'An error occurred during barcode decoding. Check backend connection.'
      );
    }
  };

  const handleManualLookup = async () => {
    const trimmed = manualIsbn.replace(/[-\s]/g, '').trim();
    if (!trimmed) {
      Alert.alert('ISBN Required', 'Please enter a valid 10 or 13-digit ISBN number.');
      return;
    }
    setManualModalVisible(false);
    setManualIsbn('');
    await handleResolveBook(trimmed);
  };

  if (!permission) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing camera sensor…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top + 20 }]}>
        <View style={styles.permissionIconCircle}>
          <AlertCircle size={38} color={colors.primary} />
        </View>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionSubtitle}>
          Grant optical camera permission to scan book ISBN barcodes and build your personal
          catalog.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.grantBtn, pressed && { opacity: 0.85 }]}
          onPress={requestPermission}
        >
          <Text style={styles.grantBtnText}>Grant Camera Permission</Text>
        </Pressable>
        <Pressable
          style={styles.manualFallbackBtn}
          onPress={() => setManualModalVisible(true)}
        >
          <Keyboard size={16} color={colors.textSecondary} />
          <Text style={styles.manualFallbackText}>Or Enter ISBN Manually</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'],
        }}
        onBarcodeScanned={isScannedLocked ? undefined : handleBarcodeScanned}
      />

      {/* Top Header Overlay with Glassmorphic Controls */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topRow}>
          <HeaderBadge />

          <View style={styles.topActions}>
            <Pressable
              style={({ pressed }) => [
                styles.glassButton,
                torch && styles.glassButtonActive,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setTorch(!torch);
              }}
            >
              {torch ? (
                <Zap size={18} color={colors.primary} />
              ) : (
                <ZapOff size={18} color={colors.text} />
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.glassButton, pressed && { opacity: 0.75 }]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setFacing(facing === 'back' ? 'front' : 'back');
              }}
            >
              <SwitchCamera size={18} color={colors.text} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.glassButton, pressed && { opacity: 0.75 }]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setManualModalVisible(true);
              }}
            >
              <Keyboard size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Center Reticle Viewfinder */}
      <View style={styles.reticleContainer}>
        <BarcodeScannerReticle />
      </View>

      {/* Bottom Shutter Controls with Tactile Outer Ring */}
      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.shutterContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.shutterOuterRing,
              pressed && styles.shutterPressed,
            ]}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              } catch {}
              handleSnapAndIdentify();
            }}
            disabled={isProcessing}
          >
            <View style={styles.shutterInnerCircle}>
              <CameraIcon size={24} color={colors.background as string} />
            </View>
          </Pressable>

          <Text style={styles.shutterLabel}>Snap & Identify</Text>
        </View>
      </View>

      {/* Processing HUD Overlay */}
      {isProcessing && (
        <View style={styles.hudOverlay}>
          <View style={styles.hudCard}>
            <View style={styles.hudIconCircle}>
              <ScanLine size={26} color={colors.primary} />
            </View>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 14 }} />
            <Text style={styles.hudTitle}>Analyzing Book</Text>
            <Text style={styles.hudSubtitle}>{processingStatus}</Text>
          </View>
        </View>
      )}

      {/* Manual ISBN Input Modal */}
      <Modal
        visible={manualModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual ISBN Lookup</Text>
              <Pressable
                onPress={() => setManualModalVisible(false)}
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
              >
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Locate the 10 or 13-digit ISBN printed on the back cover or copyright page.
            </Text>

            <TextInput
              style={styles.isbnInput}
              placeholder="e.g. 9789332550513"
              placeholderTextColor={colors.textMuted}
              value={manualIsbn}
              onChangeText={setManualIsbn}
              keyboardType="numeric"
              autoFocus
            />

            <View style={styles.quickIsbnContainer}>
              <Text style={styles.quickIsbnLabel}>Test volumes:</Text>
              <Pressable
                style={({ pressed }) => [styles.sampleChip, pressed && { opacity: 0.7 }]}
                onPress={() => setManualIsbn('9789332550513')}
              >
                <Text style={styles.sampleChipText}>Tanenbaum OS</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.sampleChip, pressed && { opacity: 0.7 }]}
                onPress={() => setManualIsbn('9780131103627')}
              >
                <Text style={styles.sampleChipText}>K&R C Book</Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.submitLookupBtn, pressed && { opacity: 0.85 }]}
              onPress={handleManualLookup}
            >
              <Search size={16} color={colors.background as string} />
              <Text style={styles.submitLookupBtnText}>Look Up Volume</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.textSecondary,
    fontFamily: typography.sans,
    marginTop: 12,
    fontSize: 13,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  permissionIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 22,
    fontFamily: typography.serif,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionSubtitle: {
    fontSize: 13,
    fontFamily: typography.sans,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  grantBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  grantBtnText: {
    color: colors.background,
    fontSize: 14,
    fontFamily: typography.sansSemiBold,
  },
  manualFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  manualFallbackText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: typography.sans,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  glassButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(20, 21, 24, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  glassButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  reticleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterContainer: {
    alignItems: 'center',
  },
  shutterOuterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  shutterInnerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  shutterLabel: {
    color: colors.text,
    fontSize: 12,
    fontFamily: typography.sansMedium,
    marginTop: 8,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hudOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 10, 11, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  hudCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    width: '82%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  hudIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hudTitle: {
    fontSize: 17,
    fontFamily: typography.serif,
    color: colors.text,
    marginTop: 10,
  },
  hudSubtitle: {
    fontSize: 12,
    fontFamily: typography.sans,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: typography.serif,
    color: colors.text,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: colors.cardElevated,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: typography.sans,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  isbnInput: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    fontFamily: typography.sansMedium,
    marginBottom: 14,
  },
  quickIsbnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  quickIsbnLabel: {
    fontSize: 11,
    fontFamily: typography.sans,
    color: colors.textMuted,
  },
  sampleChip: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sampleChipText: {
    fontSize: 11,
    fontFamily: typography.sansMedium,
    color: colors.primaryLight,
  },
  submitLookupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
  },
  submitLookupBtnText: {
    color: colors.background,
    fontSize: 14,
    fontFamily: typography.sansSemiBold,
  },
});
