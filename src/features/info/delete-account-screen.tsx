import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { useSession } from '@/auth/session';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useDeleteAccount } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/language-provider';
import type { Language } from '@/i18n/languages';
import { SUPPORT_EMAIL } from '@/lib/site';

type Copy = {
  intro: string;
  forStore: string;
  forUser: string;
  customerAccounts: string;
  storeAccounts: string;
  customer: string[];
  store: string[];
  logInFirst: string;
  cantSignIn: string;
  emailUs: string;
  email: string;
};

/** The page text in each language (as on the website's Delete account page). */
const COPY: Record<Language, Copy> = {
  en: {
    intro: "You can delete your Ghoomyo account at any time. This can't be undone.",
    forStore: 'For your store account',
    forUser: 'For your account',
    customerAccounts: 'Customer accounts',
    storeAccounts: 'Store accounts',
    customer: [
      "You're signed out and can't sign in again; you can sign up later with the same email.",
      'Your name, mobile number, saved addresses, reminder settings and notifications are deleted.',
      'Your upcoming requests are cancelled.',
      'Stores keep their booking history without your personal details. Your reviews stay, without your name.',
    ],
    store: [
      "Your store disappears from Ghoomyo and you can't sign in again.",
      'Your products or services, address and description are removed.',
      'Upcoming bookings are cancelled and the customers are notified.',
    ],
    logInFirst: 'Log in first to delete your account here.',
    cantSignIn: "Can't sign in?",
    emailUs: 'Email us from the email address of your account and ask us to delete it.',
    email: `Email ${SUPPORT_EMAIL}`,
  },
  hi: {
    intro: 'आप अपना Ghoomyo खाता कभी भी हटा सकते हैं। हटाया गया खाता वापस नहीं आता।',
    forStore: 'आपके स्टोर खाते के लिए',
    forUser: 'आपके खाते के लिए',
    customerAccounts: 'ग्राहक खाते',
    storeAccounts: 'स्टोर खाते',
    customer: [
      'आप साइन आउट हो जाते हैं और फिर साइन इन नहीं कर सकते; बाद में उसी ईमेल से नया खाता बना सकते हैं।',
      'आपका नाम, मोबाइल नंबर, सेव किए पते, रिमाइंडर सेटिंग्स और सूचनाएँ हटा दी जाती हैं।',
      'आपके आने वाले अनुरोध रद्द हो जाते हैं।',
      'स्टोर के पास बुकिंग का रिकॉर्ड आपकी निजी जानकारी के बिना रहता है। आपके रिव्यू आपके नाम के बिना रहते हैं।',
    ],
    store: [
      'आपका स्टोर Ghoomyo से हट जाता है और आप फिर साइन इन नहीं कर सकते।',
      'आपके प्रोडक्ट या सेवाएँ, पता और विवरण हटा दिए जाते हैं।',
      'आने वाली बुकिंग रद्द हो जाती हैं और ग्राहकों को सूचना मिलती है।',
    ],
    logInFirst: 'यहाँ खाता हटाने के लिए पहले लॉगिन करें।',
    cantSignIn: 'साइन इन नहीं कर पा रहे?',
    emailUs: 'अपने खाते के ईमेल पते से हमें ईमेल करें और खाता हटाने को कहें।',
    email: `${SUPPORT_EMAIL} पर ईमेल करें`,
  },
  mr: {
    intro: 'तुम्ही तुमचे Ghoomyo खाते कधीही हटवू शकता. हटवलेले खाते परत येत नाही.',
    forStore: 'तुमच्या स्टोअर खात्यासाठी',
    forUser: 'तुमच्या खात्यासाठी',
    customerAccounts: 'ग्राहक खाती',
    storeAccounts: 'स्टोअर खाती',
    customer: [
      'तुम्ही साइन आउट होता आणि पुन्हा साइन इन करू शकत नाही; नंतर त्याच ईमेलने नवीन खाते तयार करू शकता.',
      'तुमचे नाव, मोबाइल नंबर, सेव्ह केलेले पत्ते, रिमाइंडर सेटिंग्ज आणि सूचना हटवल्या जातात.',
      'तुमच्या येणाऱ्या विनंत्या रद्द होतात.',
      'स्टोअरकडे बुकिंगची नोंद तुमच्या वैयक्तिक माहितीशिवाय राहते. तुमचे रिव्ह्यू तुमच्या नावाशिवाय राहतात.',
    ],
    store: [
      'तुमचे स्टोअर Ghoomyo वरून जाते आणि तुम्ही पुन्हा साइन इन करू शकत नाही.',
      'तुमची उत्पादने किंवा सेवा, पत्ता आणि वर्णन काढले जातात.',
      'येणारी बुकिंग रद्द होतात आणि ग्राहकांना कळवले जाते.',
    ],
    logInFirst: 'इथे खाते हटवण्यासाठी आधी लॉगिन करा.',
    cantSignIn: 'साइन इन करता येत नाही?',
    emailUs: 'तुमच्या खात्याच्या ईमेल पत्त्यावरून आम्हाला ईमेल करा आणि खाते हटवायला सांगा.',
    email: `${SUPPORT_EMAIL} वर ईमेल करा`,
  },
};

