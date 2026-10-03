import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { StoreMap } from '@/features/profile/store-map';
import { useUpdateStoreProfile } from '@/hooks/queries';
import type { Store, StoreProfile } from '@/types/domain';

type TextKey = Exclude<keyof StoreProfile, 'lat' | 'lng'>;

const FIELDS: { key: TextKey; label: string; multiline?: boolean; numeric?: boolean }[] = [
  { key: 'address', label: 'Address' },
  { key: 'pin', label: 'PIN code', numeric: true },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'bio', label: 'Bio', multiline: true },
];

export function StoreProfileForm({ store }: { store: Store }) {
  const [draft, setDraft] = useState(store.profile);
  const [pinError, setPinError] = useState<string>();
  const [message, setMessage] = useState<BannerMessage | null>(null);
  const update = useUpdateStoreProfile(store.id);

  const save = () => {
    const pin = draft.pin.trim();
    const error = !pin || /^\d{4,10}$/.test(pin) ? undefined : 'PIN code should be 4–10 digits.';
    setPinError(error);
    if (error) return;
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
          value={draft[field.key]}
          onChangeText={(value) => {
            setDraft((d) => ({ ...d, [field.key]: value }));
            setMessage(null);
          }}
          error={field.key === 'pin' ? pinError : undefined}
          multiline={field.multiline}
          keyboardType={field.numeric ? 'number-pad' : 'default'}
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
