import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { errorMessage } from '@/api';
import { USE_REAL_API } from '@/api/config';
import { ThemedText } from '@/components/themed-text';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { DayPicker } from '@/components/ui/day-picker';
import { Select, type SelectOption } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useServiceTypes, useStoreCategories, useUpdateStoreSettings } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { timeOptions, toMinutes } from '@/lib/date';
import { catalogWords, ORDER_TYPE_LABEL, orderTypeChoices } from '@/lib/order-types';
import { cleanServiceType, MAX_SERVICE_TYPE_LENGTH } from '@/lib/service-types';
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

// The "Other" choice in the type-of-service and category lists; the store then types its own.
const OTHER = '__other__';

type Draft = Omit<StoreSettings, 'maxPerSlot' | 'maxPerBooking' | 'maxServiceQty'> & {
  maxPerSlot: string;
  maxPerBooking: string;
  maxServiceQty: string;
  /** What the store typed after choosing Other (type of service / category). */
  otherType: string;
  otherCategory: string;
};
type FieldErrors = Partial<
  Record<
    | 'name'
    | 'maxPerSlot'
    | 'maxPerBooking'
    | 'maxServiceQty'
    | 'closeAt'
    | 'openDays'
    | 'serviceType'
    | 'otherType'
    | 'storeCategory'
    | 'otherCategory',
    string
  >
>;

/** The chosen list entry, or the store's own text for Other. */
const choiceValue = (value: string | null, other: string) => (value === OTHER ? cleanServiceType(other) : value);

/** The error for the Other text box, if Other is chosen. */
function otherError(value: string | null, other: string, noun: string) {
  if (value !== OTHER) return undefined;
  if (!cleanServiceType(other)) return `Enter your ${noun}.`;
  return cleanServiceType(other).length > MAX_SERVICE_TYPE_LENGTH
    ? `Use at most ${MAX_SERVICE_TYPE_LENGTH} characters.`
    : undefined;
}

const toDraft = (store: Store): Draft => ({
  name: store.name,
  maxPerSlot: String(store.maxPerSlot),
  maxPerBooking: String(store.maxPerBooking),
  maxServiceQty: String(store.maxServiceQty),
  limitUnit: store.limitUnit,
  autoApprove: store.autoApprove,
  openAt: store.openAt,
  closeAt: store.closeAt,
  openDays: store.openDays,
  isDarkStore: store.isDarkStore,
  catalogType: store.catalogType,
  serviceType: store.serviceType,
  otherType: '',
  storeCategory: store.storeCategory,
  otherCategory: '',
});

const positiveInt = (value: string) => (/^\d+$/.test(value) && Number(value) >= 1 ? Number(value) : null);