function Bullets({ lines }: { lines: string[] }) {
  return (
    <View style={styles.list}>
      {lines.map((line) => (
        <ThemedText key={line} themeColor="textSecondary">
          •  {line}
        </ThemedText>
      ))}
    </View>
  );
}

/** What deleting an account does, and (signed in) the button to do it, confirmed with the password. */
export function DeleteAccountScreen() {
  const theme = useTheme();
  const { t, language } = useT();
  const copy = COPY[language];
  const { session, signOut } = useSession();
  const remove = useDeleteAccount();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const isStore = session?.role === 'store';

  return (
    <Screen>
      <AppHeader title={t('info.deleteAccount')} />
      <ThemedText>{copy.intro}</ThemedText>
      <ThemedText type="smallBold" accessibilityRole="header">
        {session ? (isStore ? copy.forStore : copy.forUser) : copy.customerAccounts}
      </ThemedText>
      <Bullets lines={session && isStore ? copy.store : copy.customer} />
      {!session ? (
        <>
          <ThemedText type="smallBold" accessibilityRole="header">
            {copy.storeAccounts}
          </ThemedText>
          <Bullets lines={copy.store} />
          <ThemedText>{copy.logInFirst}</ThemedText>
          <Button label={t('deleteAccount.logIn')} onPress={() => router.push('/login')} />
        </>
      ) : (
        <View style={[styles.box, { borderColor: theme.danger }]}>
          <ThemedText type="smallBold">
            {t('deleteAccount.signedInAs')} {session.name ?? session.email}
          </ThemedText>
          <Banner message={error ? { type: 'error', text: error } : null} />
          <TextField
            label={t('auth.password')}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError(null);
            }}
            secureTextEntry
            autoComplete="current-password"
            hint={t('deleteAccount.enterToConfirm')}
          />
          <Button
            label={t('deleteAccount.button')}
            variant="danger"
            loading={remove.isPending}
            onPress={() => (password ? setConfirming(true) : setError(t('deleteAccount.enterPassword')))}
          />
        </View>
      )}
      <ThemedText type="smallBold" accessibilityRole="header">
        {copy.cantSignIn}
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        {copy.emailUs}
      </ThemedText>
      <Button
        label={copy.email}
        variant="secondary"
        onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my Ghoomyo account')}`)}
      />
      <ConfirmModal
        visible={confirming}
        title={t('deleteAccount.confirmTitle')}
        message={t('deleteAccount.confirmMessage')}
        confirmLabel={t('info.deleteAccount')}
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          remove.mutate(password, {
            onSuccess: async () => {
              await signOut();
              router.replace('/login');
            },
            onError: (e) => setError(errorMessage(e)),
          });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.one,
  },
  box: {
    gap: Spacing.three,
    borderWidth: 2,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
});
