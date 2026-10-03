import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useUpdateMyProfile } from '@/hooks/queries';
import type { UserProfile } from '@/types/domain';

const MOBILE_PATTERN = /^\+?\d{10,15}$/;

export function UserProfileForm({ profile }: { profile: UserProfile }) {
  const [name, setName] = useState(profile.name);
  const [mobile, setMobile] = useState(profile.mobile);
  const [errors, setErrors] = useState<{ name?: string; mobile?: string }>({});
  const [message, setMessage] = useState<BannerMessage | null>(null);
  const update = useUpdateMyProfile();

  const save = () => {
    const cleanMobile = mobile.replace(/[\s-]/g, '');
    const next = {
      name: name.trim() ? undefined : 'Name is required.',
      mobile:
        !cleanMobile || MOBILE_PATTERN.test(cleanMobile) ? undefined : 'Enter a valid mobile number.',
    };
    setErrors(next);
    if (next.name || next.mobile) return;
    update.mutate(
      { name: name.trim(), mobile: cleanMobile },
      {
        onSuccess: () => setMessage({ type: 'success', text: 'Profile saved.' }),
        onError: (error) => setMessage({ type: 'error', text: errorMessage(error) }),
      },
    );
  };

  return (
    <View style={styles.form}>
      <Banner message={message} />
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoComplete="name"
      />
      <TextField
        label="Mobile"
        value={mobile}
        onChangeText={setMobile}
        error={errors.mobile}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
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
