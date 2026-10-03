import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/date';
import { slotState } from '@/lib/slots';
import type { LimitUnit, Slot, SlotStart } from '@/types/domain';

type SlotGridProps = {
  slots: Slot[];
  maxPerSlot: number;
  limitUnit: LimitUnit;
  selected: SlotStart | null;
  /** Slots starting before this are shown but can't be picked. */
  now: SlotStart;
  onSelect(start: SlotStart): void;
};

const GAP = Spacing.two;

export function SlotGrid({ slots, maxPerSlot, limitUnit, selected, now, onSelect }: SlotGridProps) {
  const [width, setWidth] = useState(0);
  const columns = limitUnit === 'day' ? 1 : width >= 520 ? 4 : 3;
  const itemWidth = width ? (width - GAP * (columns - 1)) / columns : 0;

  return (
    <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {itemWidth > 0 &&
        slots.map((slot) => (
          <SlotBlock
            key={slot.start}
            slot={slot}
            label={limitUnit === 'day' ? 'All day' : formatTime(slot.start.slice(11, 16))}
            max={maxPerSlot}
            width={itemWidth}
            selected={slot.start === selected}
            past={slot.start < now}
            onPress={() => onSelect(slot.start)}
          />
        ))}
    </View>
  );
}

type SlotBlockProps = {
  slot: Slot;
  label: string;
  max: number;
  width: number;
  selected: boolean;
  past: boolean;
  onPress(): void;
};

function SlotBlock({ slot, label, max, width, selected, past, onPress }: SlotBlockProps) {
  const theme = useTheme();
  const state = slotState(slot.count, max);
  const palette = {
    ok: [theme.slot, theme.slotBorder],
    full: [theme.slotFull, theme.slotFullBorder],
    over: [theme.slotOver, theme.slotOverBorder],
  }[state];
  const stateLabel = state === 'ok' ? '' : state === 'full' ? ', full' : ', over capacity';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${slot.count} visitors${stateLabel}`}
      accessibilityState={{ selected, disabled: past }}
      disabled={past}
      onPress={onPress}
      style={({ pressed }) => [
        styles.block,
        {
          width,
          backgroundColor: palette[0],
          borderColor: selected ? theme.primary : palette[1],
          borderWidth: selected ? 3 : 1.5,
        },
        (pressed || past) && styles.dimmed,
      ]}>
      <ThemedText type="smallBold" style={{ color: theme.cardText }}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.count, { color: theme.cardText }]}>{slot.count}</ThemedText>
      <ThemedText type="small" style={{ color: theme.cardTextSecondary }}>
        visitors
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  block: {
    borderRadius: Spacing.three,
    padding: Spacing.two,
    minHeight: 104,
  },
  count: {
    fontSize: 30,
    lineHeight: 40,
    fontWeight: 800,
  },
  dimmed: {
    opacity: 0.5,
  },
});
