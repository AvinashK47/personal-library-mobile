import { Platform } from 'react-native';
import { Color } from 'expo-router';

export const colors = {
  // Base Backgrounds
  background: Platform.select({
    ios: Color.ios.systemBackground,
    android: Color.android.dynamic.background,
    default: '#FCFBFA', // Warm cream
  }) as string,
  
  backgroundElevated: Platform.select({
    ios: Color.ios.secondarySystemBackground,
    android: Color.android.dynamic.surface,
    default: '#FFFFFF',
  }) as string,

  card: Platform.select({
    ios: Color.ios.secondarySystemGroupedBackground,
    android: Color.android.dynamic.surfaceContainerLow,
    default: '#F5F4F0',
  }) as string,
  
  cardElevated: Platform.select({
    ios: Color.ios.tertiarySystemGroupedBackground,
    android: Color.android.dynamic.surfaceContainer,
    default: '#EFECE6',
  }) as string,

  // Borders
  border: Platform.select({
    ios: Color.ios.separator,
    android: Color.android.dynamic.outlineVariant,
    default: '#E5E3DC',
  }) as string,
  
  borderLight: Platform.select({
    ios: Color.ios.opaqueSeparator,
    android: Color.android.dynamic.outlineVariant,
    default: '#F0EFEA',
  }) as string,

  // Primary Accent
  primary: Platform.select({
    ios: Color.ios.systemIndigo,
    android: Color.android.dynamic.primary,
    default: '#4A5B63', // Sophisticated slate blue
  }) as string,

  primaryMuted: Platform.select({
    ios: Color.ios.systemFill,
    android: Color.android.dynamic.primaryContainer,
    default: '#DCE4E8',
  }) as string,

  primaryLight: Platform.select({
    ios: Color.ios.label,
    android: Color.android.dynamic.onPrimaryContainer,
    default: '#1E2B30',
  }) as string,

  // Semantic Status
  success: Platform.select({
    ios: Color.ios.systemGreen,
    android: Color.android.dynamic.tertiary,
    default: '#567A66',
  }) as string,

  successMuted: Platform.select({
    ios: Color.ios.tertiarySystemFill,
    android: Color.android.dynamic.tertiaryContainer,
    default: '#E3EFE8',
  }) as string,

  warning: Platform.select({
    ios: Color.ios.systemOrange,
    android: Color.android.material.orange400,
    default: '#D98343',
  }) as string,
  
  danger: Platform.select({
    ios: Color.ios.systemRed,
    android: Color.android.dynamic.error,
    default: '#B94B4B',
  }) as string,

  dangerMuted: Platform.select({
    ios: Color.ios.systemFill,
    android: Color.android.dynamic.errorContainer,
    default: '#F5DDDD',
  }) as string,

  // Text Hierarchy
  text: Platform.select({
    ios: Color.ios.label,
    android: Color.android.dynamic.onBackground,
    default: '#1C1D1C',
  }) as string,
  
  textSecondary: Platform.select({
    ios: Color.ios.secondaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#5A5D5A',
  }) as string,
  
  textMuted: Platform.select({
    ios: Color.ios.tertiaryLabel,
    android: Color.android.dynamic.outline,
    default: '#8A8C8A',
  }) as string,

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.4)',
  blurTint: Platform.select({ ios: 'regular', android: 'dark', default: 'light' }) as 'light' | 'dark' | 'regular',
};

export const typography = {
  serif: 'Newsreader_400Regular',
  serifBold: 'Newsreader_600SemiBold',
  serifItalic: 'Newsreader_400Regular_Italic',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
};
