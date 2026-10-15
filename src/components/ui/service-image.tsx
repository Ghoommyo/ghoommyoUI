import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PLACEHOLDER = require('@/assets/images/service-placeholder.svg');

/** A service's picture, or a dummy image when it has none or the link is broken. */
export function ServiceImage({ uri, size = 56 }: { uri: string; size?: number }) {
  const theme = useTheme();
  // Remember which link failed, so a new link is tried again.
  const [failed, setFailed] = useState<string | null>(null);
  const source = uri && failed !== uri ? { uri } : PLACEHOLDER;

  return (
    <Image
      source={source}
      onError={() => setFailed(uri)}
      contentFit="cover"
      accessibilityIgnoresInvertColors
      style={[styles.image, { width: size, height: size, backgroundColor: theme.backgroundSelected }]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: Spacing.three,
  },
});
