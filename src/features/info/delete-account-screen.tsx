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
import { SUPPORT_EMAIL } from '@/lib/site';

const CUSTOMER = [
  "You're signed out and can't sign in again; you can sign up later with the same email.",
  'Your name, mobile number, saved addresses, reminder settings and notifications are deleted.',
  'Your upcoming requests are cancelled.',
  'Stores keep their booking history without your personal details. Your reviews stay, without your name.',
];
const STORE = [
  "Your store disappears from Ghoomyo and you can't sign in again.",
  'Your products or services, address and description are removed.',
  'Upcoming bookings are cancelled and the customers are notified.',
];

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
  const { session, signOut } = useSession();
  const remove = useDeleteAccount();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const isStore = session?.role === 'store';

  return (
    <Screen>
      <AppHeader title="Delete account" />
      <ThemedText>You can delete your Ghoomyo account at any time. This can&apos;t be undone.</ThemedText>
      <ThemedText type="smallBold" accessibilityRole="header">
        {session ? (isStore ? 'For your store account' : 'For your account') : 'Customer accounts'}
      </ThemedText>
      <Bullets lines={session ? (isStore ? STORE : CUSTOMER) : CUSTOMER} />
      {!session ? (
        <>
          <ThemedText type="smallBold" accessibilityRole="header">
            Store accounts
          </ThemedText>
          <Bullets lines={STORE} />
          <ThemedText>Log in first to delete your account here.</ThemedText>
          <Button label="Log in" onPress={() => router.push('/login')} />
        </>
      ) : (
        <View style={[styles.box, { borderColor: theme.danger }]}>
          <ThemedText type="smallBold">Signed in as {session.name ?? session.email}</ThemedText>
          <Banner message={error ? { type: 'error', text: error } : null} />
          <TextField
            label="Password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError(null);
            }}
            secureTextEntry
            autoComplete="current-password"
            hint="Enter your password to confirm."
          />
          <Button
            label="Delete my account"
            variant="danger"
            loading={remove.isPending}
            onPress={() => (password ? setConfirming(true) : setError('Enter your password.'))}
          />
        </View>
      )}
      <ThemedText type="smallBold" accessibilityRole="header">
        Can&apos;t sign in?
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        Email us from the email address of your account and ask us to delete it.
      </ThemedText>
      <Button
        label={`Email ${SUPPORT_EMAIL}`}
        variant="secondary"
        onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my Ghoomyo account')}`)}
      />
      <ConfirmModal
        visible={confirming}
        title="Delete your account for good?"
        message="This can't be undone. Your personal details are removed and upcoming bookings are cancelled."
        confirmLabel="Delete account"
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
