import { Drawer } from 'expo-router/drawer';

import { useSession } from '@/auth/session';

export default function AppLayout() {
  const { session } = useSession();

  return (
    <Drawer screenOptions={{ headerShown: false, drawerPosition: 'left', drawerType: 'front' }}>
      <Drawer.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Drawer.Protected guard={session?.role === 'user'}>
        <Drawer.Screen name="events" options={{ title: 'Events' }} />
      </Drawer.Protected>
      <Drawer.Protected guard={!!session}>
        <Drawer.Screen name="profile" options={{ title: 'Profile' }} />
        <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
      </Drawer.Protected>
    </Drawer>
  );
}
