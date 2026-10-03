import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MONTHS, parseDateKey, WEEKDAYS } from '@/lib/date';
import { monthGrid, slotState } from '@/lib/slots';
import type { DateKey } from '@/types/domain';

type MonthCalendarProps = {
  year: number;
  month: number;
  today: DateKey;
  /** Visitors per day for the shown month. */
  counts: Map<DateKey, number>;
  capacity: number;
  selected: Set<DateKey>;
  onToggle(date: DateKey): void;
  onPrev(): void;
  onNext(): void;
};

export function MonthCalendar({
  year,
  month,
  today,
  counts,
  capacity,
  selected,
  onToggle,
  onPrev,
  onNext,
}: MonthCalendarProps) {
  const cells = monthGrid(year, month);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.monthLabel}>
          {MONTHS[month]}, {year}
        </ThemedText>
        <View style={styles.arrows}>
          <ArrowButton label="Previous month" glyph="‹" onPress={onPrev} />
          <ArrowButton label="Next month" glyph="›" onPress={onNext} />
        </View>
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((d) => (
          <ThemedText key={d} type="smallBold" themeColor="textSecondary" style={styles.weekday}>
            {d}
          </ThemedText>
        ))}
      </View>

      {weeks.map((week, i) => (
        <View key={i} style={styles.week}>
          {week.map((date, j) =>
            date ? (
              <DayCell
                key={date}
                date={date}
                count={counts.get(date)}
                capacity={capacity}
                isToday={date === today}
                isSelected={selected.has(date)}
                onPress={() => onToggle(date)}
              />
            ) : (
              <View key={`blank-${j}`} style={styles.cell} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

function ArrowButton({ label, glyph, onPress }: { label: string; glyph: string; onPress(): void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.arrow,
        { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={[styles.arrowGlyph, { color: theme.accent }]}>{glyph}</ThemedText>
    </Pressable>
  );
}

type DayCellProps = {
  date: DateKey;
  count: number | undefined;
  capacity: number;
  isToday: boolean;
  isSelected: boolean;
  onPress(): void;
};

function DayCell({ date, count, capacity, isToday, isSelected, onPress }: DayCellProps) {
  const theme = useTheme();
  const { day } = parseDateKey(date);
  const state = count ? slotState(count, capacity) : 'ok';
  const pillColor = { ok: theme.success, full: theme.warning, over: theme.danger }[state];
  const stateLabel = state === 'ok' ? '' : state === 'full' ? ', full' : ', over capacity';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${date}, ${count ?? 0} visitors${stateLabel}${isToday ? ', today' : ''}`}
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        styles.day,
        isToday && {
          backgroundColor: theme.backgroundElement,
          boxShadow: `0 0 12px 2px ${theme.accent}`,
        },
        isSelected && { borderColor: theme.primary, backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={styles.dayNumber}>{day}</ThemedText>
      <View style={[styles.pill, { backgroundColor: pillColor }]}>
        <ThemedText style={[styles.pillText, { color: theme.onPrimary }]}>
          {count ? count : 'NA'}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: 700,
  },
  arrows: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowGlyph: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: 700,
  },
  week: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    letterSpacing: 1,
  },
  cell: {
    flex: 1,
    margin: 2,
  },
  day: {
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayNumber: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: 800,
  },
  pill: {
    alignSelf: 'stretch',
    marginHorizontal: 2,
    borderRadius: 6,
    alignItems: 'center',
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 800,
  },
  pressed: {
    opacity: 0.7,
  },
});