export function StoreSettingsForm({ store }: { store: Store }) {
  const [draft, setDraft] = useState(() => toDraft(store));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<BannerMessage | null>(null);
  const update = useUpdateStoreSettings(store.id);
  const serviceTypes = useServiceTypes();
  const storeCategories = useStoreCategories();
  const words = catalogWords(draft.catalogType);
  const isService = draft.catalogType === 'service';
  // Visit types (Book table, Pickup, Book appointment) need the store's address.
  const offered = orderTypeChoices({ ...draft, profile: store.profile });
  const needAddress = orderTypeChoices(draft).filter((type) => !offered.includes(type));

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
      openDays: draft.openDays.length ? undefined : 'Choose at least one day.',
      // Service stores need a type of service, product stores a category (each may be their own: Other).
      serviceType: !isService || draft.serviceType ? undefined : 'Choose the type of service you provide.',
      otherType: isService ? otherError(draft.serviceType, draft.otherType, 'type of service') : undefined,
      storeCategory: isService || draft.storeCategory ? undefined : "Choose your store's category.",
      otherCategory: isService ? undefined : otherError(draft.storeCategory, draft.otherCategory, 'category'),
    };
    setErrors(next);
    if (!maxPerSlot || !maxPerBooking || !maxServiceQty || Object.values(next).some(Boolean)) return;

    const { otherType, otherCategory, ...settings } = draft;
    // Only the field for the store's type changes; the other keeps whatever was saved before.
    const serviceType = isService ? choiceValue(draft.serviceType, otherType) : store.serviceType;
    const storeCategory = isService ? store.storeCategory : choiceValue(draft.storeCategory, otherCategory);
    update.mutate(
      {
        ...settings,
        name: draft.name.trim(),
        maxPerSlot,
        maxPerBooking,
        maxServiceQty,
        serviceType,
        storeCategory,
      },
      {
        onSuccess: (saved) => {
          // An Other entry is now in the list under its saved name.
          setDraft((d) => ({
            ...d,
            serviceType: saved.serviceType,
            otherType: '',
            storeCategory: saved.storeCategory,
            otherCategory: '',
          }));
          setMessage({ type: 'success', text: 'Settings saved.' });
        },
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
      <DayPicker
        label="Open days"
        value={draft.openDays}
        onChange={(v) => {
          set('openDays', v);
          setErrors((e) => ({ ...e, openDays: undefined }));
        }}
        error={errors.openDays}
        hint="Customers can only book on these days."
      />
      <View style={styles.field}>
        <Select
          label="Store type"
          value={draft.catalogType}
          options={CATALOG_TYPES}
          onChange={(v) => set('catalogType', v)}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Customers see {words.items} and can choose: {offered.map((type) => ORDER_TYPE_LABEL[type]).join(', ')}.
          {needAddress.length
            ? ` Add your address in Profile to offer ${needAddress.map((type) => ORDER_TYPE_LABEL[type]).join(' and ')}.`
            : ''}
        </ThemedText>
      </View>
      {isService ? (
        <ListChoice
          label="Type of service"
          otherLabel="Your type of service"
          names={serviceTypes.data}
          loading={serviceTypes.isLoading}
          loadError={serviceTypes.isError ? errorMessage(serviceTypes.error) : undefined}
          saved={store.serviceType}
          value={draft.serviceType}
          other={draft.otherType}
          onChange={(v) => {
            set('serviceType', v);
            setErrors((e) => ({ ...e, serviceType: undefined }));
          }}
          onOther={(v) => {
            set('otherType', v);
            setErrors((e) => ({ ...e, otherType: undefined }));
          }}
          error={errors.serviceType}
          otherError={errors.otherType}
        />
      ) : (
        <ListChoice
          label="Category"
          otherLabel="Your category"
          names={storeCategories.data}
          loading={storeCategories.isLoading}
          loadError={storeCategories.isError ? errorMessage(storeCategories.error) : undefined}
          saved={store.storeCategory}
          value={draft.storeCategory}
          other={draft.otherCategory}
          onChange={(v) => {
            set('storeCategory', v);
            setErrors((e) => ({ ...e, storeCategory: undefined }));
          }}
          onOther={(v) => {
            set('otherCategory', v);
            setErrors((e) => ({ ...e, otherCategory: undefined }));
          }}
          error={errors.storeCategory}
          otherError={errors.otherCategory}
        />
      )}
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

type ListChoiceProps = {
  label: string;
  otherLabel: string;
  /** The shared list (undefined while loading). */
  names: string[] | undefined;
  loading: boolean;
  loadError?: string;
  /** The store's saved value, kept selectable even if the admin removed it from the list. */
  saved: string | null;
  value: string | null;
  other: string;
  onChange(value: string): void;
  onOther(text: string): void;
  error?: string;
  otherError?: string;
};

/** A shared list (type of service, category) plus "Other…", which opens a text box for the store's own entry. */
function ListChoice({
  label,
  otherLabel,
  names,
  loading,
  loadError,
  saved,
  value,
  other,
  onChange,
  onOther,
  error,
  otherError,
}: ListChoiceProps) {
  const listed = names ?? [];
  const options: SelectOption<string>[] = [...(saved && !listed.includes(saved) ? [saved] : []), ...listed].map(
    (name) => ({ label: name, value: name }),
  );
  return (
    <>
      <View style={styles.field}>
        <Select
          label={label}
          placeholder={loading ? 'Loading…' : 'Choose one'}
          value={value ?? undefined}
          options={[...options, { label: 'Other…', value: OTHER }]}
          onChange={onChange}
          error={error}
        />
        {!error ? (
          <ThemedText type="small" themeColor="textSecondary">
            {loadError ? `The list couldn't be loaded: ${loadError}` : 'Shown to customers with your store.'}
          </ThemedText>
        ) : null}
      </View>
      {value === OTHER ? (
        <TextField
          label={otherLabel}
          value={other}
          onChangeText={onOther}
          error={otherError}
          hint="It's added to the list for every store."
        />
      ) : null}
    </>
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
