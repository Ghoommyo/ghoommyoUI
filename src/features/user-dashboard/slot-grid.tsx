import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/date';
import { countLabel } from '@/lib/order-types';
import { slotState } from '@/lib/slots';
import type { LimitUnit, Slot, SlotStart } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

type SlotGridProps = {
  slots: Slot[];
  maxPerSlot: number;
  limitUnit: LimitUnit;
  /** Dark stores count orders instead of visitors. */
  isDarkStore?: boolean;
  /** The store stops bookings in full slots: shows the "can't be booked" legend. */
  blockWhenFull?: boolean;
  selected: SlotStart | null;
  /** Slots starting before this are shown but can't be picked. */
  now: SlotStart;
  onSelect(start: SlotStart): void;
};

const GAP = Spacing.two;

export function SlotGrid({
  slots,
  maxPerSlot,
  limitUnit,
  isDarkStore,
  blockWhenFull,
  selected,
  now,
  onSelect,
}: SlotGridProps) {
  const { t, language } = useT();
  const [width, setWidth] = useState(0);
  const allDay = limitUnit === 'day';
  const columns = allDay ? 1 : width >= 520 ? 4 : 3;
  // An all-day slot stays bookable for the rest of its day (as on the website).
  const isPast = (start: SlotStart) => (allDay ? start.slice(0, 10) < now.slice(0, 10) : start < now);
  const theme = useTheme();
  const itemWidth = width ? (width - GAP * (columns - 1)) / columns : 0;

  return (
    <View>
      <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {itemWidth > 0 &&
          slots.map((slot) => (
            <SlotBlock
              key={slot.start}
              slot={slot}
              label={limitUnit === 'day' ? t('schedule.allDay') : formatTime(slot.start.slice(11, 16), language)}
              max={maxPerSlot}
              isDarkStore={isDarkStore}
              width={itemWidth}
              selected={slot.start === selected}
              past={isPast(slot.start)}
              onPress={() => onSelect(slot.start)}
            />
          ))}
      </View>
      {!allDay && slots.length > 0 && slots.every((slot) => isPast(slot.start)) ? (
        <ThemedText type="smallBold" style={[styles.noTimes, { color: theme.cardTextSecondary }]}>
          {t('schedule.noTimesLeft')}
        </ThemedText>
      ) : null}
      <Legend blocked={Boolean(blockWhenFull) || slots.some((slot) => slot.blocked)} />
    </View>
  );
}

function Legend({ blocked }: { blocked: boolean }) {
  const { t } = useT();
  const theme = useTheme();
  const items: { label: string; fill: string; border: string; dashed?: boolean }[] = [
    { label: t('schedule.legendOpen'), fill: theme.slot, border: theme.slotBorder },
    { label: t('schedule.legendFull'), fill: theme.slotFull, border: theme.slotFullBorder },
    ...(blocked
      ? [{ label: t('schedule.legendBlocked'), fill: blockedFill(theme.cardText), border: theme.cardTextSecondary, dashed: true }]
      : []),
  ];
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View
            style={[
              styles.swatch,
              { backgroundColor: item.fill, borderColor: item.border, borderStyle: item.dashed ? 'dashed' : 'solid' },
            ]}
          />
          <ThemedText type="small" style={{ color: theme.cardTextSecondary }}>
            {item.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

/** Full slots the store doesn't take bookings for: a faint tint of the card's text colour. */
const blockedFill = (cardText: string) => `${cardText}14`;

type SlotBlockProps = {
  slot: Slot;
  label: string;
  max: number;
  isDarkStore?: boolean;
  width: number;
  selected: boolean;
  past: boolean;
  onPress(): void;
};

function SlotBlock({
  slot,
  label,
  max,
  isDarkStore,
  width,
  selected,
  past,
  onPress,
}: SlotBlockProps) {
  const { t } = useT();
  const theme = useTheme();
  const state = slotState(slot.count, max);
  const palette = {
    ok: [theme.slot, theme.slotBorder],
    full: [theme.slotFull, theme.slotFullBorder],
    over: [theme.slotOver, theme.slotOverBorder],
  }[state];
  const full = state !== 'ok';
  const left = slot.left ?? Math.max(0, max - slot.count);
  const blocked = Boolean(slot.blocked);
  const stateLabel = full
    ? `, ${t(state === 'full' ? 'schedule.full' : 'app.overCapacity')}${blocked ? `, ${t('schedule.notAvailable')}` : ''}`
    : `, ${t('schedule.leftLabel', { count: left })}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${countLabel(t, isDarkStore, slot.count)}${stateLabel}`}
      accessibilityState={{ selected, disabled: past || blocked }}
      disabled={past || blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.block,
        {
          width,
          backgroundColor: blocked ? blockedFill(theme.cardText) : palette[0],
          borderColor: selected ? theme.primary : blocked ? theme.cardTextSecondary : palette[1],
          borderStyle: blocked ? 'dashed' : 'solid',
          borderWidth: selected ? 3 : 1.5,
        },
        (pressed || past || blocked) && styles.dimmed,
      ]}>
      <ThemedText type="smallBold" style={{ color: theme.cardText }}>
        {label}
      </ThemedText>
      {full ? (
        <ThemedText style={[styles.fullText, { color: theme.cardText }]}>{t('schedule.fullBig')}</ThemedText>
      ) : (
        <ThemedText style={[styles.count, { color: theme.cardText }]}>{left}</ThemedText>
      )}
      <ThemedText type="small" style={{ color: theme.cardTextSecondary }}>
        {full
          ? t(blocked ? 'schedule.fullBlocked' : 'schedule.fullOpen')
          : t(isDarkStore ? 'schedule.ordersLeft' : 'schedule.placesLeft')}
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
  fullText: {
    fontSize: 22,
    lineHeight: 40,
    fontWeight: 800,
  },
  dimmed: {
    opacity: 0.5,
  },
  noTimes: {
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
    rowGap: Spacing.one,
    marginTop: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
});
