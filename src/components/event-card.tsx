import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatSlotStart } from '@/lib/date';
import type { MessageKey } from '@/i18n/messages';
import { orderTypeLabel } from '@/lib/order-types';
import type { Booking, BookingStatus } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

const STATUS_LABEL: Record<BookingStatus, MessageKey> = {
  accepted: 'status.accepted',
  pending: 'status.pending',
  rejected: 'status.rejected',
  cancelled: 'status.cancelled',
};

export function StatusChip({ status }: { status: BookingStatus }) {
  const { t } = useT();
  const theme = useTheme();
  const color = { accepted: theme.success, pending: theme.warning, rejected: theme.danger, cancelled: theme.textSecondary }[status];

  return (
    <View style={[styles.chip, { backgroundColor: color }]}>
      <ThemedText type="smallBold" style={{ color: theme.onPrimary, fontSize: 13 }}>
        {t(STATUS_LABEL[status])}
      </ThemedText>
    </View>
  );
}

type EventCardProps = {
  booking: Booking;
  /** Who the row is about: the visitor's name for stores, the store's name for users. */
  title: string;
  /** Right-hand column; defaults to the status chip. */
  actions?: ReactNode;
  /** Small line under the title, e.g. the customer's mobile on the store's cards. */
  subtitle?: string;
  /** Hide the head count (dark-store bookings are orders). */
  showPeople?: boolean;
  /** Makes the whole card open the booking. Buttons inside keep their own presses. */
  onPress?(): void;
};

/** Blue booking row from the dashboard references. */
export function EventCard({ booking, title, actions, subtitle, showPeople = true, onPress }: EventCardProps) {
  const { t, language } = useT();
  const theme = useTheme();
  // `Book table · 2 people`; older bookings have no order type.
  const meta = [
    booking.orderType ? orderTypeLabel(t, booking.orderType) : '',
    showPeople ? t('common.people', { count: booking.people }) : '',
    booking.delivery ? `🚚 ${t('delivery.onTheWay')}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  // Text on the card: white on the light theme's blue, dark on the dark theme's lighter blue.
  const light = { color: theme.onPrimary };
  // The tappable part and the action buttons are siblings, so buttons never nest (invalid on web).
  return (
    <View style={[styles.card, { backgroundColor: theme.eventCard }]}>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? t('common.openDetails', { title, when: formatSlotStart(booking.slotStart, language) }) : undefined}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <View style={styles.who}>
          <ThemedText type="small" style={light}>
            {formatSlotStart(booking.slotStart, language)}
          </ThemedText>
          <ThemedText type="smallBold" style={[light, styles.title]}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText type="small" style={light}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        <View style={[styles.details, { borderLeftColor: `${theme.onPrimary}80` }]}>
          <ThemedText style={light} numberOfLines={6}>
            {booking.description || t('common.noDescription')}
          </ThemedText>
          {meta ? (
            <ThemedText type="small" style={light}>
              {meta}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.actions}>{actions ?? <StatusChip status={booking.status} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  main: {
    flex: 1,
    minWidth: 232,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
  },
  who: {
    minWidth: 96,
    gap: Spacing.one,
  },
  title: {
    fontSize: 16,
  },
  details: {
    flex: 1,
    minWidth: 120,
    borderLeftWidth: 1,
    paddingLeft: Spacing.three,
  },
  actions: {
    gap: Spacing.two,
    alignItems: 'stretch',
    minWidth: 104,
    marginLeft: 'auto',
  },
  pressed: {
    opacity: 0.85,
  },
  chip: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
