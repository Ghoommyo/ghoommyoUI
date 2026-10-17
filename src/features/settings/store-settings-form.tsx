import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { errorMessage } from '@/api';
import { USE_REAL_API } from '@/api/config';
import { ThemedText } from '@/components/themed-text';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Select, type SelectOption } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useUpdateStoreSettings } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { timeOptions, toMinutes } from '@/lib/date';
import { catalogWords, ORDER_TYPE_LABEL, orderTypeChoices } from '@/lib/order-types';
import type { CatalogType, LimitUnit, Store, StoreSettings } from '@/types/domain';

// Fields the Ghoomo API can't store yet are shown read-only in API mode (see API_DEFAULTS).
const NOT_SAVED_HINT = "Can't be changed yet — the server doesn't support it.";

const LIMIT_UNITS: SelectOption<LimitUnit>[] = [
  { label: 'Day', value: 'day' },
  { label: 'Hour', value: 'hour' },
  { label: 'Half hour', value: 'halfHour' },
];

const CATALOG_TYPES: SelectOption<CatalogType>[] = [
  { label: 'Product', value: 'product' },
  { label: 'Service', value: 'service' },
];

type Draft = Omit<StoreSettings, 'maxPerSlot' | 'maxPerBooking' | 'maxServiceQty'> & {
  maxPerSlot: string;
  maxPerBooking: string;
  maxServiceQty: string;
};
type FieldErrors = Partial<Record<'name' | 'maxPerSlot' | 'maxPerBooking' | 'maxServiceQty' | 'closeAt', string>>;

const toDraft = (store: Store): Draft => ({
  name: store.name,
  maxPerSlot: String(store.maxPerSlot),
  maxPerBooking: String(store.maxPerBooking),
  maxServiceQty: String(store.maxServiceQty),
  limitUnit: store.limitUnit,
  autoApprove: store.autoApprove,
  openAt: store.openAt,
  closeAt: store.closeAt,
  isDarkStore: store.isDarkStore,
  catalogType: store.catalogType,
});

const positiveInt = (value: string) => (/^\d+$/.test(value) && Number(value) >= 1 ? Number(value) : null);

export function StoreSettingsForm({ store }: { store: Store }) {
  const [draft, setDraft] = useState(() => toDraft(store));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<BannerMessage | null>(null);
  const update = useUpdateStoreSettings(store.id);
  const words = catalogWords(draft.catalogType);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setMessage(null);
  };

  const save = () => {
    const maxPerSlot = positiveInt(draft.maxPerSlot);
    const maxPerBooking = positiveInt(draft.maxPerBooking);
    const maxServiceQty = positiveInt(draft.maxServiceQty);
    const next: FieldErrors = {
      name: draft.name.trim() ? undefined : 'Store name is required.',
      maxPerSlot: maxPerSlot ? undefined : 'Enter a whole number of at least 1.',
      maxPerBooking: maxPerBooking ? undefined : 'Enter a whole number of at least 1.',
      maxServiceQty: maxServiceQty ? undefined : 'Enter a whole number of at least 1.',
      closeAt:
        toMinutes(draft.closeAt) > toMinutes(draft.openAt)
          ? undefined
          : 'Closing time must be after opening time.',
    };
    setErrors(next);
    if (!maxPerSlot || !maxPerBooking || !maxServiceQty || Object.values(next).some(Boolean)) return;

    update.mutate(
      { ...draft, name: draft.name.trim(), maxPerSlot, maxPerBooking, maxServiceQty },
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
        editable={!USE_REAL_API}
        hint={USE_REAL_API ? NOT_SAVED_HINT : undefined}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label={draft.isDarkStore ? 'Max orders per unit' : 'Max limit per unit'}
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
        editable={!USE_REAL_API}
        hint={USE_REAL_API ? NOT_SAVED_HINT : undefined}
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
      <View style={styles.field}>
        <Select
          label="Store type"
          value={draft.catalogType}
          options={CATALOG_TYPES}
          onChange={(v) => set('catalogType', v)}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Customers see {words.items} and can choose:{' '}
          {orderTypeChoices(draft)
            .map((type) => ORDER_TYPE_LABEL[type])
            .join(', ')}
          .
        </ThemedText>
      </View>
      <TextField
        label={`Max of each ${words.item} per booking`}
        value={draft.maxServiceQty}
        onChangeText={(v) => set('maxServiceQty', v)}
        error={errors.maxServiceQty}
        keyboardType="number-pad"
        hint={`1 means one of each ${words.item}. Used for ${words.items} without their own limit.`}
      />
      <SwitchRow
        label="Auto approve"
        description="Accept new bookings without reviewing them."
        value={draft.autoApprove}
        onChange={(v) => set('autoApprove', v)}
      />
      <SwitchRow
        label="Dark store"
        description={`No dine-in. Customers don't say how many people are coming, slots count orders, and they can only choose ${
          draft.catalogType === 'service' ? 'Book home visit' : 'Pickup or Porter'
        }.`}
        value={draft.isDarkStore}
        onChange={(v) => set('isDarkStore', v)}
      />
      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={cancel} />
        <Button label="Save" variant="success" onPress={save} loading={update.isPending} />
      </View>
    </View>
  );
}

type SwitchRowProps = { label: string; description: string; value: boolean; onChange(value: boolean): void };

function SwitchRow({ label, description, value, onChange }: SwitchRowProps) {
  const theme = useTheme();
  return (
    <View style={[styles.switchRow, { borderColor: theme.border }]}>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: theme.success }} />
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
  field: {
    gap: Spacing.one,
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
