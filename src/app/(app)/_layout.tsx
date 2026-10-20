import { Drawer } from 'expo-router/drawer';

import { useSession } from '@/auth/session';
import { SideMenu } from '@/features/side-menu/side-menu';

export default function AppLayout() {
  const { session } = useSession();

  return (
    <Drawer
      drawerContent={(props) => <SideMenu {...props} />}
      screenOptions={{ headerShown: false, drawerPosition: 'left', drawerType: 'front' }}>
      <Drawer.Screen name="home" options={{ title: 'Home' }} />
      <Drawer.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="reviews" options={{ title: 'Reviews' }} />
      <Drawer.Protected guard={session?.role === 'user'}>
        <Drawer.Screen name="events" options={{ title: 'Events' }} />
        <Drawer.Screen name="addresses" options={{ title: 'Addresses' }} />
      </Drawer.Protected>
      <Drawer.Protected guard={!!session}>
        <Drawer.Screen name="profile" options={{ title: 'Profile' }} />
        <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
      </Drawer.Protected>
      {/* Information pages (Privacy, Terms and Help open the website instead). */}
      <Drawer.Screen name="about" options={{ title: 'About' }} />
      <Drawer.Screen name="contact" options={{ title: 'Contact us' }} />
      <Drawer.Screen name="delete-account" options={{ title: 'Delete account' }} />
    </Drawer>
  );
}
