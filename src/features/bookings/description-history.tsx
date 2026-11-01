import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { descriptionParts } from '@/lib/bookings';
import { useT } from '@/i18n/language-provider';

/** A booking's description, with each message added later under an "added later" divider. */
export function DescriptionHistory({ description }: { description: string }) {
  const { t } = useT();
  const theme = useTheme();
  const parts = descriptionParts(description);
  return (
    <View style={[styles.box, { backgroundColor: theme.backgroundSelected }]}>
      {parts.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('common.noDescription')}
        </ThemedText>
      ) : (
        parts.map((part, i) => (
          <View key={i} style={styles.part}>
            {i > 0 ? (
              <View style={styles.divider} accessibilityLabel={t('booking.addedLaterLabel')}>
                <View style={[styles.line, { backgroundColor: theme.border }]} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.dividerText}>
                  {t('booking.addedLater')}
                </ThemedText>
                <View style={[styles.line, { backgroundColor: theme.border }]} />
              </View>
            ) : null}
            <ThemedText>{part}</ThemedText>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  part: {
    gap: Spacing.two,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 12,
  },
});
