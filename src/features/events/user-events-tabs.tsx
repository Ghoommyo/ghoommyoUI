import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { EventCard, StatusChip } from '@/components/event-card';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SegmentedTabs, type Tab } from '@/components/ui/segmented-tabs';
import { Spacing } from '@/constants/theme';
import { BookingDetailsModal } from '@/features/bookings/booking-details-modal';
import { EditBookingModal } from '@/features/bookings/edit-booking-modal';
import { RateBookingModal } from '@/features/bookings/rate-booking-modal';
import { useMyBookings, useStores } from '@/hooks/queries';
import { canEditBooking, canRateBooking } from '@/lib/bookings';
import { todayKey } from '@/lib/date';
import { showsPeople } from '@/lib/order-types';
import { bucketEvents } from '@/lib/slots';
import type { Booking } from '@/types/domain';
import { useT } from '@/i18n/language-provider';
import type { MessageKey } from '@/i18n/messages';
import type { Translate } from '@/i18n/translate';

type TabKey = 'coming' | 'inProgress' | 'completed';

const tabs = (t: Translate): Tab<TabKey>[] => [
  { key: 'coming', label: t('events.coming') },
  { key: 'inProgress', label: t('events.inProgress') },
  { key: 'completed', label: t('events.completed') },
];

const EMPTY: Record<TabKey, MessageKey> = {
  coming: 'events.comingEmpty',
  inProgress: 'events.inProgressEmpty',
  completed: 'events.completedEmpty',
};

/** The signed-in user's bookings: from tomorrow, today, and before today. */
export function UserEventsTabs() {
  const { t } = useT();
  const [tab, setTab] = useState<TabKey>('coming');
  const [today] = useState(todayKey);
  const [open, setOpen] = useState<Booking | null>(null);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [rating, setRating] = useState<Booking | null>(null);
  const [saved, setSaved] = useState<MessageKey | null>(null);
  const bookings = useMyBookings();
  const stores = useStores();
  const buckets = bucketEvents(bookings.data ?? [], today);
  const storeOf = (booking: Booking) => stores.data?.find((s) => s.id === booking.storeId);

  const startEdit = (booking: Booking) => {
    setOpen(null);
    setSaved(null);
    setEditing(booking);
  };

  const startRate = (booking: Booking) => {
    setOpen(null);
    setSaved(null);
    setRating(booking);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="default" style={styles.heading}>
          {t('events.yourBookings')}
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
      <Banner message={saved ? { type: 'success', text: t(saved) } : null} />
      <SegmentedTabs tabs={tabs(t)} value={tab} onChange={setTab} />
      {bookings.isLoading ? (
        <ActivityIndicator style={styles.empty} />
      ) : bookings.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(bookings.error) }} />
      ) : buckets[tab].length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          {t(EMPTY[tab])}
        </ThemedText>
      ) : (
        buckets[tab].map((b) => (
          <EventCard
            key={b.id}
            booking={b}
            title={b.storeName}
            showPeople={showsPeople(b, storeOf(b)?.isDarkStore)}
            onPress={() => setOpen(b)}
            actions={
              <>
                <StatusChip status={b.status} />
                {canEditBooking(b, today) ? (
                  <Button label={t('events.edit')} variant="secondary" size="sm" onPress={() => startEdit(b)} />
                ) : null}
              </>
            }
          />
        ))
      )}
      {open ? (
        <BookingDetailsModal
          booking={open}
          viewer="user"
          isDarkStore={storeOf(open)?.isDarkStore}
          catalogType={storeOf(open)?.catalogType}
          onClose={() => setOpen(null)}
          onEdit={canEditBooking(open, today) ? startEdit : undefined}
          onRate={canRateBooking(open) ? startRate : undefined}
        />
      ) : null}
      {editing ? (
        <EditBookingModal
          booking={editing}
          maxPerBooking={storeOf(editing)?.maxPerBooking ?? 5}
          isDarkStore={storeOf(editing)?.isDarkStore}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setSaved('events.changesSaved');
          }}
        />
      ) : null}
      {rating ? (
        <RateBookingModal
          booking={rating}
          onClose={() => setRating(null)}
          onSaved={() => {
            setRating(null);
            setSaved('events.ratingSaved');
          }}
        />
      ) : null}
    </View>
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
  heading: {
    flex: 1,
    fontWeight: 700,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
