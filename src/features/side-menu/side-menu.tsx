import { router, type Href } from 'expo-router';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Spacing } from '@/constants/theme';
import { useMyProfile, useStore } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { privacyChoicesRequired, showPrivacyChoices } from '@/lib/ads';
import { openSitePage } from '@/lib/site';
import { LanguagePicker } from '@/components/language-picker';
import type { MessageKey } from '@/i18n/messages';
import { useT } from '@/i18n/language-provider';

type Item = { label: MessageKey; href: Href; route?: string };

/** Information pages: native screens, or website pages opened in the in-app browser. */
const MORE: ({ label: MessageKey; href: Href; route: string } | { label: MessageKey; site: string })[] = [
  { label: 'info.about', href: '/about', route: 'about' },
  { label: 'info.help', site: '/help' },
  { label: 'info.support', site: '/support' },
  { label: 'info.contact', href: '/contact', route: 'contact' },
  { label: 'info.privacy', site: '/privacy' },
  { label: 'info.terms', site: '/terms' },
  { label: 'info.deleteAccount', href: '/delete-account', route: 'delete-account' },
];

export function SideMenu({ state, navigation }: DrawerContentComponentProps) {
  const { t } = useT();
  const theme = useTheme();
  const { session, signOut } = useSession();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const profile = useMyProfile();
  const store = useStore(session?.role === 'store' ? session.accountId : undefined);
  const activeRoute = state.routes[state.index]?.name;
  // Google's ad privacy choices, offered only where the law needs it (EU/UK users).
  const [privacyChoices, setPrivacyChoices] = useState(false);
  useEffect(() => {
    privacyChoicesRequired().then(setPrivacyChoices);
  }, []);

  const displayName =
    session?.role === 'store'
      ? (store.data?.name ?? session.name ?? session.email)
      : (profile.data?.name || session?.name || session?.email || t('menu.guest'));

  const photoUrl = session?.role === 'store' ? store.data?.profile.photoUrl : profile.data?.photoUrl;

  const items: Item[] = session
    ? [
        { label: 'menu.home', href: '/home', route: 'home' },
        { label: 'menu.dashboard', href: '/dashboard', route: 'dashboard' },
        ...(session.role === 'user'
          ? [
              { label: 'menu.events' as const, href: '/events' as const, route: 'events' },
              { label: 'menu.addresses' as const, href: '/addresses' as const, route: 'addresses' },
            ]
          : []),
        ...(session.role === 'store'
          ? [{ label: 'menu.reviews' as const, href: '/reviews' as const, route: 'reviews' }]
          : []),
        { label: 'menu.profile', href: '/profile', route: 'profile' },
        { label: 'menu.settings', href: '/settings', route: 'settings' },
      ]
    : [
        { label: 'menu.home', href: '/home', route: 'home' },
        { label: 'menu.dashboard', href: '/dashboard', route: 'dashboard' },
        { label: 'menu.login', href: '/login' },
        { label: 'menu.signup', href: '/signup' },
      ];

  const go = (href: Href) => {
    navigation.closeDrawer();
    router.navigate(href);
  };

  return (
    <ThemedView type="backgroundElement" style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <View style={[styles.profile, { borderBottomColor: theme.border }]}>
          <Avatar name={displayName} uri={photoUrl || undefined} />
          <View style={styles.flex}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
              {displayName}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {session
                ? session.role === 'store'
                  ? t('menu.storeLine', { code: session.locCode ?? session.email })
                  : session.email
                : t('menu.notSignedIn')}
            </ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.items}>
          {items.map((item) => {
            const active = item.route === activeRoute;
            return (
              <MenuItem
                key={item.label}
                label={t(item.label)}
                active={active}
                onPress={() => go(item.href)}
              />
            );
          })}
          {session ? (
            <MenuItem label={t('menu.logout')} danger onPress={() => setConfirmLogout(true)} />
          ) : null}
          <ThemedText
            type="smallBold"
            themeColor="textSecondary"
            style={[styles.moreTitle, { borderTopColor: theme.border }]}
            accessibilityRole="header">
            {t('app.moreTitle')}
          </ThemedText>
          {MORE.map((item) => (
            <MenuItem
              key={item.label}
              label={t(item.label)}
              small
              active={'route' in item && item.route === activeRoute}
              onPress={() => {
                if ('site' in item) {
                  navigation.closeDrawer();
                  openSitePage(item.site);
                } else go(item.href);
              }}
            />
          ))}
          {privacyChoices && (
            <MenuItem
              label={t('app.privacyChoices')}
              small
              onPress={() => {
                navigation.closeDrawer();
                showPrivacyChoices();
              }}
            />
          )}
          {/* Signed-in people choose in Settings (saved on the account); guests choose here. */}
          {!session && (
            <View style={[styles.language, { borderTopColor: theme.border }]}>
              <LanguagePicker />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <ConfirmModal
        visible={confirmLogout}
        title={t('menu.logoutTitle')}
        message={t('menu.logoutMessage')}
        confirmLabel={t('menu.logout')}
        destructive
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setConfirmLogout(false);
          navigation.closeDrawer();
          await signOut();
          router.replace('/login');
        }}
      />
    </ThemedView>
  );
}

type MenuItemProps = { label: string; active?: boolean; danger?: boolean; small?: boolean; onPress(): void };

function MenuItem({ label, active = false, danger = false, small = false, onPress }: MenuItemProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        small && styles.itemSmall,
        (active || pressed) && { backgroundColor: theme.backgroundSelected },
      ]}>
      <ThemedText
        type={active ? 'smallBold' : 'small'}
        style={[
          small ? undefined : styles.itemText,
          { color: danger ? theme.danger : active ? theme.primary : small ? theme.textSecondary : theme.text },
        ]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderBottomWidth: 1,
  },
  name: {
    fontSize: 16,
  },
  items: {
    padding: Spacing.two,
    gap: Spacing.one,
  },
  item: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  itemSmall: {
    paddingVertical: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 16,
  },
  language: {
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  moreTitle: {
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    fontSize: 12,
    letterSpacing: 1,
  },
});
