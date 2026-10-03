import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Star,
  Bookmark,
  CheckCircle,
  Clock,
  BookOpen,
  Trash2,
  Calendar,
  Building,
  Hash,
  Sparkles,
} from 'lucide-react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme/colors';
import { BookMetadata, LibraryBook, ReadingStatus, RootStackParamList } from '../types';
import { storage } from '../services/storage';

type RouteProps = RouteProp<RootStackParamList, 'BookDetail'>;
type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Passable',
  2: 'Fair volume',
  3: 'Worthwhile read',
  4: 'Compelling work',
  5: 'Essential masterpiece',
};

export const BookDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const insets = useSafeAreaInsets();

  const { book: initialBook, isbn } = route.params || {};

  const [book, setBook] = useState<BookMetadata | LibraryBook | undefined>(initialBook);
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>('to_read');
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(false);

  useEffect(() => {
    const checkSaved = async () => {
      const searchKey = isbn || book?.isbn13 || book?.isbn10;
      if (searchKey) {
        const existing = await storage.getBook(searchKey);
        if (existing) {
          setIsSaved(true);
          setReadingStatus(existing.readingStatus || 'to_read');
          setRating(existing.rating || 0);
          setNotes(existing.personalNotes || '');
          setBook(existing);
        }
      }
    };
    checkSaved();
  }, [isbn, book?.isbn13, book?.isbn10]);

  const handleStarPress = (val: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setRating(val === rating ? 0 : val);
  };

  const handleStatusChange = (status: ReadingStatus) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setReadingStatus(status);
  };

  const handleSave = async () => {
    if (!book && !isbn) return;

    try {
      setIsSaving(true);
      const bookId = book?.isbn13 || book?.isbn10 || isbn || `book-${Date.now()}`;

      const libraryBook: LibraryBook = {
        id: bookId,
        isbn10: book?.isbn10 || (isbn?.length === 10 ? isbn : undefined),
        isbn13: book?.isbn13 || (isbn?.length === 13 ? isbn : undefined),
        title: book?.title || 'Untitled Volume',
        authors: book?.authors || [],
        publisher: book?.publisher,
        publication_date: book?.publication_date,
        description: book?.description,
        subjects: book?.subjects || [],
        cover_url: book?.cover_url,
        openlibrary_work_id: book?.openlibrary_work_id,
        openlibrary_edition_id: book?.openlibrary_edition_id,
        readingStatus,
        rating,
        personalNotes: notes,
        addedAt: (book as LibraryBook)?.addedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await storage.saveBook(libraryBook);
      setIsSaved(true);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      Alert.alert(
        'Catalog Updated',
        `"${libraryBook.title}" has been preserved in your personal collection.`,
        [
          {
            text: 'View Bookshelf',
            onPress: () => {
              navigation.navigate('MainTabs');
            },
          },
          { text: 'Keep Editing', style: 'cancel' },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save book to library.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const bookId = (book as LibraryBook)?.id || book?.isbn13 || book?.isbn10 || isbn;
    if (!bookId) return;

    Alert.alert(
      'Remove from Collection',
      `Are you sure you want to remove "${book?.title || 'this volume'}" from your library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await storage.deleteBook(bookId);
            setIsSaved(false);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>

        <Text style={styles.headerTitle}>
          {isSaved ? 'Volume Details' : 'Discovered Volume'}
        </Text>

        {isSaved ? (
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
          >
            <Trash2 size={18} color={colors.danger} />
          </Pressable>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Book Presentation with 3D Spine and Ambient Shadow */}
        <View style={styles.heroSection}>
          <View style={styles.bookShadowContainer}>
            <View style={styles.bookCoverCard}>
              {book?.cover_url ? (
                <Image
                  source={{ uri: book.cover_url }}
                  style={styles.coverImage}
                  contentFit="cover"
                  transition={300}
                />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <BookOpen size={48} color={colors.textMuted} />
                  <Text style={styles.placeholderText}>No Cover Available</Text>
                </View>
              )}

              {/* Physical Book Spine & Page Edge simulation */}
              <View style={styles.bookSpineBevel} />
              <View style={styles.bookSpineShadow} />
              <View style={styles.pageEdgeEffect} />
            </View>
          </View>

          <Text style={styles.title}>{book?.title || 'Untitled Volume'}</Text>
          <Text style={styles.authors}>
            {book?.authors && book.authors.length > 0 ? book.authors.join(', ') : 'Unknown Author'}
          </Text>

          {/* Bibliographic Pills */}
          <View style={styles.metaPillsRow}>
            {book?.publication_date && (
              <View style={styles.metaPill}>
                <Calendar size={12} color={colors.textSecondary} />
                <Text style={styles.metaPillText}>{book.publication_date}</Text>
              </View>
            )}
            {book?.publisher && (
              <View style={styles.metaPill}>
                <Building size={12} color={colors.textSecondary} />
                <Text style={styles.metaPillText} numberOfLines={1}>
                  {book.publisher}
                </Text>
              </View>
            )}
            {(book?.isbn13 || book?.isbn10 || isbn) && (
              <View style={styles.metaPill}>
                <Hash size={12} color={colors.textSecondary} />
                <Text style={styles.metaPillText}>
                  {book?.isbn13 || book?.isbn10 || isbn}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Reading Status & Interactive Rating Card */}
        <View style={styles.readingCard}>
          <Text style={styles.cardHeader}>Reading status</Text>
          <View style={styles.statusSegment}>
            <Pressable
              style={[
                styles.segmentOption,
                readingStatus === 'to_read' && styles.segmentOptionActive,
              ]}
              onPress={() => handleStatusChange('to_read')}
            >
              <Bookmark
                size={14}
                color={readingStatus === 'to_read' ? colors.background as string : colors.textSecondary as string}
              />
              <Text
                style={[
                  styles.segmentText,
                  readingStatus === 'to_read' && styles.segmentTextActive,
                ]}
              >
                To read
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.segmentOption,
                readingStatus === 'reading' && styles.segmentOptionActive,
              ]}
              onPress={() => handleStatusChange('reading')}
            >
              <Clock
                size={14}
                color={readingStatus === 'reading' ? colors.background as string : colors.textSecondary as string}
              />
              <Text
                style={[
                  styles.segmentText,
                  readingStatus === 'reading' && styles.segmentTextActive,
                ]}
              >
                Reading
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.segmentOption,
                readingStatus === 'completed' && styles.segmentOptionActive,
              ]}
              onPress={() => handleStatusChange('completed')}
            >
              <CheckCircle
                size={14}
                color={readingStatus === 'completed' ? colors.background as string : colors.textSecondary as string}
              />
              <Text
                style={[
                  styles.segmentText,
                  readingStatus === 'completed' && styles.segmentTextActive,
                ]}
              >
                Finished
              </Text>
            </Pressable>
          </View>

          {/* Rating Stars with Descriptive Label */}
          <View style={styles.ratingSection}>
            <View style={styles.ratingHeaderRow}>
              <Text style={styles.cardHeader}>Your rating</Text>
              {rating > 0 && (
                <Text style={styles.ratingDescriptionText}>
                  {RATING_DESCRIPTIONS[rating] || ''}
                </Text>
              )}
            </View>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((val) => (
                <Pressable
                  key={val}
                  onPress={() => handleStarPress(val)}
                  style={styles.starTouchable}
                >
                  <Star
                    size={26}
                    color={val <= rating ? colors.primary : colors.textMuted}
                    fill={val <= rating ? colors.primary : 'transparent'}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Personal Marginalia & Notes */}
          <Text style={styles.cardHeader}>Personal marginalia & notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Record impressions, favorite passages, or thoughts on this edition…"
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Save Action */}
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.background as string} />
            ) : (
              <>
                <Bookmark size={16} color={colors.background as string} />
                <Text style={styles.saveBtnText}>
                  {isSaved ? 'Update in Library' : 'Save Volume to Library'}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Synopsis & Overview */}
        {book?.description ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Overview</Text>
            <Text
              style={styles.descriptionText}
              numberOfLines={descriptionExpanded ? undefined : 5}
            >
              {book.description}
            </Text>
            <Pressable
              onPress={() => setDescriptionExpanded(!descriptionExpanded)}
              style={styles.readMoreBtn}
            >
              <Text style={styles.readMoreText}>
                {descriptionExpanded ? 'Collapse' : 'Read full synopsis'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Thematic Subjects */}
        {book?.subjects && book.subjects.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Thematic Classifications</Text>
            <View style={styles.tagsContainer}>
              {book.subjects.slice(0, 10).map((subj, idx) => (
                <View key={idx} style={styles.subjectTag}>
                  <Text style={styles.subjectText}>{subj}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bibliographic Identifiers */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Bibliographic Record</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ISBN-13</Text>
            <Text style={styles.detailValue}>{book?.isbn13 || '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ISBN-10</Text>
            <Text style={styles.detailValue}>{book?.isbn10 || '—'}</Text>
          </View>
          {book?.openlibrary_work_id && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Open Library Work</Text>
              <Text style={styles.detailValue}>{book.openlibrary_work_id}</Text>
            </View>
          )}
          {book?.openlibrary_edition_id && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Open Library Edition</Text>
              <Text style={styles.detailValue}>{book.openlibrary_edition_id}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: typography.sansSemiBold,
    color: colors.text,
  },
  scrollContent: {
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  bookShadowContainer: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 12,
  },
  bookCoverCard: {
    width: 156,
    height: 234,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.cardElevated,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  placeholderText: {
    fontSize: 11,
    fontFamily: typography.sans,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  bookSpineBevel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  bookSpineShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 4,
    width: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  pageEdgeEffect: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: 24,
    fontFamily: typography.serifBold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 30,
  },
  authors: {
    fontSize: 14,
    fontFamily: typography.sans,
    color: colors.primaryLight,
    textAlign: 'center',
    marginBottom: 14,
  },
  metaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaPillText: {
    fontSize: 11,
    fontFamily: typography.sans,
    color: colors.textSecondary,
    maxWidth: 160,
  },
  readingCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  cardHeader: {
    fontSize: 12,
    fontFamily: typography.sansSemiBold,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statusSegment: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
    gap: 4,
  },
  segmentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  segmentOptionActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 12,
    fontFamily: typography.sans,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.background,
    fontFamily: typography.sansSemiBold,
  },
  ratingSection: {
    marginBottom: 18,
  },
  ratingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingDescriptionText: {
    fontSize: 12,
    fontFamily: typography.serifItalic,
    color: colors.primaryLight,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  starTouchable: {
    padding: 4,
  },
  notesInput: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    fontFamily: typography.sans,
    color: colors.text,
    minHeight: 84,
    marginBottom: 16,
    lineHeight: 19,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  saveBtnText: {
    color: colors.background,
    fontSize: 14,
    fontFamily: typography.sansSemiBold,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  infoCardTitle: {
    fontSize: 14,
    fontFamily: typography.sansSemiBold,
    color: colors.text,
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectTag: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subjectText: {
    fontSize: 11,
    fontFamily: typography.sans,
    color: colors.textSecondary,
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: typography.sans,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  readMoreBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontFamily: typography.sansMedium,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: typography.sans,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 12,
    fontFamily: typography.sansMedium,
    color: colors.text,
  },
});
