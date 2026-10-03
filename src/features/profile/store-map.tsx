import Constants, { ExecutionEnvironment } from 'expo-constants';
import { lazy, Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { MapFallback } from '@/features/profile/map-fallback';
import type { StoreProfile } from '@/types/domain';

// Loaded lazily so Expo Go, which doesn't ship expo-maps, never evaluates the native module.
const NativeMap = lazy(() => import('@/features/profile/native-map'));

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function StoreMap({ name, profile }: { name: string; profile: StoreProfile }) {
  // No pin without coordinates (the Ghoomo API doesn't store them yet).
  if (isExpoGo || profile.lat == null || profile.lng == null) return <MapFallback profile={profile} />;

  return (
    <View style={styles.container}>
      <Suspense fallback={<ActivityIndicator />}>
        <NativeMap name={name} latitude={profile.lat} longitude={profile.lng} />
      </Suspense>
      <MapFallback profile={profile} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
});
