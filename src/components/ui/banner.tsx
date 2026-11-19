import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/language-provider';

export type BannerMessage = { type: 'success' | 'error'; text: string };

/** Inline success/error message. `onRetry` adds "Try again" to an error (a failed load). */
export function Banner({ message, onRetry }: { message: BannerMessage | null | undefined; onRetry?: () => void }) {
  const theme = useTheme();
  const { t } = useT();
  if (!message) return null;
  const color = message.type === 'success' ? theme.success : theme.danger;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { borderColor: color, backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" style={[styles.text, { color }]}>
        {message.text}
      </ThemedText>
      {message.type === 'error' && onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8} style={styles.retry}>
          <ThemedText type="smallBold" style={[styles.retryText, { color: theme.primary }]}>
            {t('common.retry')}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.three,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  text: {
    flexShrink: 1,
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: {
    textDecorationLine: 'underline',
  },
});
