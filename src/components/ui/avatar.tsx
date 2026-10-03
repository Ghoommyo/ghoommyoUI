import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

function initials(name: string) {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
}

export function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={`${name} avatar`}
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.primary },
      ]}>
      <ThemedText style={{ color: theme.onPrimary, fontSize: size * 0.38, fontWeight: 700 }}>
        {initials(name)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
