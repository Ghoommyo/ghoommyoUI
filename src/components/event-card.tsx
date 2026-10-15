import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatSlotStart } from '@/lib/date';
import type { Booking, BookingStatus } from '@/types/domain';

const STATUS_LABEL: Record<BookingStatus, string> = {
  accepted: '✓ Accepted',
  pending: '◦ Pending',
  rejected: '✕ Rejected',
};

export function StatusChip({ status }: { status: BookingStatus }) {
  const theme = useTheme();
  const color = { accepted: theme.success, pending: theme.warning, rejected: theme.danger }[status];

  return (
    <View style={[styles.chip, { backgroundColor: color }]}>
      <ThemedText type="smallBold" style={{ color: theme.onPrimary, fontSize: 13 }}>
        {STATUS_LABEL[status]}
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
  const theme = useTheme();

  // The tappable part and the action buttons are siblings, so buttons never nest (invalid on web).
  return (
    <View style={[styles.card, { backgroundColor: theme.eventCard }]}>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `${title}, ${formatSlotStart(booking.slotStart)}. Open details` : undefined}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <View style={styles.who}>
          <ThemedText type="small" style={styles.light}>
            {formatSlotStart(booking.slotStart)}
          </ThemedText>
          <ThemedText type="smallBold" style={[styles.light, styles.title]}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText type="small" style={styles.light}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        <View style={[styles.details, { borderLeftColor: 'rgba(255,255,255,0.5)' }]}>
          <ThemedText style={styles.light} numberOfLines={6}>
            {booking.description || 'No description'}
          </ThemedText>
          {showPeople ? (
            <ThemedText type="small" style={styles.light}>
              {booking.people} {booking.people === 1 ? 'person' : 'people'}
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
  light: {
    color: '#FFFFFF',
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
