import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search as SearchIcon,
  Plus,
  BookOpen,
  LayoutGrid,
  List as ListIcon,
  Compass,
} from 'lucide-react-native';
import { colors, typography } from '../theme/colors';
import { LibraryBook, ReadingStatus, RootStackParamList } from '../types';
import { storage } from '../services/storage';
import { BookCard } from '../components/BookCard';
import { HeaderBadge } from '../components/HeaderBadge';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FilterTab = 'all' | ReadingStatus;

export const LibraryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  const loadBooks = async () => {
    const list = await storage.getLibrary();
    setBooks(list);
  };

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  };

  const handleFilterChange = (filter: FilterTab) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveFilter(filter);
  };

  const handleLayoutToggle = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setLayoutMode(layoutMode === 'grid' ? 'list' : 'grid');
  };

  // Filter books based on active tab and search query
  const filteredBooks = books.filter((b) => {
    const matchesFilter =
      activeFilter === 'all' ? true : b.readingStatus === activeFilter;

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      b.title?.toLowerCase().includes(query) ||
      b.authors?.some((a) => a.toLowerCase().includes(query)) ||
      b.isbn13?.includes(query) ||
      b.subjects?.some((s) => s.toLowerCase().includes(query));

    return matchesFilter && matchesSearch;
  });

  const totalCount = books.length;
  const readingCount = books.filter((b) => b.readingStatus === 'reading').length;
  const completedCount = books.filter((b) => b.readingStatus === 'completed').length;
  const toReadCount = books.filter((b) => b.readingStatus === 'to_read').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>My Library</Text>
          <Text style={styles.headerSubtitle}>
            {totalCount} {totalCount === 1 ? 'volume' : 'volumes'} in personal collection
          </Text>
        </View>

        <View style={styles.headerActions}>
          <HeaderBadge />
          <Pressable
            style={({ pressed }) => [styles.viewToggleBtn, pressed && { opacity: 0.7 }]}
            onPress={handleLayoutToggle}
          >
            {layoutMode === 'grid' ? (
              <ListIcon size={18} color={colors.textSecondary} />
            ) : (
              <LayoutGrid size={18} color={colors.textSecondary} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <SearchIcon size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title, author, or subject…"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Editorial Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <Pressable
          style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
          onPress={() => handleFilterChange('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              activeFilter === 'all' && styles.filterTabTextActive,
            ]}
          >
            All ({totalCount})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterTab, activeFilter === 'reading' && styles.filterTabActive]}
          onPress={() => handleFilterChange('reading')}
        >
          <Text
            style={[
              styles.filterTabText,
              activeFilter === 'reading' && styles.filterTabTextActive,
            ]}
          >
            Reading ({readingCount})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterTab, activeFilter === 'to_read' && styles.filterTabActive]}
          onPress={() => handleFilterChange('to_read')}
        >
          <Text
            style={[
              styles.filterTabText,
              activeFilter === 'to_read' && styles.filterTabTextActive,
            ]}
          >
            To read ({toReadCount})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterTab, activeFilter === 'completed' && styles.filterTabActive]}
          onPress={() => handleFilterChange('completed')}
        >
          <Text
            style={[
              styles.filterTabText,
              activeFilter === 'completed' && styles.filterTabTextActive,
            ]}
          >
            Finished ({completedCount})
          </Text>
        </Pressable>
      </View>

      {/* Books Showcase */}
      <FlatList
        key={layoutMode} // Re-render when switching column count
        data={filteredBooks}
        numColumns={layoutMode === 'grid' ? 2 : 1}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookCard
            book={item}
            layout={layoutMode}
            onPress={() => {
              navigation.navigate('BookDetail', {
                isbn: item.isbn13 || item.isbn10 || undefined,
                book: item,
                isEditingExisting: true,
              });
            }}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          layoutMode === 'grid' && styles.gridListContent,
        ]}
        columnWrapperStyle={layoutMode === 'grid' ? styles.gridRow : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <BookOpen size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {books.length === 0
                ? 'Your library is waiting'
                : 'No matching volumes found'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {books.length === 0
                ? 'Scan an ISBN barcode with your camera or enter details manually to begin cataloging your collection.'
                : 'Try adjusting your search terms or filter selections.'}
            </Text>

            {books.length === 0 && (
              <Pressable
                style={({ pressed }) => [styles.scanCtaBtn, pressed && { opacity: 0.85 }]}
                onPress={() => navigation.navigate('MainTabs')}
              >
                <Plus size={16} color={colors.background as string} />
                <Text style={styles.scanCtaBtnText}>Scan a Volume</Text>
              </Pressable>
            )}
          </View>
        )}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: typography.serifBold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: typography.sans,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontFamily: typography.sans,
  },
  filterTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontFamily: typography.sans,
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.primaryLight,
    fontFamily: typography.sansMedium,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  gridListContent: {
    paddingHorizontal: 12,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 28,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: typography.serif,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: typography.sans,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  scanCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  scanCtaBtnText: {
    color: colors.background,
    fontSize: 14,
    fontFamily: typography.sansSemiBold,
  },
});
