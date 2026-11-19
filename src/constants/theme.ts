/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Light mode: white text on primary / success / danger / warning / event card is at least 4.5:1 (WCAG AA).
// Dark mode: lighter colours with dark text (`onPrimary`), so they also read as text on the dark page.
// Same values as the website's app/globals.css.
export const Colors = {
  light: {
    primary: '#2F62E6',
    onPrimary: '#FFFFFF',
    success: '#2E7D32',
    danger: '#C8372D',
    warning: '#B45309',
    accent: '#B45F06',
    purple: '#5B3FE0',
    eventCard: '#1D6FCF',
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
    switchOff: '#8A909B',
    text: '#111318',
    background: '#F4F5F7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E4E7EC',
    textSecondary: '#5F6470',
    border: '#D9DCE1',
  },
  dark: {
    primary: '#8AA9FF',
    onPrimary: '#111318',
    success: '#6FCF75',
    danger: '#FF8A7A',
    warning: '#F5B041',
    accent: '#F0A050',
    purple: '#A594FF',
    eventCard: '#6AAEF5',
    card: '#2A2F38',
    cardText: '#FFFFFF',
    cardTextSecondary: '#A9AEB8',
    slot: '#1D3325',
    slotBorder: '#2F5A3A',
    slotFull: '#3A2F12',
    slotFullBorder: '#8A6A1F',
    slotOver: '#3D1F1C',
    slotOverBorder: '#8F3B32',
    overlay: 'rgba(0, 0, 0, 0.7)',
    switchOff: '#6B7280',
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
