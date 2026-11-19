import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { useSession } from '@/auth/session';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { MonthCalendar } from '@/features/store-dashboard/month-calendar';
import { StoreBookings } from '@/features/store-dashboard/store-bookings';
import { useStore, useStoreMonthSummary } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLong, todayKey } from '@/lib/date';
import { dayCapacity } from '@/lib/slots';
import type { DateKey } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

export function StoreDashboard() {
  const { t, language } = useT();
  const theme = useTheme();
  const { session } = useSession();
  const storeId = session?.accountId;
  const [today] = useState(() => new Date());
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState<Set<DateKey>>(new Set());
  // Tapping days shows their bookings straight away; with none picked the list shows today.
  const [todayDates] = useState(() => [todayKey()]);
  const picked = [...selected].sort();

  const store = useStore(storeId);
  // Pull down: the store, its calendar and bookings, and the bell.
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = () => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['stores', storeId] }),
      queryClient.invalidateQueries({ queryKey: ['me'] }),
    ]).finally(() => setRefreshing(false));
  };
  const summary = useStoreMonthSummary(storeId, view.year, view.month);
  const counts = new Map((summary.data ?? []).map((d) => [d.date, d.count]));

  const shiftMonth = (delta: number) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const toggleDay = (date: DateKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  if (!storeId || store.isLoading) {
    return (
      <Screen ads>
        <AppHeader />
        <ActivityIndicator color={theme.primary} />
      </Screen>
    );
  }

  return (
    <Screen ads onRefresh={refresh} refreshing={refreshing}>
      <AppHeader />
      {store.data?.inactive ? <Banner message={{ type: 'error', text: t('hint.inactiveStore') }} /> : null}
      {store.data ? (
        <View style={styles.subheader}>
          <ThemedText type="default" style={styles.storeName}>
            {store.data.name}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            {t(store.data.isDarkStore ? 'store.maxOrdersPerDay' : 'store.maxPerDay', { count: dayCapacity(store.data) })}
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
        openDays={store.data?.openDays}
        isDarkStore={store.data?.isDarkStore}
        selected={selected}
        onToggle={toggleDay}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
      />

      <View style={styles.searchRow}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
          {selected.size === 0 ? t('store.tapDays') : t('store.daysSelected', { count: selected.size })}
        </ThemedText>
        {selected.size > 0 ? (
          <Button label={t('store.showToday')} variant="secondary" onPress={() => setSelected(new Set())} />
        ) : null}
      </View>

      <StoreBookings
        storeId={storeId}
        dates={picked.length ? picked : todayDates}
        searchedDays={picked.length ? picked.map((date) => formatDayLong(date, language)).join(', ') : null}
        isDarkStore={store.data?.isDarkStore}
        catalogType={store.data?.catalogType}
      />
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
