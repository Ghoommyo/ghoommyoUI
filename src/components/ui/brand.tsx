import { Image } from 'expo-image';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';

/** The app icon and the bold wide wordmark, as in the logo sheet. */
export function Brand({ size = 40 }: { size?: number }) {
  const icon = Math.round(size * 1.2);
  return (
    <View style={[styles.row, { gap: Math.round(size * 0.3) }]}>
      <Image
        source={require('@/assets/images/logo-icon.png')}
        style={{ width: icon, height: icon }}
        accessible={false}
      />
      <ThemedText
        accessibilityRole="header"
        style={[styles.wordmark, { fontSize: size, lineHeight: size * 1.15 }]}>
        GHOOMYO
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    // The system font in every language (on Android, Hindi and Marathi text otherwise switches to Noto Sans Devanagari).
    fontFamily: Platform.OS === 'android' ? Fonts.sans : undefined,
    fontWeight: 900,
    letterSpacing: 4,
  },
});
