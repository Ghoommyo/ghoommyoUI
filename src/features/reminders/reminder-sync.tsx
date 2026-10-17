import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/auth/session';
import {
  addReminderResponseListener,
  clearReminders,
  REMINDERS_SUPPORTED,
  setupReminders,
  syncReminders,
} from '@/features/reminders/reminders';
import { useReminderSettings } from '@/features/reminders/use-reminder-settings';
import { useReminderBookings } from '@/hooks/queries';
import type { Role } from '@/types/domain';

/**
 * Keeps the scheduled booking reminders in step with the setting and the account's accepted
 * bookings. Renders nothing. Native only: on web it's a no-op.
 */
export function ReminderSync() {
  const { session } = useSession();

  // Snooze/Close buttons work for whoever is signed in (or not).
  useEffect(() => {
    if (!REMINDERS_SUPPORTED) return;
    setupReminders().catch((error) => console.warn('Reminder setup failed', error));
    return addReminderResponseListener();
  }, []);

  if (!REMINDERS_SUPPORTED || !session) return null;
  // Keyed by account: switching accounts clears and reschedules.
  return <AccountReminders key={session.accountId} role={session.role} />;
}

function AccountReminders({ role }: { role: Role }) {
  const settings = useReminderSettings();
  const enabled = !!settings.data?.enabled;
  const bookings = useReminderBookings(enabled);
  const { refetch } = bookings;

  useEffect(() => {
    if (!settings.data) return;
    if (enabled && !bookings.data) return; // wait for the bookings
    syncReminders(bookings.data ?? [], settings.data, role).catch((error) =>
      console.warn('Scheduling reminders failed', error),
    );
  }, [settings.data, enabled, bookings.data, role]);

  // Bookings can be accepted while the app is in the background: refresh on return.
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });
    return () => sub.remove();
  }, [enabled, refetch]);

  // Signing out (or switching account) removes this account's reminders.
  useEffect(() => () => void clearReminders(), []);

  return null;
}
