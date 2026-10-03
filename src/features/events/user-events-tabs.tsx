import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { EventCard } from '@/components/event-card';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { SegmentedTabs, type Tab } from '@/components/ui/segmented-tabs';
import { Spacing } from '@/constants/theme';
import { useMyBookings } from '@/hooks/queries';
import { todayKey } from '@/lib/date';
import { bucketEvents } from '@/lib/slots';

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
  const bookings = useMyBookings();
  const buckets = bucketEvents(bookings.data ?? [], todayKey());

  return (
    <View style={styles.container}>
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
        buckets[tab].map((b) => <EventCard key={b.id} booking={b} title={b.storeName} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
