import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

function initials(name: string) {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
}

/** A round photo, or the name's initials when there's none or it fails to load. */
export function Avatar({ name, uri, size = 56 }: { name: string; uri?: string; size?: number }) {
  const theme = useTheme();
  // Remember which link failed, so a new link is tried again.
  const [failed, setFailed] = useState<string | null>(null);
  const circle = { width: size, height: size, borderRadius: size / 2 };

  if (uri && failed !== uri) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(uri)}
        contentFit="cover"
        accessibilityLabel={`${name} photo`}
        accessibilityIgnoresInvertColors
        style={[circle, { backgroundColor: theme.backgroundSelected }]}
      />
    );
  }
  return (
    <View
      accessibilityLabel={`${name} avatar`}
      style={[styles.circle, circle, { backgroundColor: theme.primary }]}>
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
