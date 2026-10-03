import { useSession } from '@/auth/session';
import { StoreDashboard } from '@/features/store-dashboard/store-dashboard';
import { UserDashboard } from '@/features/user-dashboard/user-dashboard';

/** Stores manage their bookings; users and guests browse and book. */
export default function DashboardScreen() {
  const { session } = useSession();
  return session?.role === 'store' ? <StoreDashboard /> : <UserDashboard />;
}
