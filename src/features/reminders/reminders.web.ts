// Booking reminders are a phone feature (iOS/Android); on web everything here is a no-op.
import type { Booking, ReminderSettings, Role } from '@/types/domain';

export const REMINDERS_SUPPORTED = false;
export const SNOOZE_MINUTES = 5;

export async function setupReminders() {}
export async function ensureReminderPermission() {
  return false;
}
export async function syncReminders(_bookings: Booking[], _settings: ReminderSettings, _role: Role) {
  return 0;
}
export async function clearReminders() {}
export function addReminderResponseListener() {
  return () => {};
}
