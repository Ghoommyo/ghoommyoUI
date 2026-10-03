import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

/** The bold wide wordmark from the reference screenshots. */
export function Brand({ size = 40 }: { size?: number }) {
  return (
    <ThemedText
      accessibilityRole="header"
      style={[styles.wordmark, { fontSize: size, lineHeight: size * 1.15 }]}>
      GHOOMYO
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    fontWeight: 900,
    letterSpacing: 4,
  },
});
