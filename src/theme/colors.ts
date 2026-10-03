import { Platform } from 'react-native';

export const colors = {
  // Base Backgrounds (Warm Minimalist Theme)
  background: '#FCFBFA',
  backgroundElevated: '#FFFFFF',
  card: '#F5F4F0',
  cardElevated: '#EFECE6',

  // Borders
  border: '#E5E3DC',
  borderLight: '#F0EFEA',

  // Primary Accent (Slate Teal / Indigo)
  primary: '#4A5B63',
  primaryMuted: '#DCE4E8',
  primaryLight: '#1E2B30',

  // Semantic Status
  success: '#567A66',
  successMuted: '#E3EFE8',
  warning: '#D98343',
  danger: '#B94B4B',
  dangerMuted: '#F5DDDD',

  // Text Hierarchy
  text: '#1C1D1C',
  textSecondary: '#5A5D5A',
  textMuted: '#8A8C8A',

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
