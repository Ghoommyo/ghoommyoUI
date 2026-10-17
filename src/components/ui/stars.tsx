import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RatingSummary } from '@/types/domain';

/** Read-only stars, e.g. ★★★★☆ for 4 (rounded to the nearest whole star). */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const theme = useTheme();
  const filled = Math.round(value);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${Number.isInteger(value) ? value : value.toFixed(1)} out of 5 stars`}
      style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <ThemedText key={n} style={{ fontSize: size, lineHeight: size * 1.25, color: n <= filled ? theme.warning : theme.border }}>
          ★
        </ThemedText>
      ))}
    </View>
  );
}

/** Compact `★ 4.3 (12)`, or "No reviews". */
export function RatingBadge({ rating, color }: { rating: RatingSummary; color?: string }) {
  const theme = useTheme();
  if (!rating.count || rating.average === null) {
    return (
      <ThemedText type="small" style={{ color: color ?? theme.textSecondary }}>
        No reviews
      </ThemedText>
    );
  }
  return (
    <ThemedText
      type="small"
      style={{ color: color ?? theme.textSecondary }}
      accessibilityLabel={`${rating.average.toFixed(1)} out of 5 from ${rating.count} reviews`}>
      <ThemedText type="small" style={{ color: theme.warning }}>
        ★
      </ThemedText>{' '}
      {rating.average.toFixed(1)} ({rating.count})
    </ThemedText>
  );
}

/** Pick 1–5 stars. Each star is a 44pt radio button. */
export function StarInput({ value, onChange, label, error }: { value: number; onChange(stars: number): void; label: string; error?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.input}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
        {[1, 2, 3, 4, 5].map((stars) => (
          <Pressable
            key={stars}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === stars }}
            accessibilityLabel={`${stars} ${stars === 1 ? 'star' : 'stars'}`}
            onPress={() => onChange(stars)}
            style={({ pressed }) => [styles.star, pressed && styles.pressed]}>
            <ThemedText style={{ fontSize: 32, lineHeight: 40, color: stars <= value ? theme.warning : theme.border }}>★</ThemedText>
          </Pressable>
        ))}
      </View>
      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    gap: Spacing.one,
  },
  star: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
