/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

const shared = {
  primary: '#3B6FF5',
  onPrimary: '#FFFFFF',
  success: '#5CB85C',
  danger: '#E5533D',
  warning: '#F5A623',
  accent: '#E8891A',
  purple: '#5B3FE0',
  eventCard: '#4A9FF5',
  card: '#FFFFFF',
  cardText: '#15181E',
  cardTextSecondary: '#5F6470',
  slot: '#F1FAF2',
  slotBorder: '#D5ECD8',
  slotFull: '#FFF1D2',
  slotFullBorder: '#F5C76A',
  slotOver: '#FDE1DD',
  slotOverBorder: '#EE9184',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

// Dark palette follows the reference screenshots in plans/references/.
export const Colors = {
  light: {
    ...shared,
    text: '#111318',
    background: '#F4F5F7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E4E7EC',
    textSecondary: '#5F6470',
    border: '#D9DCE1',
  },
  dark: {
    ...shared,
    text: '#FFFFFF',
    background: '#1F232B',
    backgroundElement: '#2A2F38',
    backgroundSelected: '#363C47',
    textSecondary: '#A9AEB8',
    border: '#3A404B',
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
