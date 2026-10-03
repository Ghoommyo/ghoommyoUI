import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';

const FEATURES = [
  {
    title: 'Book appointments',
    body: 'Pick a store, choose a time slot and reserve your visit in a few taps.',
  },
  {
    title: 'Skip the crowd',
    body: 'See how many people are visiting each hour before you go.',
  },
  {
    title: 'Stores near you',
    body: 'Find nearby stores, then order or schedule with them directly.',
  },
];

/** First-launch intro explaining the app; skipped once dismissed. */
export default function IntroScreen() {
  const { hasSeenIntro, markIntroSeen } = useSession();

  if (hasSeenIntro) return <Redirect href="/dashboard" />;

  const start = async () => {
    await markIntroSeen();
    router.replace('/dashboard');
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Brand size={48} />
        <ThemedText type="default" themeColor="textSecondary" style={styles.tagline}>
          Scheduling and booking for the places you visit.
        </ThemedText>
      </View>

      {FEATURES.map((feature) => (
        <ThemedView key={feature.title} type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold" style={styles.cardTitle}>
            {feature.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {feature.body}
          </ThemedText>
        </ThemedView>
      ))}

      <Button label="Get started" onPress={start} fullWidth />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  tagline: {
    textAlign: 'center',
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  cardTitle: {
    fontSize: 16,
  },
});
