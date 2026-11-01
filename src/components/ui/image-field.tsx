import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ServiceImage } from '@/components/ui/service-image';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useUploadImage } from '@/hooks/queries';
import { pickImage } from '@/lib/pick-image';
import type { ImageKind, StoreSettings } from '@/types/domain';
import { useT } from '@/i18n/language-provider';
import type { MessageKey } from '@/i18n/messages';
import type { Translate } from '@/i18n/translate';

/**
 * What a store may do with a picture field: upload when the admin turned uploads on, paste a link
 * when it turned image links on. `hintKey` is the hint shown while uploads are on.
 */
export function storePictureRules(store: Pick<StoreSettings, 'uploadsEnabled' | 'linksEnabled'>, t: Translate, hintKey: MessageKey) {
  const uploads = !!store.uploadsEnabled;
  const links = !!store.linksEnabled;
  return { disabled: !uploads, linkAllowed: links, hint: t(uploads ? hintKey : links ? 'upload.linkOnly' : 'upload.off') };
}

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
  /** Also offer a box to paste a picture link (stores the admin allowed to use links). */
  linkAllowed?: boolean;
  /** An error for the pasted link, from the form's own check. */
  linkError?: string;
};

/** Pick, shrink and upload a picture, with a preview. */
export function ImageField({
  label,
  kind,
  value,
  onChange,
  round = false,
  name = '',
  disabled = false,
  hint,
  linkAllowed = false,
  linkError,
}: ImageFieldProps) {
  const { t } = useT();
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
            label={t(value ? 'upload.change' : 'upload.choose')}
            variant="secondary"
            size="sm"
            loading={busy}
            disabled={disabled}
            accessibilityLabel={t(value ? 'upload.changeNamed' : 'upload.chooseNamed', { label: label.toLowerCase() })}
            onPress={() => choose('library')}
          />
          {Platform.OS !== 'web' ? (
            <Button
              label={t('app.takePhoto')}
              variant="secondary"
              size="sm"
              disabled={disabled || busy}
              accessibilityLabel={t('app.takeNamed', { label: label.toLowerCase() })}
              onPress={() => choose('camera')}
            />
          ) : null}
          {value ? (
            <Button
              label={t('upload.remove')}
              variant="danger"
              size="sm"
              disabled={busy}
              accessibilityLabel={t('upload.removeNamed', { label: label.toLowerCase() })}
              onPress={() => {
                upload.reset();
                setPickError(null);
                onChange('');
              }}
            />
          ) : null}
        </View>
      </View>
      {linkAllowed ? (
        <TextField
          label={t('upload.link')}
          value={value}
          onChangeText={(url) => {
            upload.reset();
            setPickError(null);
            onChange(url);
          }}
          error={linkError}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="https://…"
        />
      ) : null}
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
