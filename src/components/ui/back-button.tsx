import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/language-provider';

/** "‹ Back" to the previous screen; renders nothing when there is none (e.g. opened from a link). */
export function BackButton() {
  const { t } = useT();
  const theme = useTheme();
  if (!router.canGoBack()) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      hitSlop={8}
      onPress={() => router.back()}
      style={({ pressed }) => [styles.button, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
      <ThemedText type="smallBold">‹ {t('common.back')}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});
