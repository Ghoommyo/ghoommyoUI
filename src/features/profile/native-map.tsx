import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Platform, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { StoreProfile } from '@/types/domain';

/** Read-only map with a pin at the store. Requires a development build. */
export default function NativeMap({ name, profile }: { name: string; profile: StoreProfile }) {
  const coordinates = { latitude: profile.lat, longitude: profile.lng };
  const cameraPosition = { coordinates, zoom: 15 };

  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        style={styles.map}
        cameraPosition={cameraPosition}
        markers={[{ id: 'store', coordinates, title: name }]}
        uiSettings={{ compassEnabled: false }}
      />
    );
  }
  return (
    <GoogleMaps.View
      style={styles.map}
      cameraPosition={cameraPosition}
      markers={[{ id: 'store', coordinates, title: name }]}
      uiSettings={{ scrollGesturesEnabled: false, zoomGesturesEnabled: false }}
    />
  );
}

const styles = StyleSheet.create({
  map: {
    height: 200,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
});
