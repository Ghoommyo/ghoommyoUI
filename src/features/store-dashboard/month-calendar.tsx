import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLong, formatMonthYear, parseDateKey, weekdayNames } from '@/lib/date';
import { countLabel } from '@/lib/order-types';
import { monthGrid, slotState } from '@/lib/slots';
import type { DateKey } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

type MonthCalendarProps = {
  year: number;
  month: number;
  today: DateKey;
  /** Visitors per day for the shown month. */
  counts: Map<DateKey, number>;
  capacity: number;
  /** Dark stores count orders instead of visitors. */
  isDarkStore?: boolean;
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
  isDarkStore,
  selected,
  onToggle,
  onPrev,
  onNext,
}: MonthCalendarProps) {
  const { t, language } = useT();
  const cells = monthGrid(year, month);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.monthLabel}>
          {formatMonthYear(year, month, language)}
        </ThemedText>
        <View style={styles.arrows}>
          <ArrowButton label={t('calendar.previous')} glyph="‹" onPress={onPrev} />
          <ArrowButton label={t('calendar.next')} glyph="›" onPress={onNext} />
        </View>
      </View>

      <View style={styles.week}>
        {weekdayNames(language).map((d) => (
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
                isDarkStore={isDarkStore}
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
  isDarkStore?: boolean;
  isToday: boolean;
  isSelected: boolean;
  onPress(): void;
};

function DayCell({
  date,
  count,
  capacity,
  isDarkStore,
  isToday,
  isSelected,
  onPress,
}: DayCellProps) {
  const { t, language } = useT();
  const theme = useTheme();
  const { day } = parseDateKey(date);
  const state = count ? slotState(count, capacity) : 'ok';
  const pillColor = { ok: theme.success, full: theme.warning, over: theme.danger }[state];
  const stateLabel = state === 'ok' ? '' : `, ${t(state === 'full' ? 'schedule.full' : 'app.overCapacity')}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(isToday ? 'calendar.dayLabelToday' : 'calendar.dayLabel', {
        day: formatDayLong(date, language),
        count: countLabel(t, isDarkStore, count ?? 0),
      })}${stateLabel}`}
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
