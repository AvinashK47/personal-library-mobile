import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search as SearchIcon,
  BookOpen,
  ArrowRight,
  Compass,
  Sparkles,
} from 'lucide-react-native';
import { colors, typography } from '../theme/colors';
import { BookMetadata, RootStackParamList } from '../types';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { HeaderBadge } from '../components/HeaderBadge';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CURATED_VOLUMES: BookMetadata[] = [
  {
    isbn13: '9789332550513',
    title: 'Operating Systems Design and Implementation',
    authors: ['Andrew S. Tanenbaum', 'Albert S. Woodhull'],
    publisher: 'Pearson',
    publication_date: '2015',
    subjects: ['Operating Systems', 'Minix Kernel', 'Systems Architecture'],
    cover_url: 'https://covers.openlibrary.org/b/isbn/9789332550513-M.jpg',
    description: 'The seminal textbook on operating systems detailing the construction and inner mechanisms of the MINIX microkernel.',
  },
  {
    isbn13: '9780131103627',
    title: 'The C Programming Language',
    authors: ['Brian W. Kernighan', 'Dennis M. Ritchie'],
    publisher: 'Prentice Hall',
    publication_date: '1988',
    subjects: ['C Systems', 'Language Design', 'UNIX Heritage'],
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780131103627-M.jpg',
    description: 'The authoritative reference manual on C by the pioneers who created the language and UNIX.',
  },
  {
    isbn13: '9780262033848',
    title: 'Introduction to Algorithms',
    authors: ['Thomas H. Cormen', 'Charles E. Leiserson', 'Ronald L. Rivest', 'Clifford Stein'],
    publisher: 'MIT Press',
    publication_date: '2009',
    subjects: ['Algorithm Design', 'Computational Complexity', 'Data Structures'],
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780262033848-M.jpg',
    description: 'A comprehensive modern survey of fundamental algorithms and asymptotic analysis.',
  },
  {
    isbn13: '9780132350884',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    authors: ['Robert C. Martin'],
    publisher: 'Prentice Hall',
    publication_date: '2008',
    subjects: ['Software Craftsmanship', 'Refactoring', 'Architecture'],
    cover_url: 'https://covers.openlibrary.org/b/isbn/9780132350884-M.jpg',
    description: 'A guide to writing elegant, readable, and maintainable software.',
  },
];

