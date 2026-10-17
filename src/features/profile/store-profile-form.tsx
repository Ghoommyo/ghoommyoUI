import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { USE_REAL_API } from '@/api/config';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { StoreMap } from '@/features/profile/store-map';
import { useUpdateStoreProfile } from '@/hooks/queries';
import type { Store, StoreProfile } from '@/types/domain';

type TextKey = Exclude<keyof StoreProfile, 'lat' | 'lng'>;

type Field = {
  key: TextKey;
  label: string;
  multiline?: boolean;
  numeric?: boolean;
  url?: boolean;
  /** Not stored by the Ghoomo API yet: read-only in API mode. */
  localOnly?: boolean;
};

const FIELDS: Field[] = [
  { key: 'address', label: 'Address' },
  { key: 'pin', label: 'PIN code', numeric: true },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State', localOnly: true },
  { key: 'country', label: 'Country' },
  { key: 'mapUrl', label: 'Map link', url: true },
  { key: 'bio', label: 'Bio', multiline: true },
];

export function StoreProfileForm({ store }: { store: Store }) {
  const [draft, setDraft] = useState(store.profile);
  const [errors, setErrors] = useState<Partial<Record<TextKey, string>>>({});
  const [message, setMessage] = useState<BannerMessage | null>(null);
  const update = useUpdateStoreProfile(store.id);

  const save = () => {
    const pin = draft.pin.trim();
    const mapUrl = draft.mapUrl?.trim();
    const next = {
      pin: !pin || /^\d{4,10}$/.test(pin) ? undefined : 'PIN code should be 4–10 digits.',
      mapUrl:
        !mapUrl || /^https?:\/\/\S+$/.test(mapUrl) ? undefined : 'Enter a link starting with https://',
    };
    setErrors(next);
    if (next.pin || next.mapUrl) return;
    const trimmed = Object.fromEntries(
      Object.entries(draft).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
    ) as StoreProfile;
    update.mutate(trimmed, {
      onSuccess: () => setMessage({ type: 'success', text: 'Profile saved.' }),
      onError: (e) => setMessage({ type: 'error', text: errorMessage(e) }),
    });
  };

  return (
    <View style={styles.form}>
      <StoreMap name={store.name} profile={store.profile} />
      <Banner message={message} />
      {FIELDS.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          value={draft[field.key] ?? ''}
          onChangeText={(value) => {
            setDraft((d) => ({ ...d, [field.key]: value }));
            setMessage(null);
          }}
          error={errors[field.key]}
          multiline={field.multiline}
          keyboardType={field.numeric ? 'number-pad' : field.url ? 'url' : 'default'}
          autoCapitalize={field.url ? 'none' : undefined}
          placeholder={field.url ? 'https://maps.google.com/…' : undefined}
          editable={!(USE_REAL_API && field.localOnly)}
          hint={
            USE_REAL_API && field.localOnly
              ? "Can't be changed yet — the server doesn't support it."
              : undefined
          }
        />
      ))}
      <View style={styles.actions}>
        <Button label="Save" variant="success" onPress={save} loading={update.isPending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
