import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/language-provider';
import { firstDay, monthDays } from '@/lib/slots';

type DayStripProps = {
  today: Date;
  /** The store's open weekdays; every day is open before a store is chosen. */
  openDays: number[] | undefined;
  year: number;
  month: number;
  day: number;
  onChange(day: number): void;
};

const CHIP_WIDTH = 56;
const GAP = Spacing.two;

/** The days of the month from today, side by side; closed days can't be picked. */
export function DayStrip({ today, openDays, year, month, day, onChange }: DayStripProps) {
  const { t } = useT();
  const theme = useTheme();
  const days = monthDays(openDays, year, month, firstDay(today, year, month), t);
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const index = days.findIndex((d) => d.day === day);

  // Keep the chosen day in view (a new month, or the store's next open day).
  useEffect(() => {
    if (!width || index < 0) return;
    const x = index * (CHIP_WIDTH + GAP) - (width - CHIP_WIDTH) / 2;
    scroll.current?.scrollTo({ x: Math.max(0, x), animated: true });
  }, [index, width, year, month]);

  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold" style={{ color: theme.cardText }}>
        {t('schedule.day')}
      </ThemedText>
      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        contentContainerStyle={styles.row}>
        {days.map((d) => {
          const selected = d.day === day;
          const color = selected ? theme.onPrimary : theme.cardText;
          return (
            <Pressable
              key={d.day}
              accessibilityRole="button"
              accessibilityLabel={`${d.weekday} ${d.day}${d.open ? '' : `, ${t('schedule.closed')}`}`}
              accessibilityState={{ selected, disabled: !d.open }}
              disabled={!d.open}
              onPress={() => onChange(d.day)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.primary : theme.card,
                  borderColor: selected ? theme.primary : theme.border,
                },
                !d.open && styles.closed,
              ]}>
              <ThemedText type="smallBold" style={{ color }}>
                {d.weekday}
              </ThemedText>
              <ThemedText style={[styles.date, { color }]}>{d.day}</ThemedText>
              {!d.open ? (
                <ThemedText style={[styles.closedText, { color }]}>{t('schedule.closed')}</ThemedText>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
  },
  row: {
    gap: GAP,
    paddingVertical: 2,
  },
  chip: {
    width: CHIP_WIDTH,
    minHeight: 64,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 800,
  },
  closed: {
    opacity: 0.5,
  },
  closedText: {
    fontSize: 10,
    lineHeight: 12,
  },
});
