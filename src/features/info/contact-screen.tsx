import { Linking, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { openSitePage, SUPPORT_EMAIL } from '@/lib/site';

const INCLUDE = [
  'The email address (or store login code) of your account.',
  'What you were doing, and what went wrong. A screenshot helps.',
  'For a booking: the store, the date and time.',
  'That you use the Android or iOS app.',
];

export function ContactScreen() {
  return (
    <Screen>
      <AppHeader title="Contact us" />
      <ThemedText>Questions, problems or feedback? Write to us and we&apos;ll get back to you.</ThemedText>
      <Button
        label={`Email ${SUPPORT_EMAIL}`}
        onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Ghoomyo support')}`)}
      />
      <ThemedText type="smallBold" accessibilityRole="header">
        To help us help you, include
      </ThemedText>
      <View style={styles.list}>
        {INCLUDE.map((line) => (
          <ThemedText key={line} themeColor="textSecondary">
            •  {line}
          </ThemedText>
        ))}
      </View>
      <Button label="Help & FAQ" variant="secondary" onPress={() => openSitePage('/help')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.one,
  },
});
