import { Linking, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useT } from '@/i18n/language-provider';
import type { Language } from '@/i18n/languages';
import { openSitePage, SUPPORT_EMAIL } from '@/lib/site';

/** The page text in each language (as on the website's Contact page). */
const COPY: Record<Language, { intro: string; email: string; includeTitle: string; include: string[] }> = {
  en: {
    intro: "Questions, problems or feedback? Write to us and we'll get back to you.",
    email: `Email ${SUPPORT_EMAIL}`,
    includeTitle: 'To help us help you, include',
    include: [
      'The email address (or store login code) of your account.',
      'What you were doing, and what went wrong. A screenshot helps.',
      'For a booking: the store, the date and time.',
      'That you use the Android or iOS app.',
    ],
  },
  hi: {
    intro: 'कोई सवाल, परेशानी या सुझाव? हमें लिखें, हम आपको जवाब देंगे।',
    email: `${SUPPORT_EMAIL} पर ईमेल करें`,
    includeTitle: 'जल्दी मदद के लिए ये बताएँ',
    include: [
      'आपके खाते का ईमेल पता (या स्टोर का लॉगिन कोड)।',
      'आप क्या कर रहे थे, और क्या गड़बड़ हुई। स्क्रीनशॉट से मदद मिलती है।',
      'बुकिंग के बारे में: स्टोर, तारीख और समय।',
      'कि आप Android या iOS ऐप इस्तेमाल करते हैं।',
    ],
  },
  mr: {
    intro: 'काही प्रश्न, अडचण किंवा सूचना? आम्हाला लिहा, आम्ही तुम्हाला उत्तर देऊ.',
    email: `${SUPPORT_EMAIL} वर ईमेल करा`,
    includeTitle: 'लवकर मदतीसाठी हे सांगा',
    include: [
      'तुमच्या खात्याचा ईमेल पत्ता (किंवा स्टोअरचा लॉगिन कोड).',
      'तुम्ही काय करत होता, आणि काय चुकले. स्क्रीनशॉटने मदत होते.',
      'बुकिंगबद्दल: स्टोअर, तारीख आणि वेळ.',
      'तुम्ही Android की iOS ॲप वापरता.',
    ],
  },
};

export function ContactScreen() {
  const { t, language } = useT();
  const copy = COPY[language];
  return (
    <Screen>
      <AppHeader title={t('info.contact')} />
      <ThemedText>{copy.intro}</ThemedText>
      <Button
        label={copy.email}
        onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Ghoomyo support')}`)}
      />
      <ThemedText type="smallBold" accessibilityRole="header">
        {copy.includeTitle}
      </ThemedText>
      <View style={styles.list}>
        {copy.include.map((line) => (
          <ThemedText key={line} themeColor="textSecondary">
            •  {line}
          </ThemedText>
        ))}
      </View>
      <Button label={t('info.help')} variant="secondary" onPress={() => openSitePage('/help')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.one,
  },
});
