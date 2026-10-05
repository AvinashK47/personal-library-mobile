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
import { BlurView } from 'expo-blur';
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
  ScanText,
  BookOpen,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme/colors';
import { api } from '../services/api';
import { BarcodeScannerReticle } from '../components/BarcodeScannerReticle';
import { HeaderBadge } from '../components/HeaderBadge';
import { OcrResultModal } from '../components/OcrResultModal';
import {
  RootStackParamList,
  OCRIdentificationResponse,
  OCRIdentificationCandidate,
} from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScanMode = 'barcode' | 'ocr';

export const ScanScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState<boolean>(false);
  const [scanMode, setScanMode] = useState<ScanMode>('barcode');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isScannedLocked, setIsScannedLocked] = useState<boolean>(false);

  // OCR Results State
  const [ocrModalVisible, setOcrModalVisible] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<OCRIdentificationResponse | null>(null);

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
        `${err.message || 'Could not fetch metadata.'}\n\nWould you like to manually catalog details for this volume?`,
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
    if (isScannedLocked || isProcessing || scanMode === 'ocr') return;

    const data = scanningResult.data?.trim();
    if (!data) return;

    const clean = data.replace(/[-\s]/g, '');
    if (clean.length === 10 || clean.length === 13) {
      setIsScannedLocked(true);
      triggerHapticSuccess();
      await handleResolveBook(clean);
    }
  };

  // "Snap & Identify" for Barcodes
  const handleSnapAndIdentifyBarcode = async () => {
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
          'The computer vision pipeline could not resolve an ISBN barcode in the image. You can switch to Cover/Spine OCR mode or enter the ISBN directly.',
          [
            { text: 'Try Again' },
            {
              text: 'Try OCR Mode',
              onPress: () => setScanMode('ocr'),
            },
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

  // "Capture & Read Text" for OCR Mode
  const handleOcrCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      setProcessingStatus('Capturing high-resolution cover…');

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('Failed to capture frame from camera.');
      }

      setProcessingStatus('Tesseract OCR & Title Matching…');
      const ocrResponse = await api.identifyBookFromOcr(photo.uri);

      setIsProcessing(false);
      triggerHapticSuccess();
      setOcrResult(ocrResponse);
      setOcrModalVisible(true);
    } catch (err: any) {
      triggerHapticError();
      setIsProcessing(false);
      Alert.alert(
        'OCR Error',
        err.message ||
          'Failed to perform OCR recognition on this image. Ensure the backend server and Tesseract are running.'
      );
    }
  };

  const handleSelectOcrCandidate = (candidate: OCRIdentificationCandidate) => {
    setOcrModalVisible(false);
    navigation.navigate('BookDetail', {
      isbn: candidate.isbn13 || candidate.isbn10 || undefined,
      book: {
        isbn13: candidate.isbn13,
        isbn10: candidate.isbn10,
        title: candidate.title,
        authors: candidate.authors || [],
        cover_url: candidate.cover_url,
        subjects: [],
      },
      isEditingExisting: false,
    });
  };

  const handleManualCatalogWithText = (recognizedText: string) => {
    setOcrModalVisible(false);
    // Grab first non-empty line as initial title suggestion
    const lines = recognizedText.split('\n').map((l) => l.trim()).filter(Boolean);
    const suggestedTitle = lines.length > 0 ? lines[0] : '';
    const suggestedAuthor = lines.length > 1 ? lines[1] : '';

    navigation.navigate('BookDetail', {
      book: {
        title: suggestedTitle,
        authors: suggestedAuthor ? [suggestedAuthor] : [],
        subjects: [],
        description: `Recognized cover text:\n${recognizedText}`,
      },
      isEditingExisting: false,
    });
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
          Grant optical camera permission to scan book ISBN barcodes and recognize text with OCR.
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
        onBarcodeScanned={
          isScannedLocked || scanMode === 'ocr' ? undefined : handleBarcodeScanned
        }
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
                <Zap size={18} color="#1E293B" />
              ) : (
                <ZapOff size={18} color="#FFFFFF" />
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
              <SwitchCamera size={18} color="#FFFFFF" />
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
              <Keyboard size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Scan Mode Switcher (Barcode vs. Cover / Spine OCR) */}
        <BlurView intensity={30} tint="dark" style={styles.modeSegmentContainer}>
          <Pressable
            style={[
              styles.modeSegment,
              scanMode === 'barcode' && styles.modeSegmentActive,
            ]}
            onPress={() => {
              if (scanMode !== 'barcode') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setScanMode('barcode');
              }
            }}
          >
            <ScanLine
              size={15}
              color={scanMode === 'barcode' ? '#0F172A' : 'rgba(255, 255, 255, 0.75)'}
            />
            <Text
              style={[
                styles.modeSegmentText,
                scanMode === 'barcode' && styles.modeSegmentTextActive,
              ]}
            >
              Barcode Mode
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.modeSegment,
              scanMode === 'ocr' && styles.modeSegmentActive,
            ]}
            onPress={() => {
              if (scanMode !== 'ocr') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setScanMode('ocr');
              }
            }}
          >
            <ScanText
              size={15}
              color={scanMode === 'ocr' ? '#0F172A' : 'rgba(255, 255, 255, 0.75)'}
            />
            <Text
              style={[
                styles.modeSegmentText,
                scanMode === 'ocr' && styles.modeSegmentTextActive,
              ]}
            >
              Cover / Spine OCR
            </Text>
          </Pressable>
        </BlurView>
      </View>

      {/* Center Reticle Viewfinder */}
      <View style={styles.reticleContainer}>
        <BarcodeScannerReticle mode={scanMode} />
      </View>

      {/* Bottom Shutter Controls with Tactile Outer Ring */}
      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.shutterContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.shutterOuterRing,
              scanMode === 'ocr' && styles.shutterOuterRingOcr,
              pressed && styles.shutterPressed,
            ]}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              } catch {}
              if (scanMode === 'ocr') {
                handleOcrCapture();
              } else {
                handleSnapAndIdentifyBarcode();
              }
            }}
            disabled={isProcessing}
          >
            <View
              style={[
                styles.shutterInnerCircle,
                scanMode === 'ocr' && styles.shutterInnerCircleOcr,
              ]}
            >
              {scanMode === 'ocr' ? (
                <ScanText size={24} color={colors.background as string} />
              ) : (
                <CameraIcon size={24} color={colors.background as string} />
              )}
            </View>
          </Pressable>

          <Text style={styles.shutterLabel}>
            {scanMode === 'ocr' ? 'Capture & Read Text (OCR)' : 'Snap Barcode'}
          </Text>
        </View>
      </View>

      {/* Processing HUD Overlay */}
      {isProcessing && (
        <BlurView intensity={70} tint="dark" style={styles.hudOverlay}>
          <View style={styles.hudCard}>
            <View style={styles.hudIconCircle}>
              {scanMode === 'ocr' ? (
                <ScanText size={26} color={colors.primary} />
              ) : (
                <ScanLine size={26} color={colors.primary} />
              )}
            </View>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 14 }} />
            <Text style={styles.hudTitle}>
              {scanMode === 'ocr' ? 'Reading Book Cover' : 'Analyzing Barcode'}
            </Text>
            <Text style={styles.hudSubtitle}>{processingStatus}</Text>
          </View>
        </BlurView>
      )}

      {/* OCR Results Modal Sheet */}
      <OcrResultModal
        visible={ocrModalVisible}
        onClose={() => setOcrModalVisible(false)}
        result={ocrResult}
        onSelectCandidate={handleSelectOcrCandidate}
        onManualCatalogWithText={handleManualCatalogWithText}
      />

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
    backgroundColor: 'rgba(18, 22, 26, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
  },
  glassButtonActive: {
    borderColor: '#FCD34D',
    backgroundColor: '#F59E0B',
  },
  modeSegmentContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: 24,
    padding: 4,
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  modeSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  modeSegmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modeSegmentText: {
    fontSize: 12.5,
    fontFamily: typography.sansMedium,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  modeSegmentTextActive: {
    color: '#0F172A',
    fontFamily: typography.sansBold,
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
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  shutterOuterRingOcr: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
  },
  shutterInnerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInnerCircleOcr: {
    backgroundColor: colors.primary,
  },
  shutterPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  shutterLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: typography.sansSemiBold,
    marginTop: 8,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 6,
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
