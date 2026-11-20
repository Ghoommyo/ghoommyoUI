import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'success' | 'danger' | 'secondary' | 'text';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /** A mark shown before the label (✓, ✕, ↻); screen readers read only the label. */
  icon?: string;
  variant?: Variant;
  size?: 'sm' | 'md';
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  label,
  icon,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const background = {
    primary: theme.primary,
    success: theme.success,
    danger: theme.danger,
    secondary: theme.backgroundSelected,
    // A quiet action next to the main one (Reset): no fill, still 44 tall.
    text: 'transparent',
  }[variant];
  const color = variant === 'secondary' ? theme.text : variant === 'text' ? theme.primary : theme.onPrimary;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      // Small buttons look 32 tall; the touch area reaches 44.
      hitSlop={size === 'sm' ? { top: 6, bottom: 6 } : undefined}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        fullWidth && styles.fullWidth,
        { backgroundColor: background },
        (pressed || isDisabled) && styles.dimmed,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        // One line: Android sometimes lays out a Hindi/Marathi label narrower than it measured it, and
        // the wrapped last word was hidden.
        <ThemedText type={size === 'sm' ? 'smallBold' : 'default'} style={{ color }} numberOfLines={1}>
          {icon ? `${icon} ${label}` : label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    minHeight: 32,
  },
  md: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    minHeight: 44,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  dimmed: {
    opacity: 0.6,
  },
});
