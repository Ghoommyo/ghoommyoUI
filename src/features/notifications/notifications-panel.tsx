import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { useSession } from '@/auth/session';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import { BookingDetailsModal } from '@/features/bookings/booking-details-modal';
import { useMarkNotificationsRead, useNotifications, useSetBookingStatus, useStore, useStores } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatSlotStart, formatTimeAgo } from '@/lib/date';
import type { AppNotification, Booking, NotificationKind } from '@/types/domain';

/**
 * The signed-in account's notifications. They're fetched when the panel opens and on Refresh,
 * never in the background. Unread ones are highlighted, then marked read. Mount only while open.
 */
export function NotificationsPanel({ onClose }: { onClose(): void }) {
  const theme = useTheme();
  const { session } = useSession();
  const isStore = session?.role === 'store';
  const notifications = useNotifications(true);
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState<Booking | null>(null);
  const ownStore = useStore(isStore ? session?.accountId : undefined);
  const stores = useStores();
  const isDarkStore = (storeId: string) =>
    isStore ? !!ownStore.data?.isDarkStore : !!stores.data?.find((s) => s.id === storeId)?.isDarkStore;

  // Mark what was shown as read (it stays highlighted until the next refresh).
  const marked = useRef(new Set<string>());
  const { mutate: markAsRead } = markRead;
  useEffect(() => {
    const ids = (notifications.data ?? []).filter((n) => !n.read && !marked.current.has(n.id)).map((n) => n.id);
    if (!ids.length) return;
    ids.forEach((id) => marked.current.add(id));
    markAsRead(ids);
  }, [notifications.data, markAsRead]);

  const unread = (notifications.data ?? []).filter((n) => !n.read).length;

  return (
    <Sheet
      visible
      variant="panel"
      title={unread ? `Notifications · ${unread} new` : 'Notifications'}
      onClose={onClose}
      headerAction={
        <Button
          label="↻"
          variant="secondary"
          size="sm"
          accessibilityLabel="Refresh notifications"
          loading={notifications.isFetching && !notifications.isLoading}
          onPress={() => notifications.refetch()}
        />
      }>
      {notifications.isLoading ? (
        <ActivityIndicator style={styles.empty} />
      ) : notifications.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(notifications.error) }} />
      ) : !notifications.data?.length ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          No notifications yet.
        </ThemedText>
      ) : (
        <View style={[styles.list, { borderColor: theme.border }]}>
          {notifications.data.map((n) => (
            <NotificationRow key={n.id} notification={n} isStore={isStore} onOpen={setOpen} />
          ))}
        </View>
      )}
      {open ? (
        <BookingDetailsModal
          booking={open}
          viewer={isStore ? 'store' : 'user'}
          isDarkStore={isDarkStore(open.storeId)}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </Sheet>
  );
}

function NotificationRow({
  notification: n,
  isStore,
  onOpen,
}: {
  notification: AppNotification;
  isStore: boolean;
  onOpen(booking: Booking): void;
}) {
  const theme = useTheme();
  const setStatus = useSetBookingStatus();
  const booking = n.booking;
  const busy = setStatus.isPending ? setStatus.variables?.status : undefined;
  const dot: Record<NotificationKind, string> = {
    NEW_REQUEST: theme.warning,
    AUTO_ACCEPTED: theme.success,
    ACCEPTED: theme.success,
    REJECTED: theme.danger,
    UPDATED: theme.primary,
    RATED: theme.purple,
  };

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }, !n.read && { backgroundColor: theme.backgroundSelected }]}>
      <Pressable
        disabled={!booking}
        onPress={() => booking && onOpen(booking)}
        accessibilityRole="button"
        accessibilityLabel={`${n.read ? '' : 'New. '}${n.text}${booking ? `. ${formatSlotStart(booking.slotStart)}` : ''}`}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <View style={[styles.dot, { backgroundColor: dot[n.kind] ?? theme.primary }]} />
        <View style={styles.texts}>
          <ThemedText type={n.read ? 'small' : 'smallBold'}>{n.text}</ThemedText>
          {booking ? (
            <ThemedText type="small" themeColor="textSecondary">
              {isStore ? '' : `${booking.storeName} · `}
              {formatSlotStart(booking.slotStart)}
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary" style={styles.time}>
            {formatTimeAgo(n.createdAt)}
          </ThemedText>
        </View>
      </Pressable>
      {/* Stores can act on requests that are still waiting. */}
      {isStore && booking?.status === 'pending' ? (
        <View style={styles.decide}>
          <Button
            label="✕ Reject"
            variant="danger"
            size="sm"
            loading={busy === 'rejected'}
            disabled={setStatus.isPending}
            onPress={() => setStatus.mutate({ bookingId: booking.id, status: 'rejected' })}
          />
          <Button
            label="✓ Accept"
            variant="success"
            size="sm"
            loading={busy === 'accepted'}
            disabled={setStatus.isPending}
            onPress={() => setStatus.mutate({ bookingId: booking.id, status: 'accepted' })}
          />
        </View>
      ) : null}
      {setStatus.isError ? <Banner message={{ type: 'error', text: errorMessage(setStatus.error) }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.five,
  },
  list: {
    marginHorizontal: -Spacing.three,
    marginTop: -Spacing.three,
  },
  row: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  texts: {
    flex: 1,
    gap: Spacing.half,
  },
  time: {
    fontSize: 12,
  },
  decide: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
