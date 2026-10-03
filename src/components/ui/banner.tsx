import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BannerMessage = { type: 'success' | 'error'; text: string };

/** Inline success/error message shown after form submissions. */
export function Banner({ message }: { message: BannerMessage | null | undefined }) {
  const theme = useTheme();
  if (!message) return null;
  const color = message.type === 'success' ? theme.success : theme.danger;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { borderColor: color, backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" style={{ color }}>
        {message.text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
