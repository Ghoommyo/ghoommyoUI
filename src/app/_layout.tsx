import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api';
import { SessionProvider, useSession } from '@/auth/session';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ReminderSync } from '@/features/reminders/reminder-sync';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LanguageProvider, useT } from '@/i18n/language-provider';

SplashScreen.preventAutoHideAsync();

// Coming back to the app counts as focus, so stale lists (store bookings, the bell) refetch, and
// the one-minute refresh pauses while the app is in the background.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
  // Offline: loads wait instead of failing, and run again once the phone is back online.
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const colors = Colors[scheme];
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        <LanguageProvider>
          <SessionProvider>
            <QueryProvider>
              <RootNavigator />
              <ReminderSync />
            </QueryProvider>
          </SessionProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function QueryProvider({ children }: PropsWithChildren) {
  const { session, signOut } = useSession();
  // One "session ended" per sign-in, however many requests were refused.
  const ended = useRef(false);
  useEffect(() => {
    if (session) ended.current = false;
  }, [session]);
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
          },
        },
      }),
  );

  // An expired or unknown token signs the user out instead of leaving screens broken.
  useEffect(
    () =>
      client.getQueryCache().subscribe((event) => {
        if (event.type !== 'updated' || event.action.type !== 'error') return;
        const { error } = event.action;
        if (!(error instanceof ApiError && error.status === 401) || ended.current) return;
        ended.current = true;
        // Say why: the login screen shows "Your session ended".
        signOut().then(() => router.push({ pathname: '/login', params: { ended: '1' } }));
      }),
    [client, signOut],
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function RootNavigator() {
  const { session, isLoading } = useSession();
  const { t } = useT();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  // Keep the native splash screen up until the stored session has been read.
  if (isLoading) return null;

  return (
    <>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(app)" />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={session?.role === 'user'}>
        <Stack.Screen
          name="booking"
          options={{ presentation: 'modal', headerShown: true, title: t('book.title') }}
        />
      </Stack.Protected>
    </Stack>
    <OfflineNotice />
    </>
  );
}

const subscribeOnline = (onChange: () => void) => onlineManager.subscribe(onChange);
const isOnline = () => onlineManager.isOnline();

/** While the phone is offline, a bar says so (loads wait and run again once it's back). */
function OfflineNotice() {
  const online = useSyncExternalStore(subscribeOnline, isOnline);
  const { t } = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (online) return null;
  return (
    // At the top, clear of the ad banner at the bottom.
    <View pointerEvents="none" style={[styles.offline, { top: insets.top + Spacing.two, backgroundColor: theme.text }]}>
      <ThemedText type="smallBold" accessibilityRole="alert" style={{ color: theme.background, textAlign: 'center' }}>
        {t('app.youreOffline')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  offline: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
