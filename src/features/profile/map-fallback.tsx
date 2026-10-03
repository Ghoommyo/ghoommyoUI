import { StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { StoreProfile } from '@/types/domain';

/** Address card with a link out to maps, for web and Expo Go (no expo-maps there). */
export function MapFallback({ profile }: { profile: StoreProfile }) {
  const address = [profile.address, profile.city, profile.state, profile.pin, profile.country]
    .filter(Boolean)
    .join(', ');
  const url = `https://www.google.com/maps/search/?api=1&query=${profile.lat},${profile.lng}` as const;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Location</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {address || 'No address yet'}
      </ThemedText>
      <ExternalLink href={url}>
        <ThemedText type="linkPrimary">Open in Maps ↗</ThemedText>
      </ExternalLink>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