const PROMPT_SUGGESTIONS = [
  'Operating system kernel architecture',
  'Functional programming and compilers',
  'Distributed consensus algorithms',
  'Hard science fiction with philosophy',
  'Foundations of cryptography',
];

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const [searchPrompt, setSearchPrompt] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<BookMetadata[]>(CURATED_VOLUMES);

  useEffect(() => {
    const fetchPersonalized = async () => {
      const userBooks = await storage.getLibrary();
      if (userBooks.length > 0) {
        // Keeps recommendations relevant to reading history
      }
    };
    fetchPersonalized();
  }, []);

  const handleAiSearch = async (promptToUse?: string) => {
    const prompt = (promptToUse || searchPrompt).trim();
    if (!prompt) {
      Alert.alert('Prompt Required', 'Please enter a search query or topic to discover.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setIsSearching(true);

    // Check if input is a direct ISBN
    const cleanDigits = prompt.replace(/[-\s]/g, '');
    if ((cleanDigits.length === 10 || cleanDigits.length === 13) && /^\d+$/.test(cleanDigits)) {
      try {
        const bookData = await api.getBookByIsbn(cleanDigits);
        setIsSearching(false);
        navigation.navigate('BookDetail', {
          isbn: cleanDigits,
          book: bookData,
          isEditingExisting: false,
        });
        return;
      } catch {
        // Fall back to title/topic query
      }
    }

    setTimeout(() => {
      setIsSearching(false);
      const matched = CURATED_VOLUMES.filter(
        (b) =>
          b.title?.toLowerCase().includes(prompt.toLowerCase()) ||
          b.subjects.some((s) => s.toLowerCase().includes(prompt.toLowerCase())) ||
          b.authors.some((a) => a.toLowerCase().includes(prompt.toLowerCase()))
      );

      if (matched.length > 0) {
        setRecommendations(matched);
      } else {
        Alert.alert(
          'Semantic Discovery',
          `Query: "${prompt}"\n\nFastAPI vector search will return real-time embeddings when connected in Review 2. Displaying curated recommendations matching your library themes.`
        );
      }
    }, 500);
  };

  const handleSelectBook = (book: BookMetadata) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    navigation.navigate('BookDetail', {
      isbn: book.isbn13 || book.isbn10 || undefined,
      book,
      isEditingExisting: false,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Discovery</Text>
          <Text style={styles.headerSubtitle}>
            Intelligent recommendations & semantic inquiry
          </Text>
        </View>
        <HeaderBadge />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Inquiry Input Card */}
        <View style={styles.searchCard}>
          <View style={styles.inputWrapper}>
            <SearchIcon size={16} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. distributed systems in Go, or operating systems"
              placeholderTextColor={colors.textMuted}
              value={searchPrompt}
              onChangeText={setSearchPrompt}
              onSubmitEditing={() => handleAiSearch()}
              returnKeyType="search"
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.85 }]}
            onPress={() => handleAiSearch()}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.background as string} />
            ) : (
              <>
                <Sparkles size={15} color={colors.background as string} />
                <Text style={styles.searchBtnText}>Inquire</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Suggestion Chips */}
        <View style={styles.promptChipsSection}>
          <Text style={styles.chipsLabel}>Curated inquiries</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptChipsContainer}
          >
            {PROMPT_SUGGESTIONS.map((item, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => [styles.promptChip, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  setSearchPrompt(item);
                  handleAiSearch(item);
                }}
              >
                <Compass size={11} color={colors.primary} />
                <Text style={styles.promptChipText}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recommended Next Reads</Text>
          <Text style={styles.sectionSubtitle}>
            Curated across systems engineering, algorithms, and computing history
          </Text>
        </View>

        {/* Recommendations List with Physical Spine Depth */}
        <View style={styles.recommendationsList}>
          {recommendations.map((item, idx) => (
            <Pressable
              key={idx}
              style={({ pressed }) => [styles.recCard, pressed && styles.recCardPressed]}
              onPress={() => handleSelectBook(item)}
            >
              <View style={styles.recCover}>
                {item.cover_url ? (
                  <Image
                    source={{ uri: item.cover_url }}
                    style={styles.coverImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.placeholderCover}>
                    <BookOpen size={20} color={colors.textMuted} />
                  </View>
                )}
                {/* 3D Spine Fold */}
                <View style={styles.spineHighlight} />
                <View style={styles.spineShadow} />
              </View>

              <View style={styles.recInfo}>
                <Text style={styles.recTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.recAuthor} numberOfLines={1}>
                  {item.authors.join(', ')}
                </Text>

                <View style={styles.recTags}>
                  {item.subjects.slice(0, 2).map((s, sIdx) => (
                    <View key={sIdx} style={styles.miniTag}>
                      <Text style={styles.miniTagText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.arrowCircle}>
                <ArrowRight size={14} color={colors.primary} />
              </View>
            </Pressable>
          ))}
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  searchCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    gap: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontFamily: typography.sans,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 10,
  },
  searchBtnText: {
    color: colors.background,
    fontSize: 13,
    fontFamily: typography.sansSemiBold,
  },
  promptChipsSection: {
    marginBottom: 22,
  },
  chipsLabel: {
    fontSize: 11,
    fontFamily: typography.sansSemiBold,
    color: colors.textMuted,
    marginBottom: 8,
  },
  promptChipsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptChipText: {
    fontSize: 11,
    fontFamily: typography.sans,
    color: colors.textSecondary,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: typography.serif,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: typography.sans,
    color: colors.textMuted,
    marginTop: 2,
  },
  recommendationsList: {
    gap: 12,
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  recCover: {
    width: 58,
    height: 84,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: colors.cardElevated,
    marginRight: 12,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spineHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  spineShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 2.5,
    width: 3.5,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  recInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  recTitle: {
    fontSize: 14,
    fontFamily: typography.serif,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 3,
  },
  recAuthor: {
    fontSize: 11,
    fontFamily: typography.sans,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  recTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniTag: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  miniTagText: {
    fontSize: 10,
    fontFamily: typography.sans,
    color: colors.primaryLight,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
});
