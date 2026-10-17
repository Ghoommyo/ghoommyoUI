import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ServiceImage } from '@/components/ui/service-image';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import { useStoreServices } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { catalogWords } from '@/lib/order-types';
import { countServices, formatPrice } from '@/lib/services';
import type { CatalogType, ServicePicks, StoreService } from '@/types/domain';

type ServicesModalProps = {
  storeId: string;
  storeName: string;
  /** Products or Services: only the wording changes. */
  catalogType: CatalogType;
  /** Picks so far; changes stay in a draft until Save. */
  initial: ServicePicks;
  onSave(picks: ServicePicks): void;
  /** Closing without saving discards the draft. */
  onClose(): void;
};

/** Pick a store's products or services, with quantities, before booking. Mount it only while open. */
export function ServicesModal({ storeId, storeName, catalogType, initial, onSave, onClose }: ServicesModalProps) {
  const words = catalogWords(catalogType);
  const services = useStoreServices(storeId);
  const [draft, setDraft] = useState<ServicePicks>(initial);
  const count = countServices(draft);

  const change = (service: StoreService, delta: number) =>
    setDraft((d) => {
      const qty = Math.max(0, Math.min(service.maxQty, (d[service.id] ?? 0) + delta));
      const next = { ...d, [service.id]: qty };
      if (!qty) delete next[service.id];
      return next;
    });

  const save = () => {
    // Keep only services that still exist, within their limits.
    const valid: ServicePicks = {};
    for (const service of services.data ?? []) {
      if (draft[service.id]) valid[service.id] = Math.min(draft[service.id], service.maxQty);
    }
    onSave(valid);
  };

  return (
    <Sheet
      visible
      title={`${storeName} ${words.items}`}
      onClose={onClose}
      footer={
        <Button
          label={count ? `Save (${count} selected)` : 'Save'}
          variant="success"
          fullWidth
          disabled={!services.data}
          onPress={save}
        />
      }>
      {services.isLoading ? (
        <ActivityIndicator style={styles.empty} />
      ) : services.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(services.error) }} />
      ) : !services.data?.length ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          This store hasn&apos;t added any {words.items} yet.
        </ThemedText>
      ) : (
        <View>
          {services.data.map((service, i) => (
            <ServiceRow
              key={service.id}
              number={i + 1}
              service={service}
              qty={draft[service.id] ?? 0}
              first={i === 0}
              onChange={change}
            />
          ))}
        </View>
      )}
    </Sheet>
  );
}

type ServiceRowProps = {
  number: number;
  service: StoreService;
  qty: number;
  first: boolean;
  onChange(service: StoreService, delta: number): void;
};

function ServiceRow({ number, service, qty, first, onChange }: ServiceRowProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, !first && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.number}>
        {number}
      </ThemedText>
      <ServiceImage uri={service.imageUrl} />
      <View style={styles.text}>
        <ThemedText type="smallBold" style={styles.name}>
          {service.name}
        </ThemedText>
        {service.description ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
            {service.description}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.side}>
        <ThemedText type="smallBold">{formatPrice(service.price)}</ThemedText>
        <View style={styles.stepper}>
          <StepButton
            glyph="−"
            label={`Remove one ${service.name}`}
            disabled={qty === 0}
            onPress={() => onChange(service, -1)}
          />
          <ThemedText
            type="smallBold"
            style={styles.qty}
            accessibilityLabel={`${qty} ${service.name} selected`}
            accessibilityLiveRegion="polite">
            {qty}
          </ThemedText>
          <StepButton
            glyph="+"
            label={`Add one ${service.name}`}
            primary
            disabled={qty >= service.maxQty}
            onPress={() => onChange(service, 1)}
          />
        </View>
        {service.maxQty > 1 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.max}>
            max {service.maxQty}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

type StepButtonProps = { glyph: string; label: string; primary?: boolean; disabled: boolean; onPress(): void };

function StepButton({ glyph, label, primary = false, disabled, onPress }: StepButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.step,
        { backgroundColor: primary ? theme.primary : theme.backgroundSelected },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.7 },
      ]}>
      <ThemedText style={[styles.stepGlyph, { color: primary ? theme.onPrimary : theme.text }]}>{glyph}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  number: {
    width: 20,
    textAlign: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  name: {
    fontSize: 16,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  side: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  step: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: 700,
  },
  qty: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 16,
  },
  max: {
    fontSize: 12,
    lineHeight: 16,
  },
});
