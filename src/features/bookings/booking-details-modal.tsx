import { useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { StatusChip } from '@/components/event-card';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Stars } from '@/components/ui/stars';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { DescriptionHistory } from '@/features/bookings/description-history';
import { useSetBookingStatus, useStartDelivery, useStores } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatSlotStart, toDateKey } from '@/lib/date';
import { catalogLabels, hasStoreAddress, orderTypeLabel, showsPeople, visitsStore } from '@/lib/order-types';
import { formatPrice } from '@/lib/services';
import type { Booking, BookingStatus, CatalogType } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

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
  const { t, language } = useT();
  const theme = useTheme();
  const words = catalogLabels(t, catalogType);
  // Customers visiting the store are reminded where it is.
  const stores = useStores();
  // Keep the latest version after accepting/rejecting from here.
  const [booking, setBooking] = useState(initial);
  const setStatus = useSetBookingStatus();
  const busy = setStatus.isPending ? setStatus.variables?.status : undefined;
  const change = (status: BookingStatus) => setStatus.mutate({ bookingId: booking.id, status }, { onSuccess: setBooking });

  // Porter: once accepted, the store starts the delivery with an optional tracking link.
  const startDelivery = useStartDelivery();
  const canDeliver = viewer === 'store' && booking.orderType === 'porter' && booking.status === 'accepted';
  const [deliveryForm, setDeliveryForm] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState('');
  const [linkError, setLinkError] = useState<string | undefined>();
  const openDeliveryForm = () => {
    setTrackingUrl(booking.delivery?.trackingUrl ?? '');
    setLinkError(undefined);
    startDelivery.reset();
    setDeliveryForm(true);
  };
  const submitDelivery = () => {
    const url = trackingUrl.trim();
    if (url && !/^https?:\/\/\S+$/i.test(url)) return setLinkError(t('delivery.linkInvalid'));
    setLinkError(undefined);
    startDelivery.mutate(
      { bookingId: booking.id, trackingUrl: url },
      {
        onSuccess: (updated) => {
          setBooking(updated);
          setDeliveryForm(false);
        },
      },
    );
  };

  const rows: [string, ReactNode][] = [
    viewer === 'store' ? [t('booking.customer'), booking.name] : [t('booking.store'), booking.storeName],
  ];
  if (booking.mobile) {
    rows.push([
      viewer === 'store' ? t('booking.mobile') : t('booking.yourMobile'),
      viewer === 'store' ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('app.call', { number: booking.mobile })}
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
  rows.push([t('booking.when'), formatSlotStart(booking.slotStart, language)]);
  if (booking.orderType) rows.push([t('booking.orderType'), orderTypeLabel(t, booking.orderType)]);
  if (showsPeople(booking, isDarkStore)) rows.push([t('booking.people'), String(booking.people)]);
  if (booking.deliveryAddress) {
    rows.push([booking.orderType === 'homeVisit' ? t('booking.visitAt') : t('booking.deliverTo'), booking.deliveryAddress]);
  }
  if (booking.delivery) {
    const { startedAt, trackingUrl: link } = booking.delivery;
    rows.push([
      t('delivery.label'),
      <View key="delivery" style={styles.deliveryValue}>
        <ThemedText type="smallBold">{t('delivery.startedAt', { time: formatSlotStart(localSlotStart(startedAt), language) })}</ThemedText>
        {link ? (
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(link)}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {t('delivery.track')}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>,
    ]);
  }
  const store =
    viewer === 'user' && visitsStore(booking.orderType)
      ? stores.data?.find((s) => s.id === booking.storeId)
      : undefined;
  if (store && hasStoreAddress(store)) {
    const place = [store.profile.city, store.profile.pin].filter(Boolean).join(' ');
    rows.push([t('booking.storeAddress'), [store.profile.address, place].filter(Boolean).join('\n')]);
  }

  const footer =
    viewer === 'store' && deliveryForm ? (
      <View style={styles.actions}>
        <Button label={t('common.cancel')} variant="secondary" disabled={startDelivery.isPending} onPress={() => setDeliveryForm(false)} />
        <Button label={t('delivery.submit')} variant="success" loading={startDelivery.isPending} onPress={submitDelivery} />
      </View>
    ) : viewer === 'store' ? (
      <View style={styles.actions}>
        {canDeliver ? (
          <Button
            label={booking.delivery ? t('delivery.updateLink') : t('delivery.start')}
            variant={booking.delivery ? 'secondary' : 'primary'}
            disabled={setStatus.isPending}
            onPress={openDeliveryForm}
          />
        ) : null}
        {booking.status !== 'rejected' ? (
          <Button label={t('booking.reject')} variant="danger" loading={busy === 'rejected'} disabled={setStatus.isPending} onPress={() => change('rejected')} />
        ) : null}
        {booking.status !== 'accepted' ? (
          <Button label={t('booking.accept')} variant="success" loading={busy === 'accepted'} disabled={setStatus.isPending} onPress={() => change('accepted')} />
        ) : null}
      </View>
    ) : onEdit || onRate ? (
      <View style={styles.actions}>
        {onRate ? (
          <Button label={`★ ${booking.rating ? t('booking.editRating') : t('booking.rate')}`} variant={onEdit ? 'secondary' : 'primary'} onPress={() => onRate(booking)} />
        ) : null}
        {onEdit ? <Button label={t('booking.edit')} onPress={() => onEdit(booking)} /> : null}
      </View>
    ) : undefined;

  return (
    <Sheet visible title={t('booking.details')} onClose={onClose} footer={footer}>
      <View style={styles.statusRow}>
        <StatusChip status={booking.status} />
        <ThemedText type="small" themeColor="textSecondary">
          #{booking.id.slice(0, 8)}
        </ThemedText>
      </View>
      <Banner
        message={
          setStatus.isError
            ? { type: 'error', text: errorMessage(setStatus.error) }
            : startDelivery.isError
              ? { type: 'error', text: errorMessage(startDelivery.error) }
              : null
        }
      />

      {deliveryForm ? (
        <View style={[styles.box, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">{t('delivery.onTheWay')}</ThemedText>
          <TextField
            label={t('delivery.trackingLink')}
            value={trackingUrl}
            onChangeText={(text) => {
              setTrackingUrl(text);
              setLinkError(undefined);
            }}
            placeholder="https://"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={1000}
            hint={t('delivery.trackingHint')}
            error={linkError}
          />
        </View>
      ) : null}

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
                {t('booking.total')}
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
          <ThemedText type="smallBold">{t('booking.yourRating')}</ThemedText>
          <View style={[styles.box, { backgroundColor: theme.backgroundSelected }]}>
            <Stars value={booking.rating.stars} />
            {booking.rating.review ? <ThemedText>{booking.rating.review}</ThemedText> : null}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedText type="smallBold">{t('booking.description')}</ThemedText>
        <DescriptionHistory description={booking.description} />
      </View>
    </Sheet>
  );
}

/** ISO → the local `YYYY-MM-DDTHH:mm` that formatSlotStart takes. */
function localSlotStart(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${toDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const styles = StyleSheet.create({
  deliveryValue: {
    gap: Spacing.half,
  },
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
