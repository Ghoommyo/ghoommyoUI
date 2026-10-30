import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { USE_REAL_API } from '@/api/config';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ImageField } from '@/components/ui/image-field';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { StoreMap } from '@/features/profile/store-map';
import { useUpdateStoreProfile } from '@/hooks/queries';
import type { Store, StoreProfile } from '@/types/domain';
import { useT } from '@/i18n/language-provider';
import type { MessageKey } from '@/i18n/messages';

type TextKey = Exclude<keyof StoreProfile, 'lat' | 'lng' | 'photoUrl'>;

type Field = {
  key: TextKey;
  label: MessageKey;
  multiline?: boolean;
  numeric?: boolean;
  url?: boolean;
  /** Not stored by the Ghoomo API yet: read-only in API mode. */
  localOnly?: boolean;
};

const FIELDS: Field[] = [
  { key: 'address', label: 'profile.address' },
  { key: 'pin', label: 'profile.pin', numeric: true },
  { key: 'city', label: 'profile.city' },
  { key: 'state', label: 'profile.state', localOnly: true },
  { key: 'country', label: 'profile.country' },
  { key: 'mapUrl', label: 'profile.mapLink', url: true },
  { key: 'bio', label: 'profile.bio', multiline: true },
];

export function StoreProfileForm({ store }: { store: Store }) {
  const { t } = useT();
  const [draft, setDraft] = useState(store.profile);
  const [errors, setErrors] = useState<Partial<Record<TextKey, string>>>({});
  const [message, setMessage] = useState<BannerMessage | null>(null);
  const update = useUpdateStoreProfile(store.id);

  const save = () => {
    const pin = draft.pin.trim();
    const mapUrl = draft.mapUrl?.trim();
    const next = {
      pin: !pin || /^\d{4,10}$/.test(pin) ? undefined : t('profile.pinInvalid'),
      mapUrl:
        !mapUrl || /^https?:\/\/\S+$/.test(mapUrl) ? undefined : t('profile.linkInvalid'),
    };
    setErrors(next);
    if (next.pin || next.mapUrl) return;
    const trimmed = Object.fromEntries(
      Object.entries(draft).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
    ) as StoreProfile;
    update.mutate(trimmed, {
      onSuccess: () => setMessage({ type: 'success', text: t('profile.saved') }),
      onError: (e) => setMessage({ type: 'error', text: errorMessage(e) }),
    });
  };

  return (
    <View style={styles.form}>
      <StoreMap name={store.name} profile={store.profile} />
      <Banner message={message} />
      <ImageField
        label={t('profile.storePhoto')}
        kind="store"
        value={draft.photoUrl}
        onChange={(photoUrl) => {
          setDraft((d) => ({ ...d, photoUrl }));
          setMessage(null);
        }}
        disabled={!store.uploadsEnabled}
        hint={
          store.uploadsEnabled
            ? t('app.storePhotoHint')
            : t('upload.off')
        }
      />
      {FIELDS.map((field) => (
        <TextField
          key={field.key}
          label={t(field.label)}
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
              ? t('hint.readOnly')
              : undefined
          }
        />
      ))}
      <View style={styles.actions}>
        <Button label={t('common.save')} variant="success" onPress={save} loading={update.isPending} />
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
