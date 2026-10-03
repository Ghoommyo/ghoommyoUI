import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'success' | 'danger' | 'secondary';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  size?: 'sm' | 'md';
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  label,
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
  }[variant];
  const color = variant === 'secondary' ? theme.text : theme.onPrimary;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
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
        <ThemedText type={size === 'sm' ? 'smallBold' : 'default'} style={{ color }}>
          {label}
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
