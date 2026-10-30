import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useT } from '@/i18n/language-provider';
import type { MessageKey } from '@/i18n/messages';
import { LanguagePicker } from '@/components/language-picker';

const FEATURES: { title: MessageKey; body: MessageKey }[] = [
  { title: 'intro.bookTitle', body: 'intro.bookBody' },
  { title: 'intro.crowdTitle', body: 'intro.crowdBody' },
  { title: 'intro.nearTitle', body: 'intro.nearBody' },
];

/** First-launch intro explaining the app; skipped once dismissed. */
export default function IntroScreen() {
  const { t } = useT();
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
          {t('intro.tagline')}
        </ThemedText>
      </View>

      {FEATURES.map((feature) => (
        <ThemedView key={feature.title} type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold" style={styles.cardTitle}>
            {t(feature.title)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t(feature.body)}
          </ThemedText>
        </ThemedView>
      ))}

      <Button label={t('intro.start')} onPress={start} fullWidth />
      <LanguagePicker />
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
