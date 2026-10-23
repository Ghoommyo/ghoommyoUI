import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WEEK } from '@/lib/slots';

type DayPickerProps = {
  label: string;
  /** Selected weekdays, 0 = Sunday … 6 = Saturday. */
  value: number[];
  onChange(days: number[]): void;
  error?: string;
  hint?: string;
};

/** Seven toggle buttons, Monday to Sunday (44px tall, primary when on). */
export function DayPicker({ label, value, onChange, error, hint }: DayPickerProps) {
  const theme = useTheme();
  const toggle = (day: number) =>
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));

  return (
    <View style={styles.field} role="group" aria-label={label}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.row}>
        {WEEK.map(({ day, short, long }) => {
          const on = value.includes(day);
          return (
            <Pressable
              key={day}
              role="button"
              aria-pressed={on}
              accessibilityLabel={long}
              accessibilityState={{ selected: on }}
              onPress={() => toggle(day)}
              style={({ pressed }) => [
                styles.day,
                {
                  backgroundColor: on ? theme.primary : theme.backgroundElement,
                  borderColor: on ? theme.primary : error ? theme.danger : theme.border,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: on ? theme.onPrimary : theme.textSecondary }}>
                {short}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {error || hint ? (
        <ThemedText type="small" style={{ color: error ? theme.danger : theme.textSecondary }}>
          {error || hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  day: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
