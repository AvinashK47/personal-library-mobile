import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  X,
  Sparkles,
  BookOpen,
  ChevronRight,
  ScanText,
  CheckCircle2,
  FileText,
  AlertCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme/colors';
import { OCRIdentificationResponse, OCRIdentificationCandidate } from '../types';

interface OcrResultModalProps {
  visible: boolean;
  onClose: () => void;
  result: OCRIdentificationResponse | null;
  onSelectCandidate: (candidate: OCRIdentificationCandidate) => void;
  onManualCatalogWithText: (recognizedText: string) => void;
}

const { height } = Dimensions.get('window');

export const OcrResultModal: React.FC<OcrResultModalProps> = ({
  visible,
  onClose,
  result,
  onSelectCandidate,
  onManualCatalogWithText,
}) => {
  const insets = useSafeAreaInsets();
  const [showFullOcrText, setShowFullOcrText] = useState<boolean>(false);

  if (!result) return null;

  const ocrText = result.ocr.normalized_text || result.ocr.text || '';
  const confidencePercent = Math.round(result.ocr.confidence * 100);
  const candidates = result.candidates || [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { maxHeight: height * 0.88, paddingBottom: insets.bottom + 16 }]}>
          {/* Top handle bar */}
          <View style={styles.handle} />

          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.ocrIconCircle}>
                <ScanText size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>OCR Recognition Results</Text>
                <Text style={styles.modalSubtitle}>Tesseract Vision & Dual Metadata Matching</Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            >
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* OCR Detection Evidence Card */}
            <View style={styles.evidenceCard}>
              <View style={styles.evidenceHeader}>
                <View style={styles.evidenceTitleRow}>
                  <FileText size={15} color={colors.primary} />
                  <Text style={styles.evidenceTitle}>Extracted Text</Text>
                </View>

                <View style={styles.pillRow}>
                  <View style={styles.confidencePill}>
                    <Sparkles size={11} color={colors.success} />
                    <Text style={styles.confidenceText}>{confidencePercent}% Confidence</Text>
                  </View>
                  {result.ocr.orientation !== null && (
                    <View style={styles.orientationPill}>
                      <Text style={styles.orientationText}>{result.ocr.orientation}° EXIF</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text
                style={styles.ocrSnippetText}
                numberOfLines={showFullOcrText ? undefined : 3}
              >
                {ocrText.trim() ? `"${ocrText.trim()}"` : 'No readable text was recognized.'}
              </Text>

              {ocrText.length > 90 && (
                <Pressable
                  style={styles.toggleMoreBtn}
                  onPress={() => setShowFullOcrText(!showFullOcrText)}
                >
                  <Text style={styles.toggleMoreText}>
                    {showFullOcrText ? 'Show less' : 'View full raw text…'}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Candidates Section */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>
                Matched Volumes ({candidates.length})
              </Text>
              <Text style={styles.sectionSubtitle}>
                Ranked by title & author signal
              </Text>
            </View>

            {candidates.length > 0 ? (
              candidates.map((item, index) => {
                const matchPercent = Math.round(item.match_score * 100);
                const hasHighMatch = matchPercent >= 70;

                return (
                  <Pressable
                    key={`candidate-${index}-${item.isbn13 || item.isbn10 || index}`}
                    style={({ pressed }) => [
                      styles.candidateCard,
                      index === 0 && styles.topCandidateCard,
                      pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
                    ]}
                    onPress={() => {
                      try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      } catch {}
                      onSelectCandidate(item);
                    }}
                  >
                    {/* Cover art thumbnail */}
                    <View style={styles.coverThumbnailWrapper}>
                      {item.cover_url ? (
                        <Image
                          source={{ uri: item.cover_url }}
                          style={styles.coverThumbnail}
                          contentFit="cover"
                          transition={200}
                        />
                      ) : (
                        <View style={styles.coverFallback}>
                          <BookOpen size={24} color={colors.primaryLight} />
                        </View>
                      )}
                    </View>

                    {/* Book Information */}
                    <View style={styles.candidateInfo}>
                      <View style={styles.candidateTopRow}>
                        <View
                          style={[
                            styles.matchScoreBadge,
                            hasHighMatch ? styles.matchScoreHigh : styles.matchScoreMed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.matchScoreText,
                              hasHighMatch && { color: colors.success },
                            ]}
                          >
                            {matchPercent}% Match
                          </Text>
                        </View>

                        {item.provider && (
                          <View style={styles.providerBadge}>
                            <Text style={styles.providerBadgeText}>
                              {item.provider === 'openlibrary'
                                ? 'Open Library'
                                : item.provider === 'google_books'
                                ? 'Google Books'
                                : item.provider}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.candidateTitle} numberOfLines={2}>
                        {item.title || 'Untitled Volume'}
                      </Text>

                      <Text style={styles.candidateAuthors} numberOfLines={1}>
                        {item.authors?.length > 0
                          ? item.authors.join(', ')
                          : 'Unknown Author'}
                      </Text>

                      {(item.isbn13 || item.isbn10) && (
                        <Text style={styles.candidateIsbn}>
                          ISBN: {item.isbn13 || item.isbn10}
                        </Text>
                      )}
                    </View>

                    <View style={styles.arrowContainer}>
                      <ChevronRight size={18} color={colors.textSecondary} />
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.noCandidatesBox}>
                <AlertCircle size={28} color={colors.warning} />
                <Text style={styles.noCandidatesTitle}>No Direct Catalog Matches</Text>
                <Text style={styles.noCandidatesDesc}>
                  Tesseract detected text from the cover, but no exact book title or author
                  matched records in Open Library or Google Books.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.manualBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => onManualCatalogWithText(ocrText)}
                >
                  <BookOpen size={16} color={colors.background as string} />
                  <Text style={styles.manualBtnText}>
                    Catalog Manually With Recognized Text
                  </Text>
                </Pressable>
              </View>
            )}

            {candidates.length > 0 && (
              <Pressable
                style={styles.manualFallbackLink}
                onPress={() => onManualCatalogWithText(ocrText)}
              >
                <Text style={styles.manualFallbackLinkText}>
                  None of these match? Catalog manually
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingTop: 12,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  ocrIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: typography.sansSemiBold,
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 11,
    fontFamily: typography.sans,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: colors.cardElevated,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  evidenceCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  evidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  evidenceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  evidenceTitle: {
    fontSize: 12,
    fontFamily: typography.sansSemiBold,
    color: colors.textSecondary,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  confidenceText: {
    fontSize: 10,
    fontFamily: typography.sansMedium,
    color: colors.text,
  },
  orientationPill: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  orientationText: {
    fontSize: 10,
    fontFamily: typography.sans,
    color: colors.textMuted,
  },
  ocrSnippetText: {
    fontSize: 13,
    fontFamily: typography.serifItalic,
    color: colors.text,
    lineHeight: 19,
  },
  toggleMoreBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  toggleMoreText: {
    fontSize: 11,
    fontFamily: typography.sansMedium,
    color: colors.primary,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: typography.sansSemiBold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: typography.sans,
    color: colors.textMuted,
  },
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topCandidateCard: {
    borderColor: 'rgba(74, 91, 99, 0.45)',
    backgroundColor: colors.cardElevated,
  },
  coverThumbnailWrapper: {
    width: 48,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.card,
    marginRight: 12,
  },
  coverThumbnail: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
  },
  candidateInfo: {
    flex: 1,
    marginRight: 8,
  },
  candidateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  matchScoreBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  matchScoreHigh: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  matchScoreMed: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  matchScoreText: {
    fontSize: 10,
    fontFamily: typography.sansSemiBold,
    color: colors.text,
  },
  providerBadge: {
    backgroundColor: colors.card,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  providerBadgeText: {
    fontSize: 9,
    fontFamily: typography.sans,
    color: colors.textMuted,
  },
  candidateTitle: {
    fontSize: 14,
    fontFamily: typography.serif,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 2,
  },
  candidateAuthors: {
    fontSize: 12,
    fontFamily: typography.sans,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  candidateIsbn: {
    fontSize: 10,
    fontFamily: typography.sans,
    color: colors.textMuted,
  },
  arrowContainer: {
    paddingLeft: 4,
  },
  noCandidatesBox: {
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  noCandidatesTitle: {
    fontSize: 15,
    fontFamily: typography.sansSemiBold,
    color: colors.text,
    marginTop: 10,
    marginBottom: 6,
  },
  noCandidatesDesc: {
    fontSize: 12,
    fontFamily: typography.sans,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
  },
  manualBtnText: {
    color: colors.background,
    fontSize: 13,
    fontFamily: typography.sansSemiBold,
  },
  manualFallbackLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  manualFallbackLinkText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: typography.sans,
    textDecorationLine: 'underline',
  },
});
