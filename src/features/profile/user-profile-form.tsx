import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ImageField } from '@/components/ui/image-field';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useUpdateMyProfile } from '@/hooks/queries';
import type { UserProfile } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

const MOBILE_PATTERN = /^\+?\d{10,15}$/;

export function UserProfileForm({ profile }: { profile: UserProfile }) {
  const { t } = useT();
  const [name, setName] = useState(profile.name);
  const [mobile, setMobile] = useState(profile.mobile);
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl);
  const [errors, setErrors] = useState<{ name?: string; mobile?: string }>({});
  const [message, setMessage] = useState<BannerMessage | null>(null);
  const update = useUpdateMyProfile();

  const save = () => {
    const cleanMobile = mobile.replace(/[\s-]/g, '');
    const next = {
      name: name.trim() ? undefined : t('book.nameRequired'),
      mobile:
        !cleanMobile || MOBILE_PATTERN.test(cleanMobile) ? undefined : t('booking.invalidMobile'),
    };
    setErrors(next);
    if (next.name || next.mobile) return;
    update.mutate(
      { name: name.trim(), mobile: cleanMobile, photoUrl },
      {
        onSuccess: () => setMessage({ type: 'success', text: t('profile.saved') }),
        onError: (error) => setMessage({ type: 'error', text: errorMessage(error) }),
      },
    );
  };

  return (
    <View style={styles.form}>
      <Banner message={message} />
      <ImageField
        label={t('profile.photo')}
        kind="user"
        round
        name={name || profile.name}
        value={photoUrl}
        onChange={(url) => {
          setPhotoUrl(url);
          setMessage(null);
        }}
        hint={t('app.saveToKeep')}
      />
      <TextField
        label={t('profile.name')}
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoComplete="name"
      />
      <TextField
        label={t('profile.mobile')}
        value={mobile}
        onChangeText={setMobile}
        error={errors.mobile}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
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
