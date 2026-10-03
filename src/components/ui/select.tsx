import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const OPTION_HEIGHT = 52;

export interface SelectOption<T extends string | number> {
  label: string;
  value: T;
}

type SelectProps<T extends string | number> = {
  label?: string;
  placeholder?: string;
  value: NoInfer<T> | undefined;
  options: SelectOption<T>[];
  onChange(value: NoInfer<T>): void;
  error?: string;
  /** Light field for use on white cards, as in the dashboard reference. */
  onCard?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Cross-platform dropdown: a field that opens a modal list (native pickers have no web support). */
export function Select<T extends string | number>({
  label,
  placeholder = 'Select…',
  value,
  options,
  onChange,
  error,
  onCard = false,
  disabled = false,
  style,
}: SelectProps<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const fieldText = onCard ? theme.cardText : theme.text;

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <ThemedText type="smallBold" style={onCard && { color: theme.cardText }}>
          {label}
        </ThemedText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityHint="Opens a list of options"
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            backgroundColor: onCard ? theme.card : theme.backgroundElement,
            borderColor: error ? theme.danger : onCard ? '#C9CDD4' : theme.border,
          },
          disabled && styles.disabled,
        ]}>
        <ThemedText
          numberOfLines={1}
          style={[styles.fieldText, { color: selected ? fieldText : theme.textSecondary }]}>
          {selected?.label ?? placeholder}
        </ThemedText>
        <ThemedText aria-hidden style={{ color: fieldText }}>
          ▾
        </ThemedText>
      </Pressable>
      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.overlay }]}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close list">
          <View style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
            {label ? (
              <ThemedText type="smallBold" style={styles.sheetTitle}>
                {label}
              </ThemedText>
            ) : null}
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.value)}
              // Open long lists (times, days) with the current value in view.
              initialScrollIndex={Math.max(0, options.findIndex((o) => o.value === value) - 2)}
              getItemLayout={(_, index) => ({
                length: OPTION_HEIGHT,
                offset: OPTION_HEIGHT * index,
                index,
              })}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      (isSelected || pressed) && { backgroundColor: theme.backgroundSelected },
                    ]}>
                    <ThemedText type={isSelected ? 'smallBold' : 'small'}>{item.label}</ThemedText>
                    {isSelected ? (
                      <ThemedText aria-hidden style={{ color: theme.primary }}>
                        ✓
                      </ThemedText>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 44,
  },
  fieldText: {
    flexShrink: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    maxHeight: '70%',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    overflow: 'hidden',
  },
  sheetTitle: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  option: {
    height: OPTION_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
});
