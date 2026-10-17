import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { useSession } from '@/auth/session';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import { BookingDetailsModal } from '@/features/bookings/booking-details-modal';
import {
  useMarkNotificationsRead,
  useNotifications,
  useSetBookingStatus,
  useShowNotificationsRead,
  useStore,
  useStores,
} from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatSlotStart, formatTimeAgo } from '@/lib/date';
import type { AppNotification, Booking, NotificationKind } from '@/types/domain';

/**
 * The signed-in account's notifications, split into New (unseen, tinted) and Earlier. They're
 * fetched when the app starts, when the panel opens and on Refresh, never in the background.
 * Tapping one marks it seen; closing marks the rest. Mount only while open.
 */
export function NotificationsPanel({ onClose }: { onClose(): void }) {
  const theme = useTheme();
  const { session } = useSession();
  const isStore = session?.role === 'store';
  const notifications = useNotifications();
  const markRead = useMarkNotificationsRead();
  const showRead = useShowNotificationsRead();
  const [open, setOpen] = useState<Booking | null>(null);
  // Unseen ones tapped while the panel is open: already marked read, no longer tinted.
  const [tapped, setTapped] = useState<Set<string>>(() => new Set());
  const ownStore = useStore(isStore ? session?.accountId : undefined);
  const stores = useStores();
  const storeOf = (storeId: string) => (isStore ? ownStore.data : stores.data?.find((s) => s.id === storeId));

  // Show the latest when the panel opens (the app-start list may be old); joins a fetch in flight.
  const { refetch } = notifications;
  useEffect(() => {
    refetch({ cancelRefetch: false });
  }, [refetch]);

  const list = notifications.data ?? [];
  // New = unseen when the panel opened (or was refreshed); they stay here until it closes.
  const fresh = list.filter((n) => !n.read);
  const earlier = list.filter((n) => n.read);

  /** Closing marks everything shown as seen, so it's under Earlier next time. */
  const close = () => {
    const ids = fresh.filter((n) => !tapped.has(n.id)).map((n) => n.id);
    if (ids.length) markRead.mutate(ids);
    if (fresh.length) showRead(fresh.map((n) => n.id));
    onClose();
  };

  /** Opening one marks it seen right away; it stays under New (untinted) until the panel closes. */
  const openNotification = (n: AppNotification) => {
    if (!n.booking) return;
    if (!n.read && !tapped.has(n.id)) {
      markRead.mutate([n.id]);
      setTapped((t) => new Set(t).add(n.id));
    }
    setOpen(n.booking);
  };

  const section = (title: string, items: AppNotification[]) =>
    items.length ? (
      <View key={title}>
        <ThemedText
          type="smallBold"
          themeColor="textSecondary"
          accessibilityRole="header"
          style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {items.map((n) => (
          <NotificationRow
            key={n.id}
            notification={n}
            unseen={!n.read && !tapped.has(n.id)}
            isStore={isStore}
            onOpen={openNotification}
          />
        ))}
      </View>
    ) : null;

  return (
    <Sheet
      visible
      variant="panel"
      title={fresh.length ? `Notifications · ${fresh.length} new` : 'Notifications'}
      onClose={close}
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
      {notifications.isLoading || (notifications.isFetching && !list.length) ? (
        <ActivityIndicator style={styles.empty} />
      ) : notifications.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(notifications.error) }} />
      ) : !list.length ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          No notifications yet.
        </ThemedText>
      ) : (
        <View style={[styles.list, { borderColor: theme.border }]}>
          {section('New', fresh)}
          {section('Earlier', earlier)}
        </View>
      )}
      {open ? (
        <BookingDetailsModal
          booking={open}
          viewer={isStore ? 'store' : 'user'}
          isDarkStore={storeOf(open.storeId)?.isDarkStore}
          catalogType={storeOf(open.storeId)?.catalogType}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </Sheet>
  );
}

function NotificationRow({
  notification: n,
  unseen,
  isStore,
  onOpen,
}: {
  notification: AppNotification;
  /** Not seen yet: tinted and bold. */
  unseen: boolean;
  isStore: boolean;
  onOpen(notification: AppNotification): void;
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
    <View style={[styles.row, { borderBottomColor: theme.border }, unseen && { backgroundColor: `${theme.primary}1F` }]}>
      <Pressable
        disabled={!booking}
        onPress={() => onOpen(n)}
        accessibilityRole="button"
        accessibilityLabel={`${unseen ? 'New. ' : ''}${n.text}${booking ? `. ${formatSlotStart(booking.slotStart)}` : ''}`}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <View style={[styles.dot, { backgroundColor: dot[n.kind] ?? theme.primary }]} />
        <View style={styles.texts}>
          <ThemedText type={unseen ? 'smallBold' : 'small'}>{n.text}</ThemedText>
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
  sectionTitle: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
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
