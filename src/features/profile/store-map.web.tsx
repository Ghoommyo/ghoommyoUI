import { MapFallback } from '@/features/profile/map-fallback';
import type { StoreProfile } from '@/types/domain';

// expo-maps has no web support.
export function StoreMap({ profile }: { name: string; profile: StoreProfile }) {
  return <MapFallback profile={profile} />;
}
