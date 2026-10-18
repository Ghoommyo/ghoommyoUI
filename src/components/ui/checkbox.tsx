import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
};

/** A box and its label; the whole row toggles (44px tall). */
export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  const theme = useTheme();
  return (
    <Pressable
      role="checkbox"
      aria-checked={checked}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View
        style={[
          styles.box,
          { borderColor: checked ? theme.primary : theme.border },
          checked && { backgroundColor: theme.primary },
        ]}>
        {checked ? (
          <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
            ✓
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type="default">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    alignSelf: 'flex-start',
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
