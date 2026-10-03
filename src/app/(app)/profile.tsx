import { ActivityIndicator } from 'react-native';

import { errorMessage } from '@/api';
import { useSession } from '@/auth/session';
import { AppHeader } from '@/components/app-header';
import { Banner } from '@/components/ui/banner';
import { Screen } from '@/components/ui/screen';
import { StoreProfileForm } from '@/features/profile/store-profile-form';
import { UserProfileForm } from '@/features/profile/user-profile-form';
import { useMyProfile, useStore } from '@/hooks/queries';

export default function ProfileScreen() {
  const { session } = useSession();

  return (
    <Screen>
      <AppHeader title="Profile" />
      {session?.role === 'store' ? <StoreProfile storeId={session.accountId} /> : <UserProfile />}
    </Screen>
  );
}

function StoreProfile({ storeId }: { storeId: string }) {
  const store = useStore(storeId);
  if (store.isLoading) return <ActivityIndicator />;
  if (!store.data) return <Banner message={{ type: 'error', text: errorMessage(store.error) }} />;
  return <StoreProfileForm store={store.data} />;
}

function UserProfile() {
  const profile = useMyProfile();
  if (profile.isLoading) return <ActivityIndicator />;
  if (!profile.data) return <Banner message={{ type: 'error', text: errorMessage(profile.error) }} />;
  return <UserProfileForm profile={profile.data} />;
}
