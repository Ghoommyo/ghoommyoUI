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
import { useSetBookingStatus, useStores } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatSlotStart } from '@/lib/date';
import { catalogWords, hasStoreAddress, ORDER_TYPE_LABEL, showsPeople, visitsStore } from '@/lib/order-types';
import { formatPrice } from '@/lib/services';
import type { Booking, BookingStatus, CatalogType } from '@/types/domain';

type BookingDetailsModalProps = {
  booking: Booking;
  /** Stores see the customer and can accept/reject; users see the store and can edit or rate. */
  viewer: 'store' | 'user';
  /** Dark-store bookings are orders: no head count. */
  isDarkStore?: boolean;
  /** Products or Services: the heading of the booked items. */
  catalogType?: CatalogType;
  onClose(): void;
  /** Shown to users while the booking can still be changed. */
  onEdit?(booking: Booking): void;
  /** Shown to users when the booking can be rated. */
  onRate?(booking: Booking): void;
};

/** Everything about one booking. Mount it only while open. */
export function BookingDetailsModal({
  booking: initial,
  viewer,
  isDarkStore,
  catalogType,
  onClose,
  onEdit,
  onRate,
}: BookingDetailsModalProps) {
  const theme = useTheme();
  const words = catalogWords(catalogType);
  // Customers visiting the store are reminded where it is.
  const stores = useStores();
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
  if (booking.orderType) rows.push(['Order type', ORDER_TYPE_LABEL[booking.orderType]]);
  if (showsPeople(booking, isDarkStore)) rows.push(['People', String(booking.people)]);
  if (booking.deliveryAddress) {
    rows.push([booking.orderType === 'homeVisit' ? 'Visit at' : 'Deliver to', booking.deliveryAddress]);
  }
  const store =
    viewer === 'user' && visitsStore(booking.orderType)
      ? stores.data?.find((s) => s.id === booking.storeId)
      : undefined;
  if (store && hasStoreAddress(store)) {
    const place = [store.profile.city, store.profile.pin].filter(Boolean).join(' ');
    rows.push(['Store address', [store.profile.address, place].filter(Boolean).join('\n')]);
  }

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

      {booking.services.length ? (
        <View style={styles.section}>
          <ThemedText type="smallBold">{words.Items}</ThemedText>
          <View style={[styles.box, { backgroundColor: theme.backgroundSelected }]}>
            {booking.services.map((s) => (
              <View key={s.serviceId} style={styles.itemLine}>
                <ThemedText type="small" style={styles.itemName}>
                  {s.name}
                  {s.qty > 1 ? ` × ${s.qty}` : ''}
                </ThemedText>
                <ThemedText type="small">{formatPrice(s.price * s.qty)}</ThemedText>
              </View>
            ))}
            <View style={[styles.itemLine, styles.itemTotal, { borderTopColor: theme.border }]}>
              <ThemedText type="smallBold" style={styles.itemName}>
                Total
              </ThemedText>
              <ThemedText type="smallBold">
                {formatPrice(booking.services.reduce((sum, s) => sum + s.price * s.qty, 0))}
              </ThemedText>
            </View>
          </View>
        </View>
      ) : null}

      {viewer === 'user' && booking.rating ? (
        <View style={styles.section}>
          <ThemedText type="smallBold">Your rating</ThemedText>
          <View style={[styles.box, { backgroundColor: theme.backgroundSelected }]}>
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
  box: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  itemLine: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  itemName: {
    flex: 1,
  },
  itemTotal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.one,
    marginTop: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
