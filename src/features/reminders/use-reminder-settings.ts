import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { api } from '@/api';
import { useSession } from '@/auth/session';
import { storage } from '@/auth/storage';
import { REMINDERS_SUPPORTED } from '@/features/reminders/reminders';
import type { ReminderSettings } from '@/types/domain';

const DEFAULT: ReminderSettings = { enabled: false, hoursBefore: 1 };
const key = (accountId: string) => `ghoomyo.reminders.${accountId}`;
export const reminderSettingsKey = (accountId: string) => ['me', accountId, 'reminder-settings'] as const;

async function readLocal(accountId: string): Promise<ReminderSettings | null> {
  try {
    const raw = await storage.get(key(accountId));
    return raw ? (JSON.parse(raw) as ReminderSettings) : null;
  } catch {
    return null;
  }
}

/**
 * The reminder setting this device schedules with. It's kept on the device; on a device that
 * has none yet, it's seeded from the server copy (which the server keeps for auditing).
 */
export function useReminderSettings() {
  const { session } = useSession();
  const accountId = session?.accountId ?? '';
  return useQuery({
    queryKey: reminderSettingsKey(accountId),
    queryFn: async () => {
      const local = await readLocal(accountId);
      if (local) return local;
      try {
        const server = await api.getReminderSettings();
        await storage.set(key(accountId), JSON.stringify(server));
        return server;
      } catch {
        return DEFAULT;
      }
    },
    enabled: REMINDERS_SUPPORTED && !!session,
    staleTime: Infinity,
  });
}

/** Saves on the device (what the alarms use), then records it on the server for auditing. */
export function useSaveReminderSettings() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const accountId = session?.accountId ?? '';
  return useMutation({
    mutationFn: async (settings: ReminderSettings) => {
      await storage.set(key(accountId), JSON.stringify(settings));
      const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
      try {
        await api.saveReminderSettings(settings, platform);
        return { settings, recordedOnServer: true };
      } catch {
        // The alarms still work from the device copy; only the audit record is missing.
        return { settings, recordedOnServer: false };
      }
    },
    onSuccess: ({ settings }) => queryClient.setQueryData(reminderSettingsKey(accountId), settings),
  });
}
