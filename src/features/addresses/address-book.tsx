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

const MAX_ADDRESS_LENGTH = 500;
const MAX_LABEL_LENGTH = 40;
const MAX_ADDRESSES = 20;

/** The customer's saved delivery addresses: list, add, edit and delete. */
export function AddressBook() {
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
            Saved addresses
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Where stores deliver Porter orders and make home visits.
          </ThemedText>
        </View>
        <Button
          label="Add address"
          disabled={full}
          onPress={() => {
            setMessage(null);
            setEditing('new');
          }}
        />
      </View>
      {full ? (
        <ThemedText type="small" themeColor="textSecondary">
          You can save up to {MAX_ADDRESSES} addresses. Delete one to add another.
        </ThemedText>
      ) : null}
      <Banner message={remove.isError ? { type: 'error', text: errorMessage(remove.error) } : message} />

      {addresses.isLoading ? (
        <ActivityIndicator style={styles.empty} />
      ) : addresses.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(addresses.error) }} />
      ) : !addresses.data?.length ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          No saved addresses yet. Add one here, or tick &quot;Save this address&quot; when you book a Porter
          order or a home visit.
        </ThemedText>
      ) : (
        addresses.data.map((address) => (
          <View key={address.id} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
            {address.label ? <ThemedText type="smallBold">{address.label}</ThemedText> : null}
            <ThemedText>{address.address}</ThemedText>
            <View style={styles.rowActions}>
              <Button
                label="Edit"
                variant="secondary"
                size="sm"
                accessibilityLabel={`Edit ${address.label || 'address'}`}
                onPress={() => {
                  setMessage(null);
                  setEditing(address);
                }}
              />
              <Button
                label="Delete"
                variant="danger"
                size="sm"
                accessibilityLabel={`Delete ${address.label || 'address'}`}
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
            setMessage({ type: 'success', text: editing === 'new' ? 'Address added.' : 'Address saved.' });
            setEditing(null);
          }}
        />
      ) : null}
      <ConfirmModal
        visible={!!deleting}
        title="Delete this address?"
        message={`${deleting?.label || deleting?.address.slice(0, 60) || ''} will be removed. Bookings keep the address they were made with.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const address = deleting!;
          setDeleting(null);
          remove.mutate(address.id, {
            onSuccess: () => setMessage({ type: 'success', text: 'Address deleted.' }),
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
  const save = useSaveAddress();
  const [label, setLabel] = useState(address?.label ?? '');
  const [text, setText] = useState(address?.address ?? '');
  const [errors, setErrors] = useState<{ label?: string; address?: string }>({});

  const submit = () => {
    const next = {
      label: label.trim().length > MAX_LABEL_LENGTH ? `Use at most ${MAX_LABEL_LENGTH} characters.` : undefined,
      address: !text.trim()
        ? 'Address is required.'
        : text.trim().length > MAX_ADDRESS_LENGTH
          ? `Use at most ${MAX_ADDRESS_LENGTH} characters.`
          : undefined,
    };
    setErrors(next);
    if (next.label || next.address) return;
    save.mutate({ input: { label, address: text }, addressId: address?.id }, { onSuccess: onSaved });
  };

  return (
    <Sheet
      visible
      title={address ? 'Edit address' : 'Add address'}
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button label="Cancel" variant="secondary" onPress={onClose} />
          <Button label="Save" variant="success" loading={save.isPending} onPress={submit} />
        </View>
      }>
      <Banner message={save.isError ? { type: 'error', text: errorMessage(save.error) } : null} />
      <TextField
        label="Label"
        value={label}
        onChangeText={(value) => {
          setLabel(value);
          setErrors((e) => ({ ...e, label: undefined }));
        }}
        placeholder="Home, Office…"
        hint="Optional. Shown in the address list when you book."
        error={errors.label}
      />
      <TextField
        label="Address"
        value={text}
        onChangeText={(value) => {
          setText(value);
          setErrors((e) => ({ ...e, address: undefined }));
        }}
        placeholder="House or flat, street, area, city, PIN code"
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
