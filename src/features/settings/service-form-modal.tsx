import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ServiceImage } from '@/components/ui/service-image';
import { Select } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useCreateService, useProductTypes, useUpdateService } from '@/hooks/queries';
import { validateService } from '@/lib/services';
import type { StoreService } from '@/types/domain';

type ServiceFormModalProps = {
  storeId: string;
  /** The service to edit; absent to add a new one. */
  service?: StoreService;
  /** The store's default limit, shown as the placeholder for "Limit per booking". */
  defaultMaxQty: number;
  /** `product` or `service`, by the store type. */
  item: string;
  /** Product stores can tag items with a product type. */
  isProductStore: boolean;
  onClose(): void;
  onSaved(service: StoreService): void;
};

type FieldErrors = ReturnType<typeof validateService>;

/** Add or edit a store's product or service. Mount it only while open. */
export function ServiceFormModal({
  storeId,
  service,
  defaultMaxQty,
  item,
  isProductStore,
  onClose,
  onSaved,
}: ServiceFormModalProps) {
  const productTypes = useProductTypes();
  const [productType, setProductType] = useState<string | null>(service?.productType ?? null);
  // A removed type the item still uses stays selectable.
  const typeNames = [
    ...(productType && !(productTypes.data ?? []).includes(productType) ? [productType] : []),
    ...(productTypes.data ?? []),
  ];
  const create = useCreateService(storeId);
  const update = useUpdateService(storeId);
  const mutation = service ? update : create;
  const [draft, setDraft] = useState({
    name: service?.name ?? '',
    description: service?.description ?? '',
    price: service ? String(service.price) : '',
    imageUrl: service?.imageUrl ?? '',
    maxQty: service?.maxQtyOverride != null ? String(service.maxQtyOverride) : '',
  });
  const [errors, setErrors] = useState<Partial<FieldErrors>>({});

  const set = (key: keyof typeof draft) => (value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const save = () => {
    const next = validateService(draft);
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    const input = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      price: Number(draft.price),
      imageUrl: draft.imageUrl.trim(),
      maxQty: draft.maxQty.trim() ? Number(draft.maxQty) : null,
      productType: isProductStore ? productType : null,
    };
    if (service) update.mutate({ serviceId: service.id, input }, { onSuccess: onSaved });
    else create.mutate(input, { onSuccess: onSaved });
  };

  return (
    <Sheet
      visible
      title={service ? `Edit ${item}` : `Add ${item}`}
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button label="Cancel" variant="secondary" onPress={onClose} />
          <Button label="Save" variant="success" loading={mutation.isPending} onPress={save} />
        </View>
      }>
      <Banner message={mutation.isError ? { type: 'error', text: errorMessage(mutation.error) } : null} />
      <TextField label="Name" value={draft.name} onChangeText={set('name')} error={errors.name} />
      <TextField
        label="Description"
        value={draft.description}
        onChangeText={set('description')}
        placeholder="Shown under the name"
        multiline
      />
      {isProductStore && typeNames.length ? (
        <Select
          label="Product type"
          value={productType ?? ''}
          options={[{ label: 'None', value: '' }, ...typeNames.map((name) => ({ label: name, value: name }))]}
          onChange={(value) => setProductType(value || null)}
        />
      ) : null}
      <TextField
        label="Price (₹)"
        value={draft.price}
        onChangeText={set('price')}
        error={errors.price}
        keyboardType="decimal-pad"
        placeholder="0"
      />
      <View style={styles.imageRow}>
        <ServiceImage uri={draft.imageUrl.trim()} />
        <View style={styles.flex}>
          <TextField
            label="Image URL"
            value={draft.imageUrl}
            onChangeText={set('imageUrl')}
            error={errors.imageUrl}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://…"
            hint="Optional. A placeholder is shown without one."
          />
        </View>
      </View>
      <TextField
        label="Limit per booking"
        value={draft.maxQty}
        onChangeText={set('maxQty')}
        error={errors.maxQty}
        keyboardType="number-pad"
        placeholder={`Default (${defaultMaxQty})`}
        hint={`How many of this ${item} one booking can include. Leave empty for the store default.`}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
});
