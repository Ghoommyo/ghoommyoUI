import type * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { ACTION_TASK, handleReminderResponse } from '@/features/reminders/reminders';

type TaskResponse = Notifications.NotificationResponse & {
  notification: { request: { content: { data?: Record<string, unknown>; dataString?: string } } };
};

// Runs for reminder Snooze/Close taps when the app is in the background or not running (Android).
// Must be defined when the JS bundle starts, so the app entry (index.ts) imports this module.
TaskManager.defineTask(ACTION_TASK, async ({ data, error }) => {
  if (error) return;
  const response = data as TaskResponse | undefined;
  if (!response?.actionIdentifier || !response.notification?.request) return;
  // In the task payload the custom data arrives as a JSON string (`dataString`), not `data`.
  const { content } = response.notification.request;
  if (!content.data && content.dataString) {
    try {
      content.data = JSON.parse(content.dataString);
    } catch {
      return;
    }
  }
  await handleReminderResponse(response);
});
