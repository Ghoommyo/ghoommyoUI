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
import { bucketEvents } from '@/lib/slots';
import type { Booking } from '@/types/domain';

type TabKey = 'coming' | 'inProgress' | 'completed';

const TABS: Tab<TabKey>[] = [
  { key: 'coming', label: 'Coming Events' },
  { key: 'inProgress', label: 'In-Progress Events' },
  { key: 'completed', label: 'Completed Events' },
];

const EMPTY: Record<TabKey, string> = {
  coming: 'No upcoming events. Book a visit from the dashboard.',
  inProgress: 'Nothing scheduled for today.',
  completed: 'No past events yet.',
};

/** The signed-in user's bookings: from tomorrow, today, and before today. */
export function UserEventsTabs() {
  const [tab, setTab] = useState<TabKey>('coming');
  const [today] = useState(todayKey);
  const [open, setOpen] = useState<Booking | null>(null);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [rating, setRating] = useState<Booking | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
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
          Your bookings
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
      <Banner message={saved ? { type: 'success', text: saved } : null} />
      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
      {bookings.isLoading ? (
        <ActivityIndicator style={styles.empty} />
      ) : bookings.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(bookings.error) }} />
      ) : buckets[tab].length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          {EMPTY[tab]}
        </ThemedText>
      ) : (
        buckets[tab].map((b) => (
          <EventCard
            key={b.id}
            booking={b}
            title={b.storeName}
            showPeople={!storeOf(b)?.isDarkStore}
            onPress={() => setOpen(b)}
            actions={
              <>
                <StatusChip status={b.status} />
                {canEditBooking(b, today) ? (
                  <Button label="✎ Edit" variant="secondary" size="sm" onPress={() => startEdit(b)} />
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
            setSaved('Changes saved. The store has been notified.');
          }}
        />
      ) : null}
      {rating ? (
        <RateBookingModal
          booking={rating}
          onClose={() => setRating(null)}
          onSaved={() => {
            setRating(null);
            setSaved('Thanks! Your rating was saved.');
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
