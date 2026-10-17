import { useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { StatusChip } from '@/components/event-card';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Stars } from '@/components/ui/stars';
import { Spacing } from '@/constants/theme';
import { DescriptionHistory } from '@/features/bookings/description-history';
import { useSetBookingStatus } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatSlotStart } from '@/lib/date';
import type { Booking, BookingStatus } from '@/types/domain';

type BookingDetailsModalProps = {
  booking: Booking;
  /** Stores see the customer and can accept/reject; users see the store and can edit or rate. */
  viewer: 'store' | 'user';
  /** Dark-store bookings are orders: no head count. */
  isDarkStore?: boolean;
  onClose(): void;
  /** Shown to users while the booking can still be changed. */
  onEdit?(booking: Booking): void;
  /** Shown to users when the booking can be rated. */
  onRate?(booking: Booking): void;
};

/** Everything about one booking. Mount it only while open. */
export function BookingDetailsModal({ booking: initial, viewer, isDarkStore, onClose, onEdit, onRate }: BookingDetailsModalProps) {
  const theme = useTheme();
  // Keep the latest version after accepting/rejecting from here.
  const [booking, setBooking] = useState(initial);
  const setStatus = useSetBookingStatus();
  const busy = setStatus.isPending ? setStatus.variables?.status : undefined;
  const change = (status: BookingStatus) => setStatus.mutate({ bookingId: booking.id, status }, { onSuccess: setBooking });

  const rows: [string, ReactNode][] = [
    viewer === 'store' ? ['Customer', booking.name] : ['Store', booking.storeName],
  ];
  if (booking.mobile) {
    rows.push([
      viewer === 'store' ? 'Mobile' : 'Your mobile',
      viewer === 'store' ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Call ${booking.mobile}`}
          onPress={() => Linking.openURL(`tel:${booking.mobile.replace(/[\s-]/g, '')}`)}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            {booking.mobile}
          </ThemedText>
        </Pressable>
      ) : (
        booking.mobile
      ),
    ]);
  }
  rows.push(['When', formatSlotStart(booking.slotStart)]);
  if (!isDarkStore) rows.push(['People', String(booking.people)]);

  const footer =
    viewer === 'store' ? (
      <View style={styles.actions}>
        {booking.status !== 'rejected' ? (
          <Button label="✕ Reject" variant="danger" loading={busy === 'rejected'} disabled={setStatus.isPending} onPress={() => change('rejected')} />
        ) : null}
        {booking.status !== 'accepted' ? (
          <Button label="✓ Accept" variant="success" loading={busy === 'accepted'} disabled={setStatus.isPending} onPress={() => change('accepted')} />
        ) : null}
      </View>
    ) : onEdit || onRate ? (
      <View style={styles.actions}>
        {onRate ? (
          <Button label={booking.rating ? '★ Edit rating' : '★ Rate'} variant={onEdit ? 'secondary' : 'primary'} onPress={() => onRate(booking)} />
        ) : null}
        {onEdit ? <Button label="Edit booking" onPress={() => onEdit(booking)} /> : null}
      </View>
    ) : undefined;

  return (
    <Sheet visible title="Booking details" onClose={onClose} footer={footer}>
      <View style={styles.statusRow}>
        <StatusChip status={booking.status} />
        <ThemedText type="small" themeColor="textSecondary">
          #{booking.id.slice(0, 8)}
        </ThemedText>
      </View>
      <Banner message={setStatus.isError ? { type: 'error', text: errorMessage(setStatus.error) } : null} />

      <View style={styles.rows}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
              {label}
            </ThemedText>
            <View style={styles.value}>
              {typeof value === 'string' ? <ThemedText type="smallBold">{value}</ThemedText> : value}
            </View>
          </View>
        ))}
      </View>

      {viewer === 'user' && booking.rating ? (
        <View style={styles.section}>
          <ThemedText type="smallBold">Your rating</ThemedText>
          <View style={[styles.ratingBox, { backgroundColor: theme.backgroundSelected }]}>
            <Stars value={booking.rating.stars} />
            {booking.rating.review ? <ThemedText>{booking.rating.review}</ThemedText> : null}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedText type="smallBold">Description</ThemedText>
        <DescriptionHistory description={booking.description} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rows: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  label: {
    width: 96,
  },
  value: {
    flex: 1,
  },
  section: {
    gap: Spacing.one,
  },
  ratingBox: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
