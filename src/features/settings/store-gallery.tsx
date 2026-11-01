import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { ImageField, storePictureRules } from '@/components/ui/image-field';
import { ServiceImage } from '@/components/ui/service-image';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useDeleteGalleryImage, useMyGallery, useSaveGalleryImage } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import type { GalleryImage, Store } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

/** Must match MAX_GALLERY_IMAGES on the server (app/util/galleryUtil.tsx in the website repo). */
export const MAX_GALLERY_IMAGES = 20;
const MAX_CAPTION_LENGTH = 200;

/** The store's gallery (shown on its store page): add, edit and delete pictures. Only once the admin turned it on. */
export function StoreGallery({ store }: { store: Store }) {
  const { t } = useT();
  const theme = useTheme();
  const gallery = useMyGallery(store.id);
  const remove = useDeleteGalleryImage(store.id);
  // `null` = closed, `'new'` = adding, otherwise the picture being edited.
  const [editing, setEditing] = useState<GalleryImage | 'new' | null>(null);
  const [deleting, setDeleting] = useState<GalleryImage | null>(null);
  const count = gallery.data?.length ?? 0;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <ThemedText type="subtitle" style={styles.title}>
            {t('gallery.title')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('gallery.hint', { count, max: MAX_GALLERY_IMAGES })}
          </ThemedText>
        </View>
        <Button
          label={t('gallery.add')}
          disabled={!gallery.data || count >= MAX_GALLERY_IMAGES}
          onPress={() => setEditing('new')}
        />
      </View>
      <Banner message={remove.isError ? { type: 'error', text: errorMessage(remove.error) } : null} />

      {gallery.isLoading ? (
        <ActivityIndicator />
      ) : gallery.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(gallery.error) }} />
      ) : !count ? (
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          {t('gallery.empty')}
        </ThemedText>
      ) : (
        gallery.data?.map((image) => (
          <View key={image.id} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
            <ServiceImage uri={image.imageUrl} size={72} />
            <View style={styles.flex}>
              <ThemedText themeColor={image.caption ? 'text' : 'textSecondary'}>
                {image.caption || t('gallery.noCaption')}
              </ThemedText>
              <View style={styles.actions}>
                <Button label={t('common.edit')} variant="secondary" size="sm" onPress={() => setEditing(image)} />
                <Button
                  label={t('common.delete')}
                  variant="danger"
                  size="sm"
                  loading={remove.isPending && remove.variables === image.id}
                  onPress={() => setDeleting(image)}
                />
              </View>
            </View>
          </View>
        ))
      )}

      {editing ? (
        <GalleryFormModal image={editing === 'new' ? null : editing} store={store} onClose={() => setEditing(null)} />
      ) : null}
      <ConfirmModal
        visible={!!deleting}
        title={t('gallery.deleteTitle')}
        message={t('gallery.deleteMessage')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
          setDeleting(null);
        }}
      />
    </View>
  );
}

function GalleryFormModal({ image, store, onClose }: { image: GalleryImage | null; store: Store; onClose(): void }) {
  const { t } = useT();
  const save = useSaveGalleryImage(store.id);
  const [imageUrl, setImageUrl] = useState(image?.imageUrl ?? '');
  const [caption, setCaption] = useState(image?.caption ?? '');
  const [errors, setErrors] = useState<{ imageUrl?: string; caption?: string }>({});

  const submit = () => {
    const url = imageUrl.trim();
    const next = {
      imageUrl: !url ? t('gallery.pictureRequired') : /^https?:\/\/\S+$/.test(url) ? undefined : t('upload.linkInvalid'),
      caption:
        caption.trim().length <= MAX_CAPTION_LENGTH ? undefined : t('gallery.captionTooLong', { count: MAX_CAPTION_LENGTH }),
    };
    setErrors(next);
    if (next.imageUrl || next.caption) return;
    save.mutate({ imageId: image?.id, input: { imageUrl: url, caption: caption.trim() } }, { onSuccess: onClose });
  };

  return (
    <Sheet
      visible
      title={t(image ? 'gallery.editTitle' : 'gallery.addTitle')}
      onClose={onClose}
      footer={
        <View style={styles.footer}>
          <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
          <Button label={t('common.save')} variant="success" loading={save.isPending} onPress={submit} />
        </View>
      }>
      <Banner message={save.isError ? { type: 'error', text: errorMessage(save.error) } : null} />
      <ImageField
        label={t('gallery.picture')}
        kind="gallery"
        value={imageUrl.trim()}
        onChange={(url) => {
          setImageUrl(url);
          setErrors((e) => ({ ...e, imageUrl: undefined }));
        }}
        {...storePictureRules(store, t, 'gallery.pictureHint')}
        linkError={errors.imageUrl}
      />
      {/* Without the link box, a missing picture is reported here. */}
      {!store.linksEnabled && errors.imageUrl ? <Banner message={{ type: 'error', text: errors.imageUrl }} /> : null}
      <TextField
        label={t('gallery.caption')}
        value={caption}
        onChangeText={(value) => {
          setCaption(value);
          setErrors((e) => ({ ...e, caption: undefined }));
        }}
        error={errors.caption}
        hint={t('gallery.captionHint')}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
  },
  flex: {
    flex: 1,
    gap: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
