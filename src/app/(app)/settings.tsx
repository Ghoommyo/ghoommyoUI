import Constants from 'expo-constants';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { errorMessage } from '@/api';
import { useSession } from '@/auth/session';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Banner } from '@/components/ui/banner';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { StoreSettingsForm } from '@/features/settings/store-settings-form';
import { useStore } from '@/hooks/queries';

export default function SettingsScreen() {
  const { session } = useSession();

  return (
    <Screen>
      <AppHeader title="Settings" />
      {session?.role === 'store' ? <StoreSettings storeId={session.accountId} /> : <UserSettings />}
    </Screen>
  );
}

function StoreSettings({ storeId }: { storeId: string }) {
  const store = useStore(storeId);
  if (store.isLoading) return <ActivityIndicator />;
  if (!store.data) return <Banner message={{ type: 'error', text: errorMessage(store.error) }} />;
  return <StoreSettingsForm store={store.data} />;
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
