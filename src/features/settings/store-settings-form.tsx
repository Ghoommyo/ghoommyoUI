import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Select, type SelectOption } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useUpdateStoreSettings } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { timeOptions, toMinutes } from '@/lib/date';
import type { LimitUnit, Store, StoreSettings } from '@/types/domain';

const LIMIT_UNITS: SelectOption<LimitUnit>[] = [
  { label: 'Day', value: 'day' },
  { label: 'Hour', value: 'hour' },
  { label: 'Half hour', value: 'halfHour' },
];

type Draft = Omit<StoreSettings, 'maxPerSlot' | 'maxPerBooking'> & {
  maxPerSlot: string;
  maxPerBooking: string;
};
type FieldErrors = Partial<Record<'name' | 'maxPerSlot' | 'maxPerBooking' | 'closeAt', string>>;

const toDraft = (store: Store): Draft => ({
  name: store.name,
  maxPerSlot: String(store.maxPerSlot),
  maxPerBooking: String(store.maxPerBooking),
  limitUnit: store.limitUnit,
  autoApprove: store.autoApprove,
  openAt: store.openAt,
  closeAt: store.closeAt,
});

const positiveInt = (value: string) => (/^\d+$/.test(value) && Number(value) >= 1 ? Number(value) : null);

export function StoreSettingsForm({ store }: { store: Store }) {
  const theme = useTheme();
  const [draft, setDraft] = useState(() => toDraft(store));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<BannerMessage | null>(null);
  const update = useUpdateStoreSettings(store.id);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setMessage(null);
  };

  const save = () => {
    const maxPerSlot = positiveInt(draft.maxPerSlot);
    const maxPerBooking = positiveInt(draft.maxPerBooking);
    const next: FieldErrors = {
      name: draft.name.trim() ? undefined : 'Store name is required.',
      maxPerSlot: maxPerSlot ? undefined : 'Enter a whole number of at least 1.',
      maxPerBooking: maxPerBooking ? undefined : 'Enter a whole number of at least 1.',
      closeAt:
        toMinutes(draft.closeAt) > toMinutes(draft.openAt)
          ? undefined
          : 'Closing time must be after opening time.',
    };
    setErrors(next);
    if (!maxPerSlot || !maxPerBooking || Object.values(next).some(Boolean)) return;

    update.mutate(
      { ...draft, name: draft.name.trim(), maxPerSlot, maxPerBooking },
      {
        onSuccess: () => setMessage({ type: 'success', text: 'Settings saved.' }),
        onError: (error) => setMessage({ type: 'error', text: errorMessage(error) }),
      },
    );
  };

  const cancel = () => {
    setDraft(toDraft(store));
    setErrors({});
    setMessage(null);
  };

  return (
    <View style={styles.form}>
      <Banner message={message} />
      <TextField
        label="Store name"
        value={draft.name}
        onChangeText={(v) => set('name', v)}
        error={errors.name}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label="Max limit per unit"
            value={draft.maxPerSlot}
            onChangeText={(v) => set('maxPerSlot', v)}
            error={errors.maxPerSlot}
            keyboardType="number-pad"
          />
        </View>
        <Select
          label="Limit unit"
          value={draft.limitUnit}
          options={LIMIT_UNITS}
          onChange={(v) => set('limitUnit', v)}
          style={styles.flex}
        />
      </View>
      <TextField
        label="Max limit per booking"
        value={draft.maxPerBooking}
        onChangeText={(v) => set('maxPerBooking', v)}
        error={errors.maxPerBooking}
        keyboardType="number-pad"
      />
      <View style={styles.row}>
        <Select
          label="Open at"
          value={draft.openAt}
          options={timeOptions(0, 1410)}
          onChange={(v) => set('openAt', v)}
          style={styles.flex}
        />
        <Select
          label="Close at"
          value={draft.closeAt}
          options={timeOptions(30, 1440)}
          onChange={(v) => set('closeAt', v)}
          error={errors.closeAt}
          style={styles.flex}
        />
      </View>
      <View style={[styles.switchRow, { borderColor: theme.border }]}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">Auto approve</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Accept new bookings without reviewing them.
          </ThemedText>
        </View>
        <Switch
          accessibilityLabel="Auto approve"
          value={draft.autoApprove}
          onValueChange={(v) => set('autoApprove', v)}
          trackColor={{ true: theme.success }}
        />
      </View>
      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={cancel} />
        <Button label="Save" variant="success" onPress={save} loading={update.isPending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
  },
});
