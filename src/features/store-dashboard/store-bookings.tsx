import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { EventCard, StatusChip } from '@/components/event-card';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SegmentedTabs, type Tab } from '@/components/ui/segmented-tabs';
import { Spacing } from '@/constants/theme';
import { useSetBookingStatus, useStoreBookings } from '@/hooks/queries';
import type { Booking, BookingStatus, DateKey } from '@/types/domain';

type TabKey = 'open' | 'accepted' | 'rejected' | 'all';

const TABS: Tab<TabKey>[] = [
  { key: 'open', label: 'Open' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const TAB_STATUS: Record<Exclude<TabKey, 'all'>, BookingStatus> = {
  open: 'pending',
  accepted: 'accepted',
  rejected: 'rejected',
};

/** Bookings for the searched days, split by status, with accept/reject. */
export function StoreBookings({ storeId, dates }: { storeId: string; dates: DateKey[] | null }) {
  const [tab, setTab] = useState<TabKey>('open');
  const bookings = useStoreBookings(storeId, dates);
  const setStatus = useSetBookingStatus();

  const visible = (bookings.data ?? []).filter(
    (b) => tab === 'all' || b.status === TAB_STATUS[tab],
  );

  const renderActions = (booking: Booking) => {
    const busy = setStatus.isPending && setStatus.variables?.bookingId === booking.id;
    return (
      <>
        {tab === 'all' ? <StatusChip status={booking.status} /> : null}
        {booking.status !== 'accepted' ? (
          <Button
            label="✓ Accept"
            variant="success"
            size="sm"
            loading={busy && setStatus.variables?.status === 'accepted'}
            disabled={busy}
            onPress={() => setStatus.mutate({ bookingId: booking.id, status: 'accepted' })}
          />
        ) : null}
        {booking.status !== 'rejected' ? (
          <Button
            label="✕ Reject"
            variant="danger"
            size="sm"
            loading={busy && setStatus.variables?.status === 'rejected'}
            disabled={busy}
            onPress={() => setStatus.mutate({ bookingId: booking.id, status: 'rejected' })}
          />
        ) : null}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
      <Banner
        message={setStatus.isError ? { type: 'error', text: errorMessage(setStatus.error) } : null}
      />
      {!dates ? (
        <Empty text="Select days on the calendar and tap Search to see bookings." />
      ) : bookings.isLoading ? (
        <ActivityIndicator style={styles.empty} />
      ) : bookings.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(bookings.error) }} />
      ) : visible.length === 0 ? (
        <Empty text="No bookings here for the selected days." />
      ) : (
        visible.map((b) => (
          <EventCard key={b.id} booking={b} title={b.name} actions={renderActions(b)} />
        ))
      )}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
      {text}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
