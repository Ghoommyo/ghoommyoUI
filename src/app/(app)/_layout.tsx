import { Drawer } from 'expo-router/drawer';

import { useSession } from '@/auth/session';
import { SideMenu } from '@/features/side-menu/side-menu';
import { useT } from '@/i18n/language-provider';

export default function AppLayout() {
  const { t } = useT();
  const { session } = useSession();

  return (
    <Drawer
      drawerContent={(props) => <SideMenu {...props} />}
      screenOptions={{ headerShown: false, drawerPosition: 'left', drawerType: 'front' }}>
      <Drawer.Screen name="home" options={{ title: t('menu.home') }} />
      <Drawer.Screen name="dashboard" options={{ title: t('menu.dashboard') }} />
      <Drawer.Screen name="reviews" options={{ title: t('menu.reviews') }} />
      <Drawer.Protected guard={session?.role === 'user'}>
        <Drawer.Screen name="events" options={{ title: t('menu.events') }} />
        <Drawer.Screen name="addresses" options={{ title: t('menu.addresses') }} />
      </Drawer.Protected>
      <Drawer.Protected guard={!!session}>
        <Drawer.Screen name="profile" options={{ title: t('menu.profile') }} />
        <Drawer.Screen name="settings" options={{ title: t('menu.settings') }} />
      </Drawer.Protected>
      {/* Information pages (Privacy, Terms and Help open the website instead). */}
      <Drawer.Screen name="about" options={{ title: t('info.about') }} />
      <Drawer.Screen name="contact" options={{ title: t('info.contact') }} />
      <Drawer.Screen name="delete-account" options={{ title: t('info.deleteAccount') }} />
    </Drawer>
  );
}
