import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

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
};

/** Blue booking row from the dashboard references. */
export function EventCard({ booking, title, actions }: EventCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.eventCard }]}>
      <View style={styles.who}>
        <ThemedText type="small" style={styles.light}>
          {formatSlotStart(booking.slotStart)}
        </ThemedText>
        <ThemedText type="smallBold" style={[styles.light, styles.title]}>
          {title}
        </ThemedText>
      </View>
      <View style={[styles.details, { borderLeftColor: 'rgba(255,255,255,0.5)' }]}>
        <ThemedText style={styles.light} numberOfLines={3}>
          {booking.description || 'No description'}
        </ThemedText>
        <ThemedText type="small" style={styles.light}>
          {booking.people} {booking.people === 1 ? 'person' : 'people'}
        </ThemedText>
      </View>
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
  chip: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
