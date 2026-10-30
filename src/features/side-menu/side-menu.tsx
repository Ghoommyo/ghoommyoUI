import { router, type Href } from 'expo-router';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { useState } from 'react';
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
import { openSitePage } from '@/lib/site';

type Item = { label: string; href: Href; route?: string };

/** Information pages: native screens, or website pages opened in the in-app browser. */
const MORE: ({ label: string; href: Href; route: string } | { label: string; site: string })[] = [
  { label: 'About', href: '/about', route: 'about' },
  { label: 'Help & FAQ', site: '/help' },
  { label: 'Support', site: '/support' },
  { label: 'Contact us', href: '/contact', route: 'contact' },
  { label: 'Privacy policy', site: '/privacy' },
  { label: 'Terms of service', site: '/terms' },
  { label: 'Delete account', href: '/delete-account', route: 'delete-account' },
];

export function SideMenu({ state, navigation }: DrawerContentComponentProps) {
  const theme = useTheme();
  const { session, signOut } = useSession();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const profile = useMyProfile();
  const store = useStore(session?.role === 'store' ? session.accountId : undefined);
  const activeRoute = state.routes[state.index]?.name;

  const displayName =
    session?.role === 'store'
      ? (store.data?.name ?? session.name ?? session.email)
      : (profile.data?.name || session?.name || session?.email || 'Guest');

  const photoUrl = session?.role === 'store' ? store.data?.profile.photoUrl : profile.data?.photoUrl;

  const items: Item[] = session
    ? [
        { label: 'Home', href: '/home', route: 'home' },
        { label: 'Dashboard', href: '/dashboard', route: 'dashboard' },
        ...(session.role === 'user'
          ? [
              { label: 'Events', href: '/events' as const, route: 'events' },
              { label: 'Addresses', href: '/addresses' as const, route: 'addresses' },
            ]
          : []),
        ...(session.role === 'store'
          ? [{ label: 'Reviews', href: '/reviews' as const, route: 'reviews' }]
          : []),
        { label: 'Profile', href: '/profile', route: 'profile' },
        { label: 'Settings', href: '/settings', route: 'settings' },
      ]
    : [
        { label: 'Home', href: '/home', route: 'home' },
        { label: 'Dashboard', href: '/dashboard', route: 'dashboard' },
        { label: 'Login', href: '/login' },
        { label: 'Sign up', href: '/signup' },
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
                  ? `Store · ${session.locCode ?? session.email}`
                  : session.email
                : 'Not signed in'}
            </ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.items}>
          {items.map((item) => {
            const active = item.route === activeRoute;
            return (
              <MenuItem
                key={item.label}
                label={item.label}
                active={active}
                onPress={() => go(item.href)}
              />
            );
          })}
          {session ? (
            <MenuItem label="Logout" danger onPress={() => setConfirmLogout(true)} />
          ) : null}
          <ThemedText
            type="smallBold"
            themeColor="textSecondary"
            style={[styles.moreTitle, { borderTopColor: theme.border }]}
            accessibilityRole="header">
            MORE
          </ThemedText>
          {MORE.map((item) => (
            <MenuItem
              key={item.label}
              label={item.label}
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
        </ScrollView>
      </SafeAreaView>

      <ConfirmModal
        visible={confirmLogout}
        title="Log out?"
        message="You'll need to log in again to book or manage appointments."
        confirmLabel="Logout"
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
  moreTitle: {
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    fontSize: 12,
    letterSpacing: 1,
  },
});
