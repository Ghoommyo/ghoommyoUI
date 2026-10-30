import { Image } from 'expo-image';
import { useState } from 'react';
import type { ImageStyle, StyleProp } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** A store's photo; renders nothing when it has none or the link is broken. */
export function StorePhoto({ uri, name, style }: { uri: string; name: string; style: StyleProp<ImageStyle> }) {
  const theme = useTheme();
  // Remember which link failed, so a new link is tried again.
  const [failed, setFailed] = useState<string | null>(null);
  if (!uri || failed === uri) return null;
  return (
    <Image
      source={{ uri }}
      onError={() => setFailed(uri)}
      contentFit="cover"
      accessibilityLabel={`${name} photo`}
      accessibilityIgnoresInvertColors
      style={[{ backgroundColor: theme.backgroundSelected }, style]}
    />
  );
}
