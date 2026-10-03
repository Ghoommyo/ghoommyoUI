import { useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/components/ui/brand';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Wordmark plus the "≡ Menu" button that opens the side menu. Used by every drawer screen. */
export function AppHeader({ title }: { title?: string }) {
  const theme = useTheme();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Brand size={34} />
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
  menu: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
