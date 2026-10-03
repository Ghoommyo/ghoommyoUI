import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { useSession } from '@/auth/session';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Select, type SelectOption } from '@/components/ui/select';
import { Spacing } from '@/constants/theme';
import { SlotGrid } from '@/features/user-dashboard/slot-grid';
import { useStores, useStoreSlots } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLong, formatSlotStart, makeDateKey, MONTHS, toDateKey } from '@/lib/date';
import { daysInMonth, LIMIT_UNIT_LABEL } from '@/lib/slots';
import type { SlotStart } from '@/types/domain';

/** The next 12 months, starting with the current one; values are `year-month` (0-based month). */
function monthOptions(today: Date): SelectOption<string>[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, value: `${d.getFullYear()}-${d.getMonth()}` };
  });
}

function nowSlotStart(now: Date): SlotStart {
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return `${toDateKey(now)}T${time}`;
}

export function UserDashboard() {
  const theme = useTheme();
  const { session } = useSession();
  const { booked, status: bookedStatus } = useLocalSearchParams<{
    booked?: string;
    status?: string;
  }>();
  const [today] = useState(() => new Date());

  const [storeId, setStoreId] = useState<string>();
  const [monthKey, setMonthKey] = useState(`${today.getFullYear()}-${today.getMonth()}`);
  const [day, setDay] = useState(today.getDate());
  const [selectedSlot, setSelectedSlot] = useState<SlotStart | null>(null);
  const [message, setMessage] = useState<BannerMessage | null>(null);

  const [year, month] = monthKey.split('-').map(Number);
  const dateKey = makeDateKey(year, month, day);

  const stores = useStores();
  const store = stores.data?.find((s) => s.id === storeId);
  const slots = useStoreSlots(storeId, dateKey);

  // Confirmation passed back from the booking modal.
  const bookedMessage: BannerMessage | null = booked
    ? {
        type: 'success',
        text: `Booking ${bookedStatus === 'accepted' ? 'confirmed' : 'requested'} for ${formatSlotStart(booked)}.${bookedStatus === 'pending' ? ' The store will review it.' : ''}`,
      }
    : null;

  const changeMonth = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    setMonthKey(key);
    setDay((d) => Math.min(d, daysInMonth(y, m)));
    setSelectedSlot(null);
  };

  const reset = () => {
    setStoreId(undefined);
    setMonthKey(`${today.getFullYear()}-${today.getMonth()}`);
    setDay(today.getDate());
    setSelectedSlot(null);
    setMessage(null);
    router.setParams({ booked: undefined, status: undefined });
  };

  const book = () => {
    if (!session) {
      router.push('/login');
      return;
    }
    if (!storeId) {
      setMessage({ type: 'error', text: 'Store is not selected.' });
      return;
    }
    if (!selectedSlot) {
      setMessage({ type: 'error', text: 'Time is not selected.' });
      return;
    }
    setMessage(null);
    router.setParams({ booked: undefined, status: undefined });
    router.push({ pathname: '/booking', params: { storeId, slotStart: selectedSlot } });
  };

  return (
    <Screen>
      <AppHeader />

      <View style={styles.storeRow}>
        <Select
          placeholder={stores.isLoading ? 'Loading stores…' : 'Select a store'}
          value={storeId}
          options={(stores.data ?? []).map((s) => ({ label: s.name, value: s.id }))}
          onChange={(id) => {
            setStoreId(id);
            setSelectedSlot(null);
            setMessage(null);
          }}
          onCard
          style={styles.flex}
        />
        {store ? (
          <ThemedText type="default" themeColor="textSecondary" style={styles.flex}>
            Max Count : {store.maxPerSlot} per {LIMIT_UNIT_LABEL[store.limitUnit]}
          </ThemedText>
        ) : null}
      </View>
      {stores.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(stores.error) }} />
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.cardHeader}>
          <View style={styles.flex}>
            <ThemedText style={[styles.cardTitle, { color: theme.cardText }]}>
              Visitor Schedule
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.cardTextSecondary }}>
              Monitor visitors by day and hour
            </ThemedText>
          </View>
          <View style={[styles.datePill, { backgroundColor: theme.purple }]}>
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              {formatDayLong(dateKey)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Select
            label="Month"
            value={monthKey}
            options={monthOptions(today)}
            onChange={changeMonth}
            onCard
            style={styles.flex}
          />
          <Select
            label="Day"
            value={day}
            options={Array.from({ length: daysInMonth(year, month) }, (_, i) => ({
              label: String(i + 1),
              value: i + 1,
            }))}
            onChange={(d) => {
              setDay(d);
              setSelectedSlot(null);
            }}
            onCard
            style={styles.flex}
          />
        </View>

        {!store ? (
          <ThemedText type="small" style={[styles.empty, { color: theme.cardTextSecondary }]}>
            Select a store to see how many people are visiting and when.
          </ThemedText>
        ) : slots.isLoading ? (
          <ActivityIndicator style={styles.empty} color={theme.primary} />
        ) : slots.isError ? (
          <ThemedText type="small" style={[styles.empty, { color: theme.danger }]}>
            {errorMessage(slots.error)}
          </ThemedText>
        ) : (
          <SlotGrid
            slots={slots.data ?? []}
            maxPerSlot={store.maxPerSlot}
            limitUnit={store.limitUnit}
            selected={selectedSlot}
            now={nowSlotStart(new Date())}
            onSelect={(start) => {
              setSelectedSlot(start);
              setMessage(null);
            }}
          />
        )}
      </View>

      <Banner message={message ?? bookedMessage} />

      <View style={styles.actions}>
        <Button label="Reset" variant="danger" onPress={reset} />
        <Button label={session ? 'Book' : 'Login to book'} variant="success" onPress={book} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  cardTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 800,
  },
  datePill: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  empty: {
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
  },
});
