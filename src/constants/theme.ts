/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

import type { Category } from '@/constants/categories';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// --- Recall design system (spec section 7) ---
// Dark-mode-first brand tokens, distinct from the `Colors` demo palette above.
// `Colors`/`Fonts` drive the Expo starter screens still in src/app; THEMES below
// drives every Recall-specific screen built from here on.

export type ThemeMode = 'dark' | 'light';

export interface ThemeTokens {
  bg: string;
  card: string;
  modal: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  cardBorder: string;
  reminderCardBg: string;
  reminderText: string;
  reminderIcon: string;
  pillPrimaryBg: string;
  pillPrimaryText: string;
  dotEmptyBorder: string;
  contactLink: string;
}

export const THEMES: Record<ThemeMode, ThemeTokens> = {
  dark: {
    bg: '#0D0D0F',
    card: '#1B1B1E',
    modal: '#222126',
    inputBg: '#232226',
    textPrimary: '#F3F2EE',
    textSecondary: '#A9A9AD',
    textTertiary: '#77777B',
    cardBorder: 'rgba(243,242,238,0.08)',
    reminderCardBg: '#2A2013',
    reminderText: '#E3A855',
    reminderIcon: '#D99A3D',
    pillPrimaryBg: '#F3F2EE',
    pillPrimaryText: '#17171A',
    dotEmptyBorder: '#45454A',
    contactLink: '#8FC2E0',
  },
  light: {
    bg: '#F3F2EE',
    card: '#FFFFFF',
    modal: '#FFFFFF',
    inputBg: '#F3F2EE',
    textPrimary: '#17171A',
    textSecondary: '#65656A',
    textTertiary: '#9A9A9D',
    cardBorder: 'rgba(23,23,26,0.08)',
    reminderCardBg: '#EFE3D2',
    reminderText: '#6B4A1E',
    reminderIcon: '#B5790C',
    pillPrimaryBg: '#17171A',
    pillPrimaryText: '#FFFFFF',
    dotEmptyBorder: '#CBCAC5',
    contactLink: '#2F6F8F',
  },
};

export const CATEGORY_ACCENTS: Record<Category, Record<ThemeMode, string>> = {
  Work: { dark: '#5B9BC2', light: '#2F6F8F' },
  School: { dark: '#8B95D6', light: '#5A67A8' },
  Family: { dark: '#D48CA0', light: '#A4697E' },
  Friends: { dark: '#63B39F', light: '#3F8A7A' },
  Acquaintances: { dark: '#9A9A9E', light: '#8C8C90' },
};

// Registered family names from @expo-google-fonts/lora, loaded via useFonts in the root layout.
export const LORA = {
  regular: 'Lora_400Regular',
  medium: 'Lora_500Medium',
  semiBold: 'Lora_600SemiBold',
  bold: 'Lora_700Bold',
} as const;

export const TYPOGRAPHY = {
  screenTitle: { fontFamily: LORA.bold, fontSize: 26, letterSpacing: -0.3 },
  personNameList: { fontFamily: LORA.semiBold, fontSize: 14.5 },
  personNameDetail: { fontFamily: LORA.semiBold, fontSize: 18 },
  body: { fontFamily: LORA.regular, fontSize: 14, lineHeight: 21.7 },
  label: { fontFamily: LORA.semiBold, fontSize: 11, letterSpacing: 0.44, textTransform: 'uppercase' as const },
  categoryLabel: { fontFamily: LORA.medium, fontSize: 11.5 },
};

export const LAYOUT = {
  cardRadius: 22,
  cardGap: 12,
  listRowRadius: 18,
  listRowGap: 10,
  categorySwatchSize: 8,
  categorySwatchRadius: 3,
  avatarListSize: 36,
  avatarListRadius: 12,
  avatarDetailSize: 44,
  avatarDetailRadius: 14,
  closenessDotSize: 6,
  closenessDotGap: 5,
  pillRadius: 999,
};
