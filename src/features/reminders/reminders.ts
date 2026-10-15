import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { formatSlotStart, slotStartToDate } from '@/lib/date';
import type { Booking, ReminderSettings, Role } from '@/types/domain';

// Booking reminders on iOS and Android: an alarm-style local notification (custom sound,
// Snooze / Close buttons) N hours before each accepted booking. Android schedules them with
// AlarmManager exact alarms (SCHEDULE_EXACT_ALARM in app.json); iOS with UNUserNotificationCenter.

export const REMINDERS_SUPPORTED = true;

const CHANNEL = 'booking-reminders';
const CATEGORY = 'booking-reminder';
const SOUND = 'reminder.wav';
const KIND = 'booking-reminder';
export const SNOOZE_ACTION = 'SNOOZE';
export const CLOSE_ACTION = 'CLOSE';
export const SNOOZE_MINUTES = 5;
// iOS keeps at most 64 pending local notifications per app; stay well under it.
const MAX_SCHEDULED = 50;

let setupDone = false;

// Snooze/Close must work even when the app isn't running. On Android a background notification
// task runs for action taps while the app is backgrounded or killed. It's defined in
// `action-task.ts`, which the app entry (`index.ts`) imports so it exists in headless runs too.
export const ACTION_TASK = 'booking-reminder-action';
const handled = new Set<string>();

/** Notification handler, the Android alarm channel and the Snooze/Close buttons. Safe to call repeatedly. */
export async function setupReminders() {
  if (setupDone) return;
  setupDone = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Booking reminders',
      description: 'Alarms before your accepted bookings',
      importance: Notifications.AndroidImportance.MAX,
      sound: SOUND,
      vibrationPattern: [0, 400, 250, 400, 250, 400],
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        flags: { enforceAudibility: true, requestHardwareAudioVideoSynchronization: false },
      },
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
  if (Platform.OS === 'android') {
    await Notifications.registerTaskAsync(ACTION_TASK).catch((e) => console.warn('Reminder action task not registered', e));
  }
  // An action tap that launched the app (cold start) is handled once here.
  const last = await Notifications.getLastNotificationResponseAsync();
  if (last) {
    await handleReminderResponse(last);
    await Notifications.clearLastNotificationResponseAsync();
  }
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    { identifier: SNOOZE_ACTION, buttonTitle: `Snooze ${SNOOZE_MINUTES} min`, options: { opensAppToForeground: false } },
    { identifier: CLOSE_ACTION, buttonTitle: 'Close', options: { opensAppToForeground: false, isDestructive: true } },
  ]);
}

/** Asks for notification permission if needed. Returns whether reminders can be shown. */
export async function ensureReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return asked.granted;
}

async function cancelScheduledReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.kind === KIND)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

function content(booking: Booking, role: Role, hoursBefore: number): Notifications.NotificationContentInput {
  const when = formatSlotStart(booking.slotStart);
  const lead = `in ${hoursBefore} ${hoursBefore === 1 ? 'hour' : 'hours'}`;
  return {
    title: 'Booking reminder',
    body:
      role === 'store'
        ? `${booking.name || 'A customer'} is booked for ${when} (${lead}).`
        : `Your visit to ${booking.storeName} is at ${when} (${lead}).`,
    sound: SOUND,
    categoryIdentifier: CATEGORY,
    data: { kind: KIND, bookingId: booking.id },
    ...(Platform.OS === 'android' ? { priority: Notifications.AndroidNotificationPriority.MAX } : {}),
  };
}

/**
 * Replaces the scheduled reminders: one per accepted booking, `hoursBefore` its start, for the
 * soonest bookings whose reminder time is still ahead. Nothing is scheduled when reminders are off.
 */
export async function syncReminders(bookings: Booking[], settings: ReminderSettings, role: Role) {
  await setupReminders();
  await cancelScheduledReminders();
  if (!settings.enabled) return 0;
  const now = Date.now() + 5_000;
  const due = bookings
    .filter((b) => b.status === 'accepted')
    .map((b) => ({ booking: b, at: slotStartToDate(b.slotStart).getTime() - settings.hoursBefore * 3_600_000 }))
    .filter(({ at }) => at > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_SCHEDULED);
  for (const { booking, at } of due) {
    await Notifications.scheduleNotificationAsync({
      content: content(booking, role, settings.hoursBefore),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: CHANNEL },
    });
  }
  return due.length;
}

export async function clearReminders() {
  await cancelScheduledReminders();
}

/** Snooze re-schedules the same reminder in 5 minutes; Close (or Snooze) dismisses the shown one. */
export async function handleReminderResponse(response: Notifications.NotificationResponse) {
  const { request } = response.notification;
  if (request.content.data?.kind !== KIND) return;
  // The listener, the background task and the cold-start check can all see the same tap.
  const tapKey = `${request.identifier}:${response.actionIdentifier}`;
  if (handled.has(tapKey)) return;
  handled.add(tapKey);
  if (response.actionIdentifier === SNOOZE_ACTION) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: request.content.title ?? 'Booking reminder',
        body: request.content.body ?? '',
        sound: SOUND,
        categoryIdentifier: CATEGORY,
        data: request.content.data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + SNOOZE_MINUTES * 60_000),
        channelId: CHANNEL,
      },
    });
  }
  if (response.actionIdentifier === SNOOZE_ACTION || response.actionIdentifier === CLOSE_ACTION) {
    await Notifications.dismissNotificationAsync(request.identifier);
  }
}

export function addReminderResponseListener() {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handleReminderResponse(response).catch((error) => console.warn('Reminder action failed', error));
  });
  return () => sub.remove();
}
