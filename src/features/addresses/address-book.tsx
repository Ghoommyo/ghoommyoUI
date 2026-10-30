import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAddresses, useDeleteAddress, useSaveAddress } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import type { SavedAddress } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

const MAX_ADDRESS_LENGTH = 500;
const MAX_LABEL_LENGTH = 40;
const MAX_ADDRESSES = 20;

/** The customer's saved delivery addresses: list, add, edit and delete. */
export function AddressBook() {
  const { t } = useT();
  const theme = useTheme();
  const addresses = useAddresses();
  const remove = useDeleteAddress();
  // `null` = closed, `'new'` = adding, otherwise the address being edited.
  const [editing, setEditing] = useState<SavedAddress | 'new' | null>(null);
  const [deleting, setDeleting] = useState<SavedAddress | null>(null);
  const [message, setMessage] = useState<BannerMessage | null>(null);
  const full = (addresses.data?.length ?? 0) >= MAX_ADDRESSES;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <ThemedText type="smallBold" accessibilityRole="header">
            {t('addresses.saved')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('addresses.intro')}
          </ThemedText>
        </View>
        <Button
          label={t('addresses.addTitle')}
          disabled={full}
          onPress={() => {
            setMessage(null);
            setEditing('new');
          }}
        />
      </View>
      {full ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('addresses.full', { count: MAX_ADDRESSES })}
        </ThemedText>
      ) : null}
      <Banner message={remove.isError ? { type: 'error', text: errorMessage(remove.error) } : message} />

      {addresses.isLoading ? (
        <ActivityIndicator style={styles.empty} />
      ) : addresses.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(addresses.error) }} />
      ) : !addresses.data?.length ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          {t('addresses.empty')}
        </ThemedText>
      ) : (
        addresses.data.map((address) => (
          <View key={address.id} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
            {address.label ? <ThemedText type="smallBold">{address.label}</ThemedText> : null}
            <ThemedText>{address.address}</ThemedText>
            <View style={styles.rowActions}>
              <Button
                label={t('common.edit')}
                variant="secondary"
                size="sm"
                accessibilityLabel={t('app.editNamed', { name: address.label || t('profile.address') })}
                onPress={() => {
                  setMessage(null);
                  setEditing(address);
                }}
              />
              <Button
                label={t('common.delete')}
                variant="danger"
                size="sm"
                accessibilityLabel={t('app.deleteNamed', { name: address.label || t('profile.address') })}
                loading={remove.isPending && remove.variables === address.id}
                onPress={() => {
                  setMessage(null);
                  setDeleting(address);
                }}
              />
            </View>
          </View>
        ))
      )}

      {editing ? (
        <AddressFormSheet
          address={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setMessage({ type: 'success', text: editing === 'new' ? t('addresses.added') : t('addresses.savedMessage') });
            setEditing(null);
          }}
        />
      ) : null}
      <ConfirmModal
        visible={!!deleting}
        title={t('addresses.deleteTitle')}
        message={t('addresses.deleteMessage', { name: deleting?.label || deleting?.address.slice(0, 60) || '' })}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const address = deleting!;
          setDeleting(null);
          remove.mutate(address.id, {
            onSuccess: () => setMessage({ type: 'success', text: t('addresses.deleted') }),
          });
        }}
      />
    </View>
  );
}

/** Add or edit an address. Mount it only while open. */
function AddressFormSheet({
  address,
  onClose,
  onSaved,
}: {
  address: SavedAddress | null;
  onClose(): void;
  onSaved(): void;
}) {
  const { t } = useT();
  const save = useSaveAddress();
  const [label, setLabel] = useState(address?.label ?? '');
  const [text, setText] = useState(address?.address ?? '');
  const [errors, setErrors] = useState<{ label?: string; address?: string }>({});

  const submit = () => {
    const next = {
      label: label.trim().length > MAX_LABEL_LENGTH ? t('book.addressTooLong', { count: MAX_LABEL_LENGTH }) : undefined,
      address: !text.trim()
        ? t('addresses.required')
        : text.trim().length > MAX_ADDRESS_LENGTH
          ? t('book.addressTooLong', { count: MAX_ADDRESS_LENGTH })
          : undefined,
    };
    setErrors(next);
    if (next.label || next.address) return;
    save.mutate({ input: { label, address: text }, addressId: address?.id }, { onSuccess: onSaved });
  };

  return (
    <Sheet
      visible
      title={address ? t('addresses.editTitle') : t('addresses.addTitle')}
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
          <Button label={t('common.save')} variant="success" loading={save.isPending} onPress={submit} />
        </View>
      }>
      <Banner message={save.isError ? { type: 'error', text: errorMessage(save.error) } : null} />
      <TextField
        label={t('addresses.label')}
        value={label}
        onChangeText={(value) => {
          setLabel(value);
          setErrors((e) => ({ ...e, label: undefined }));
        }}
        placeholder={t('addresses.labelPlaceholder')}
        hint={t('addresses.labelHint')}
        error={errors.label}
      />
      <TextField
        label={t('profile.address')}
        value={text}
        onChangeText={(value) => {
          setText(value);
          setErrors((e) => ({ ...e, address: undefined }));
        }}
        placeholder={t('book.addressPlaceholder')}
        error={errors.address}
        multiline
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  row: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  rowActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
