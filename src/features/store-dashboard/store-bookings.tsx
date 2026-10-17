import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { EventCard, StatusChip } from '@/components/event-card';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SegmentedTabs, type Tab } from '@/components/ui/segmented-tabs';
import { BookingDetailsModal } from '@/features/bookings/booking-details-modal';
import { Spacing } from '@/constants/theme';
import { useSetBookingStatus, useStoreBookings } from '@/hooks/queries';
import { showsPeople } from '@/lib/order-types';
import type { Booking, BookingStatus, CatalogType, DateKey } from '@/types/domain';

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

type StoreBookingsProps = {
  storeId: string;
  /** Today until the store searches, then the searched days. */
  dates: DateKey[];
  /** What the list covers, e.g. "Today's bookings". */
  caption: string;
  isDarkStore?: boolean;
  catalogType?: CatalogType;
};

/** Bookings for the shown days, split by status, with accept/reject; tap a row for details. */
export function StoreBookings({ storeId, dates, caption, isDarkStore, catalogType }: StoreBookingsProps) {
  const [tab, setTab] = useState<TabKey>('open');
  const [open, setOpen] = useState<Booking | null>(null);
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
      <View style={styles.header}>
        <ThemedText type="default" style={styles.caption}>
          {caption}
        </ThemedText>
        <Button
          label="↻ Refresh"
          variant="secondary"
          size="sm"
          accessibilityLabel="Refresh bookings"
          loading={bookings.isFetching && !bookings.isLoading}
          onPress={() => bookings.refetch()}
        />
      </View>
      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
      <Banner
        message={setStatus.isError ? { type: 'error', text: errorMessage(setStatus.error) } : null}
      />
      {bookings.isLoading ? (
        <ActivityIndicator style={styles.empty} />
      ) : bookings.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(bookings.error) }} />
      ) : visible.length === 0 ? (
        <Empty text={caption === "Today's bookings" ? 'No bookings here for today.' : 'No bookings here for the selected days.'} />
      ) : (
        visible.map((b) => (
          <EventCard
            key={b.id}
            booking={b}
            title={b.name}
            subtitle={b.mobile || undefined}
            showPeople={showsPeople(b, isDarkStore)}
            actions={renderActions(b)}
            onPress={() => setOpen(b)}
          />
        ))
      )}
      {open ? (
        <BookingDetailsModal booking={open} viewer="store" isDarkStore={isDarkStore} catalogType={catalogType} onClose={() => setOpen(null)} />
      ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  caption: {
    flex: 1,
    fontWeight: 700,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
