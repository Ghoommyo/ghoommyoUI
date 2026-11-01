import Constants from 'expo-constants';
import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet } from 'react-native';

import { api, errorMessage } from '@/api';
import { useSession } from '@/auth/session';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { ReminderSettingsSection } from '@/features/reminders/reminder-settings-form';
import { StoreServices } from '@/features/settings/store-services';
import { StoreSettingsForm } from '@/features/settings/store-settings-form';
import { useStore } from '@/hooks/queries';
import { LanguagePicker } from '@/components/language-picker';
import { useT } from '@/i18n/language-provider';

export default function SettingsScreen() {
  const { t } = useT();
  const { session } = useSession();

  return (
    <Screen>
      <AppHeader title={t('settings.title')} />
      {session ? <LanguageSection /> : null}
      {/* Reminders are a phone feature; not offered on web. */}
      {Platform.OS !== 'web' && session ? <ReminderSettingsSection /> : null}
      {session?.role === 'store' ? <StoreSettings storeId={session.accountId} /> : <UserSettings />}
    </Screen>
  );
}

function StoreSettings({ storeId }: { storeId: string }) {
  const { t } = useT();
  const store = useStore(storeId);
  if (store.isLoading) return <ActivityIndicator />;
  if (!store.data) return <Banner message={{ type: 'error', text: errorMessage(store.error) }} />;
  return (
    <>
      {store.data.inactive ? <Banner message={{ type: 'error', text: t('hint.inactiveStore') }} /> : null}
      <StoreSettingsForm store={store.data} />
      <StoreServices store={store.data} />
    </>
  );
}

function UserSettings() {
  const { t } = useT();
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedText type="smallBold">{t('settings.appVersion')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {Constants.expoConfig?.version ?? 'Unknown'}
      </ThemedText>
    </ThemedView>
  );
}

/** The screens switch at once; the choice is also saved on the account, for the user's other devices. */
function LanguageSection() {
  const { t } = useT();
  // "saved" is translated when shown: the screen has switched language by the time the save returns.
  const [result, setResult] = useState<unknown>(null);
  const message: BannerMessage | null =
    result === 'saved'
      ? { type: 'success', text: t('settings.languageSaved') }
      : result
        ? { type: 'error', text: errorMessage(result) }
        : null;
  return (
    <ThemedView type="backgroundElement" style={styles.section}>
      <LanguagePicker
        onChange={(language) => {
          setResult(null);
          api.setLanguage(language).then(
            () => setResult('saved'),
            (error: unknown) => setResult(error ?? new Error()),
          );
        }}
      />
      <ThemedText type="small" themeColor="textSecondary">
        {t('settings.languageHint')}
      </ThemedText>
      <Banner message={message} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
});
