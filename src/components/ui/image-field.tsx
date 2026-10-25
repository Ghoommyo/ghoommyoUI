import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ServiceImage } from '@/components/ui/service-image';
import { Spacing } from '@/constants/theme';
import { useUploadImage } from '@/hooks/queries';
import { pickImage } from '@/lib/pick-image';
import type { ImageKind } from '@/types/domain';

/** Shown under store photo controls until the app admin turns uploads on. */
export const UPLOADS_OFF_HINT = "Picture uploads aren't turned on for your store yet. Contact support to enable them.";

type ImageFieldProps = {
  label: string;
  kind: ImageKind;
  /** The saved or just-uploaded picture's URL; `''` for none. */
  value: string;
  /** Called with the new URL after an upload, or `''` on Remove. The form's Save stores it. */
  onChange(url: string): void;
  /** Round preview with initials (people), or a square one (items, stores). */
  round?: boolean;
  /** Initials for the round preview without a photo. */
  name?: string;
  /** Uploading isn't allowed (yet); `hint` says why. Remove still works. */
  disabled?: boolean;
  hint?: string;
};

/** Pick, shrink and upload a picture, with a preview. */
export function ImageField({ label, kind, value, onChange, round = false, name = '', disabled = false, hint }: ImageFieldProps) {
  const upload = useUploadImage(kind);
  const [pickError, setPickError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const busy = picking || upload.isPending;

  const choose = async (source: 'library' | 'camera') => {
    setPickError(null);
    upload.reset();
    setPicking(true);
    try {
      const image = await pickImage(source);
      setPicking(false);
      if (image) upload.mutate(image, { onSuccess: onChange });
    } catch (error) {
      setPicking(false);
      setPickError(errorMessage(error));
    }
  };

  const error = pickError ?? (upload.isError ? errorMessage(upload.error) : null);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.row}>
        {round ? <Avatar name={name} uri={value || undefined} size={72} /> : <ServiceImage uri={value} size={72} />}
        <View style={styles.actions}>
          <Button
            label={value ? 'Change photo' : 'Choose photo'}
            variant="secondary"
            size="sm"
            loading={busy}
            disabled={disabled}
            accessibilityLabel={`${value ? 'Change' : 'Choose'} ${label.toLowerCase()}`}
            onPress={() => choose('library')}
          />
          {Platform.OS !== 'web' ? (
            <Button
              label="Take photo"
              variant="secondary"
              size="sm"
              disabled={disabled || busy}
              accessibilityLabel={`Take ${label.toLowerCase()}`}
              onPress={() => choose('camera')}
            />
          ) : null}
          {value ? (
            <Button
              label="Remove"
              variant="danger"
              size="sm"
              disabled={busy}
              accessibilityLabel={`Remove ${label.toLowerCase()}`}
              onPress={() => {
                upload.reset();
                setPickError(null);
                onChange('');
              }}
            />
          ) : null}
        </View>
      </View>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
      <Banner message={error ? { type: 'error', text: error } : null} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
