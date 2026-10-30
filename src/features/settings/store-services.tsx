import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { ServiceImage } from '@/components/ui/service-image';
import { Spacing } from '@/constants/theme';
import { ServiceFormModal } from '@/features/settings/service-form-modal';
import { useDeleteService, useStoreServices } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { catalogLabels, storeTypeLabel } from '@/lib/order-types';
import { formatPrice } from '@/lib/services';
import type { Store, StoreService } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

/** The store's products or services, which users can add to a booking: list, add, edit, delete. */
export function StoreServices({ store }: { store: Store }) {
  const { t } = useT();
  const words = catalogLabels(t, store.catalogType);
  const theme = useTheme();
  const services = useStoreServices(store.id);
  const remove = useDeleteService(store.id);
  // `null` = closed, `'new'` = adding, otherwise the service being edited.
  const [editing, setEditing] = useState<StoreService | 'new' | null>(null);
  const [deleting, setDeleting] = useState<StoreService | null>(null);
  const [message, setMessage] = useState<BannerMessage | null>(null);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <ThemedText type="subtitle" style={styles.title}>
            {words.Items}
          </ThemedText>
          {storeTypeLabel(store) ? (
            <ThemedText type="small">
              {store.catalogType === 'service' ? t('items.typeOfService') : t('items.category')}:{' '}
              <ThemedText type="smallBold">{storeTypeLabel(store)}</ThemedText>
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {t('items.whatCustomersPick')}
          </ThemedText>
        </View>
        <Button
          label={t('items.add', { item: words.item })}
          onPress={() => {
            setMessage(null);
            setEditing('new');
          }}
        />
      </View>

      <Banner message={message} />

      {services.isLoading ? (
        <ActivityIndicator />
      ) : services.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(services.error) }} />
      ) : !services.data?.length ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          {t('items.empty', { items: words.items })}
        </ThemedText>
      ) : (
        services.data.map((service, i) => (
          <View key={service.id} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.number}>
              {i + 1}
            </ThemedText>
            <ServiceImage uri={service.imageUrl} size={48} />
            <View style={styles.details}>
              <View style={styles.titleLine}>
                <ThemedText type="smallBold" style={styles.flex}>
                  {service.name}
                </ThemedText>
                <ThemedText type="smallBold">{formatPrice(service.price)}</ThemedText>
              </View>
              {service.productType ? (
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {service.productType}
                </ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary">
                {t('items.upTo', { count: service.maxQty })}
                {service.maxQtyOverride == null ? t('items.default') : ''}
              </ThemedText>
              <View style={styles.rowActions}>
              <Button
                label={t('common.edit')}
                variant="secondary"
                size="sm"
                accessibilityLabel={t('app.editNamed', { name: service.name })}
                onPress={() => {
                  setMessage(null);
                  setEditing(service);
                }}
              />
              <Button
                label={t('common.delete')}
                variant="danger"
                size="sm"
                accessibilityLabel={t('app.deleteNamed', { name: service.name })}
                loading={remove.isPending && remove.variables === service.id}
                onPress={() => {
                  setMessage(null);
                  setDeleting(service);
                }}
              />
              </View>
            </View>
          </View>
        ))
      )}

      {editing ? (
        <ServiceFormModal
          storeId={store.id}
          service={editing === 'new' ? undefined : editing}
          defaultMaxQty={store.maxServiceQty}
          item={words.item}
          isProductStore={store.catalogType !== 'service'}
          uploadsEnabled={!!store.uploadsEnabled}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setMessage({ type: 'success', text: t('app.itemSaved', { name: saved.name }) });
          }}
        />
      ) : null}

      <ConfirmModal
        visible={!!deleting}
        title={t('items.deleteTitle', { item: words.item })}
        message={t('items.deleteMessage', { name: deleting?.name ?? '' })}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const service = deleting!;
          setDeleting(null);
          remove.mutate(service.id, {
            onSuccess: () => setMessage({ type: 'success', text: t('app.itemDeleted', { name: service.name }) }),
            onError: (error) => setMessage({ type: 'error', text: errorMessage(error) }),
          });
        }}
      />
    </View>
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
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  number: {
    width: 20,
    textAlign: 'center',
    lineHeight: 48,
  },
  details: {
    flex: 1,
    gap: Spacing.half,
  },
  titleLine: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rowActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
