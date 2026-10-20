import Constants from 'expo-constants';
import { ActivityIndicator, Platform, StyleSheet } from 'react-native';

import { errorMessage } from '@/api';
import { useSession } from '@/auth/session';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Banner } from '@/components/ui/banner';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { ReminderSettingsSection } from '@/features/reminders/reminder-settings-form';
import { StoreServices } from '@/features/settings/store-services';
import { StoreSettingsForm } from '@/features/settings/store-settings-form';
import { useStore } from '@/hooks/queries';
import { INACTIVE_STORE_HINT } from '@/lib/account-status';

export default function SettingsScreen() {
  const { session } = useSession();

  return (
    <Screen>
      <AppHeader title="Settings" />
      {/* Reminders are a phone feature; not offered on web. */}
      {Platform.OS !== 'web' && session ? <ReminderSettingsSection /> : null}
      {session?.role === 'store' ? <StoreSettings storeId={session.accountId} /> : <UserSettings />}
    </Screen>
  );
}

function StoreSettings({ storeId }: { storeId: string }) {
  const store = useStore(storeId);
  if (store.isLoading) return <ActivityIndicator />;
  if (!store.data) return <Banner message={{ type: 'error', text: errorMessage(store.error) }} />;
  return (
    <>
      {store.data.inactive ? <Banner message={{ type: 'error', text: INACTIVE_STORE_HINT }} /> : null}
      <StoreSettingsForm store={store.data} />
      <StoreServices store={store.data} />
    </>
  );
}

function UserSettings() {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedText type="smallBold">App version</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {Constants.expoConfig?.version ?? 'Unknown'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
});
