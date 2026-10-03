import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { BookOpen, Star } from 'lucide-react-native';
import { LibraryBook, ReadingStatus } from '../types';
import { colors, typography } from '../theme/colors';

interface BookCardProps {
  book: LibraryBook;
  onPress: () => void;
  layout?: 'list' | 'grid';
}

const getStatusBadge = (status: ReadingStatus) => {
  switch (status) {
    case 'reading':
      return { label: 'Reading', color: colors.primary, bg: colors.primaryMuted, dot: colors.primary };
    case 'completed':
      return { label: 'Finished', color: colors.success, bg: colors.successMuted, dot: colors.success };
    case 'to_read':
    default:
      return { label: 'To read', color: colors.textSecondary, bg: colors.borderLight, dot: colors.textMuted };
  }
};

export const BookCard: React.FC<BookCardProps> = ({ book, onPress, layout = 'list' }) => {
  const statusInfo = getStatusBadge(book.readingStatus);

  if (layout === 'grid') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.gridCard, pressed && styles.cardPressed]}
      >
        <View style={styles.gridCoverWrapper}>
          {book.cover_url ? (
            <Image
              source={{ uri: book.cover_url }}
              style={styles.gridCoverImage}
              contentFit="cover"
              transition={250}
            />
          ) : (
            <View style={styles.gridCoverPlaceholder}>
              <BookOpen size={24} color={colors.textMuted} />
              <Text style={styles.gridPlaceholderTitle} numberOfLines={3}>
                {book.title || 'Untitled'}
              </Text>
            </View>
          )}

          {/* Book Spine Simulation (Left highlight shadow) */}
          <View style={styles.spineHighlight} />
          <View style={styles.spineShadow} />

          {/* Status Indicator Dot on Cover */}
          <View style={[styles.coverStatusDot, { backgroundColor: statusInfo.dot }]} />
        </View>

        <View style={styles.gridMeta}>
          <Text style={styles.gridTitle} numberOfLines={2}>
            {book.title || 'Untitled'}
          </Text>
          <Text style={styles.gridAuthor} numberOfLines={1}>
            {book.authors && book.authors.length > 0 ? book.authors[0] : 'Unknown'}
          </Text>

          {book.rating > 0 && (
            <View style={styles.gridRating}>
              <Star size={11} color={colors.primary} fill={colors.primary} />
              <Text style={styles.gridRatingText}>{book.rating}</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.listCard, pressed && styles.cardPressed]}
    >
      {/* Book Cover with Physical Book Spine Depth */}
      <View style={styles.listCoverWrapper}>
        {book.cover_url ? (
          <Image
            source={{ uri: book.cover_url }}
            style={styles.listCoverImage}
            contentFit="cover"
            transition={250}
          />
        ) : (
          <View style={styles.listCoverPlaceholder}>
            <BookOpen size={24} color={colors.textMuted} />
          </View>
        )}
        {/* Book Spine depth */}
        <View style={styles.spineHighlight} />
        <View style={styles.spineShadow} />
      </View>

      <View style={styles.listInfo}>
        <View style={styles.listHeaderRow}>
          <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
            <View style={[styles.statusDotSmall, { backgroundColor: statusInfo.dot }]} />
            <Text style={[styles.statusPillText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>

          {book.rating > 0 && (
            <View style={styles.ratingBadge}>
              <Star size={11} color={colors.primary} fill={colors.primary} />
              <Text style={styles.ratingValue}>{book.rating}</Text>
            </View>
          )}
        </View>

        <Text style={styles.listTitle} numberOfLines={2}>
          {book.title || 'Untitled Book'}
        </Text>

        <Text style={styles.listAuthor} numberOfLines={1}>
          {book.authors && book.authors.length > 0 ? book.authors.join(', ') : 'Unknown Author'}
        </Text>

        <View style={styles.listFooter}>
          {book.publication_date ? (
            <Text style={styles.listMetaDate}>{book.publication_date}</Text>
          ) : null}

          {book.isbn13 ? (
            <Text style={styles.listMetaIsbn}>{book.isbn13}</Text>
          ) : null}
        </View>

        {book.personalNotes ? (
          <Text style={styles.listNotesPreview} numberOfLines={1}>
            "{book.personalNotes}"
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  // List Layout
  listCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  listCoverWrapper: {
    width: 84,
    height: 124,
    backgroundColor: colors.cardElevated,
    position: 'relative',
    overflow: 'hidden',
  },
  listCoverImage: {
    width: '100%',
    height: '100%',
  },
  listCoverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardElevated,
  },
  listInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  statusDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: typography.sansMedium,
    letterSpacing: 0.2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingValue: {
    fontSize: 11,
    fontFamily: typography.sansSemiBold,
    color: colors.primary,
  },
  listTitle: {
    fontSize: 15,
    fontFamily: typography.serif,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 2,
  },
  listAuthor: {
    fontSize: 12,
    fontFamily: typography.sans,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  listFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listMetaDate: {
    fontSize: 10,
    fontFamily: typography.sans,
    color: colors.textMuted,
  },
  listMetaIsbn: {
    fontSize: 10,
    fontFamily: typography.sans,
    color: colors.textMuted,
    opacity: 0.8,
  },
  listNotesPreview: {
    fontSize: 11,
    fontFamily: typography.serifItalic,
    color: colors.primaryLight,
    marginTop: 4,
    opacity: 0.9,
  },

  // Grid Layout
  gridCard: {
    flex: 1,
    maxWidth: '48%',
    marginBottom: 16,
    marginHorizontal: 4,
  },
  gridCoverWrapper: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.cardElevated,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridCoverImage: {
    width: '100%',
    height: '100%',
  },
  gridCoverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.cardElevated,
  },
  gridPlaceholderTitle: {
    fontSize: 11,
    fontFamily: typography.serif,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 15,
  },
  coverStatusDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.cardElevated,
  },
  gridMeta: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  gridTitle: {
    fontSize: 13,
    fontFamily: typography.serif,
    color: colors.text,
    lineHeight: 17,
    marginBottom: 2,
  },
  gridAuthor: {
    fontSize: 11,
    fontFamily: typography.sans,
    color: colors.textMuted,
  },
  gridRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  gridRatingText: {
    fontSize: 10,
    fontFamily: typography.sansSemiBold,
    color: colors.primary,
  },

  // 3D Physical Spine Depth
  spineHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  spineShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 3,
    width: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
});
