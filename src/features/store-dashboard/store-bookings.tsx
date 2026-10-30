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
import { useT } from '@/i18n/language-provider';
import type { Translate } from '@/i18n/translate';

type TabKey = 'open' | 'accepted' | 'rejected' | 'all';

const tabs = (t: Translate): Tab<TabKey>[] => [
  { key: 'open', label: t('store.tabOpen') },
  { key: 'accepted', label: t('store.tabAccepted') },
  { key: 'rejected', label: t('store.tabRejected') },
  { key: 'all', label: t('store.tabAll') },
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
  /** The searched days, or null while the list shows today. */
  searchedDays: string | null;
  isDarkStore?: boolean;
  catalogType?: CatalogType;
};

/** Bookings for the shown days, split by status, with accept/reject; tap a row for details. */
export function StoreBookings({ storeId, dates, searchedDays, isDarkStore, catalogType }: StoreBookingsProps) {
  const { t } = useT();
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
            label={t('booking.accept')}
            variant="success"
            size="sm"
            loading={busy && setStatus.variables?.status === 'accepted'}
            disabled={busy}
            onPress={() => setStatus.mutate({ bookingId: booking.id, status: 'accepted' })}
          />
        ) : null}
        {booking.status !== 'rejected' ? (
          <Button
            label={t('booking.reject')}
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
          {searchedDays ? t('store.bookingsFor', { days: searchedDays }) : t('store.todaysBookings')}
        </ThemedText>
        <Button
          label={`↻ ${t('common.refresh')}`}
          variant="secondary"
          size="sm"
          accessibilityLabel={t('events.refresh')}
          loading={bookings.isFetching && !bookings.isLoading}
          onPress={() => bookings.refetch()}
        />
      </View>
      <SegmentedTabs tabs={tabs(t)} value={tab} onChange={setTab} />
      <Banner
        message={setStatus.isError ? { type: 'error', text: errorMessage(setStatus.error) } : null}
      />
      {bookings.isLoading ? (
        <ActivityIndicator style={styles.empty} />
      ) : bookings.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(bookings.error) }} />
      ) : visible.length === 0 ? (
        <Empty text={searchedDays ? t('store.noneSelected') : t('store.noneToday')} />
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
