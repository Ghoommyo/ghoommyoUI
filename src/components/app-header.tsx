import { useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useSession } from '@/auth/session';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/components/ui/brand';
import { Spacing } from '@/constants/theme';
import { NotificationsPanel } from '@/features/notifications/notifications-panel';
import { useTheme } from '@/hooks/use-theme';

/** Wordmark, the notifications bell (signed in) and the "≡ Menu" button. Used by every drawer screen. */
export function AppHeader({ title }: { title?: string }) {
  const theme = useTheme();
  const navigation = useNavigation();
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  // Narrow phones: the wordmark shrinks so the bell and Menu fit on one line.
  const narrow = width < 400;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Brand size={narrow ? 28 : 34} />
        <View style={styles.buttons}>
          {session ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => setNotificationsOpen(true)}
              style={({ pressed }) => [
                styles.bell,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="default">🔔</ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={({ pressed }) => [
              styles.menu,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              ≡ Menu
            </ThemedText>
          </Pressable>
        </View>
      </View>
      {notificationsOpen ? (
        <NotificationsPanel onClose={() => setNotificationsOpen(false)} />
      ) : null}
      {title ? <ThemedText type="subtitle">{title}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
