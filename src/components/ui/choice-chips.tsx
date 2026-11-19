import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChoiceChipsProps<T extends string> = {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange(value: T): void;
};

/** A few choices side by side as one radio group (the order type on the booking form). */
export function ChoiceChips<T extends string>({ label, options, value, onChange }: ChoiceChipsProps<T>) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: checked ? theme.primary : theme.backgroundElement,
                  borderColor: checked ? theme.primary : theme.border,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type={checked ? 'smallBold' : 'small'}
                style={{ color: checked ? theme.onPrimary : theme.text }}
                numberOfLines={1}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
