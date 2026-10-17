import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { ensureReminderPermission, SNOOZE_MINUTES } from '@/features/reminders/reminders';
import { useReminderSettings, useSaveReminderSettings } from '@/features/reminders/use-reminder-settings';
import { useTheme } from '@/hooks/use-theme';
import type { ReminderSettings } from '@/types/domain';

const PRESETS = [1, 2, 3, 6, 12, 24];
const CUSTOM = 0;

/** "Booking reminders" section of Settings (iOS/Android only; the screen hides it on web). */
export function ReminderSettingsSection() {
  const settings = useReminderSettings();
  if (settings.isLoading || !settings.data) return <ActivityIndicator />;
  return <ReminderSettingsForm initial={settings.data} />;
}

function ReminderSettingsForm({ initial }: { initial: ReminderSettings }) {
  const theme = useTheme();
  const save = useSaveReminderSettings();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [preset, setPreset] = useState(PRESETS.includes(initial.hoursBefore) ? initial.hoursBefore : CUSTOM);
  const [custom, setCustom] = useState(String(initial.hoursBefore));
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<BannerMessage | null>(null);

  const submit = async () => {
    const hoursBefore = preset === CUSTOM ? Number(custom) : preset;
    if (!Number.isInteger(hoursBefore) || hoursBefore < 1 || hoursBefore > 72) {
      setError('Enter a whole number of hours from 1 to 72.');
      return;
    }
    setError(undefined);
    const allowed = enabled ? await ensureReminderPermission() : true;
    save.mutate(
      { enabled, hoursBefore },
      {
        onSuccess: ({ recordedOnServer }) =>
          setMessage(
            !allowed
              ? { type: 'error', text: 'Saved, but notifications are turned off for Ghoomyo. Allow them in the phone settings.' }
              : recordedOnServer
                ? { type: 'success', text: 'Reminder settings saved.' }
                : { type: 'success', text: 'Saved on this phone. It will be recorded on the server next time you save online.' },
          ),
        onError: () => setMessage({ type: 'error', text: "Couldn't save the reminder settings. Try again." }),
      },
    );
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">Booking reminders</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            An alarm before each accepted booking, with Snooze ({SNOOZE_MINUTES} min) and Close.
          </ThemedText>
        </View>
        <Switch
          accessibilityLabel="Booking reminders"
          value={enabled}
          onValueChange={(value) => {
            setEnabled(value);
            setMessage(null);
          }}
          trackColor={{ true: theme.success }}
        />
      </View>
      {enabled ? (
        <>
          <Select
            label="Remind me"
            value={preset}
            options={[
              ...PRESETS.map((h) => ({ label: `${h} ${h === 1 ? 'hour' : 'hours'} before`, value: h })),
              { label: 'Custom…', value: CUSTOM },
            ]}
            onChange={(value) => {
              setPreset(value);
              setMessage(null);
            }}
          />
          {preset === CUSTOM ? (
            <TextField
              label="Hours before (1–72)"
              value={custom}
              onChangeText={(value) => {
                setCustom(value.replace(/\D/g, ''));
                setError(undefined);
              }}
              keyboardType="number-pad"
              error={error}
            />
          ) : null}
        </>
      ) : null}
      <Banner message={message} />
      <View style={styles.actions}>
        <Button label="Save reminders" variant="success" loading={save.isPending} onPress={submit} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
    gap: Spacing.half,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
