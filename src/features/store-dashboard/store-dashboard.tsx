import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { useSession } from '@/auth/session';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { MonthCalendar } from '@/features/store-dashboard/month-calendar';
import { StoreBookings } from '@/features/store-dashboard/store-bookings';
import { useStore, useStoreMonthSummary } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { todayKey } from '@/lib/date';
import { dayCapacity } from '@/lib/slots';
import type { DateKey } from '@/types/domain';

export function StoreDashboard() {
  const theme = useTheme();
  const { session } = useSession();
  const storeId = session?.accountId;
  const [today] = useState(() => new Date());
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState<Set<DateKey>>(new Set());
  const [searchDates, setSearchDates] = useState<DateKey[] | null>(null);
  const [message, setMessage] = useState<BannerMessage | null>(null);

  const store = useStore(storeId);
  const summary = useStoreMonthSummary(storeId, view.year, view.month);
  const counts = new Map((summary.data ?? []).map((d) => [d.date, d.count]));

  const shiftMonth = (delta: number) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const toggleDay = (date: DateKey) => {
    setMessage(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const search = () => {
    if (selected.size === 0) {
      setMessage({ type: 'error', text: 'Select one or more days first.' });
      return;
    }
    setSearchDates([...selected].sort());
  };

  if (!storeId || store.isLoading) {
    return (
      <Screen>
        <AppHeader />
        <ActivityIndicator color={theme.primary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader />
      {store.data ? (
        <View style={styles.subheader}>
          <ThemedText type="default" style={styles.storeName}>
            {store.data.name}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Max Count : {dayCapacity(store.data)} per day
          </ThemedText>
        </View>
      ) : (
        <Banner message={{ type: 'error', text: errorMessage(store.error) }} />
      )}

      <MonthCalendar
        year={view.year}
        month={view.month}
        today={todayKey()}
        counts={counts}
        capacity={store.data ? dayCapacity(store.data) : Infinity}
        selected={selected}
        onToggle={toggleDay}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
      />

      <Banner message={message} />
      <View style={styles.searchRow}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
          {selected.size === 0
            ? 'Tap days to select them.'
            : `${selected.size} day${selected.size === 1 ? '' : 's'} selected`}
        </ThemedText>
        {selected.size > 0 ? (
          <Button
            label="Clear"
            variant="secondary"
            onPress={() => {
              setSelected(new Set());
              setSearchDates(null);
            }}
          />
        ) : null}
        <Button label="Search" variant="success" onPress={search} />
      </View>

      <StoreBookings storeId={storeId} dates={searchDates} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  subheader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: Spacing.four,
  },
  storeName: {
    fontSize: 20,
    fontWeight: 700,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
