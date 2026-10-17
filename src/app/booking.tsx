import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useCreateBooking, useMyProfile, useStore, useStoreServices } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { ServicesModal } from '@/features/services/services-modal';
import { formatSlotStart } from '@/lib/date';
import { catalogWords, defaultOrderType, orderTypeOptions } from '@/lib/order-types';
import {
  countServices,
  formatPrice,
  parseServices,
  replaceServicesBlock,
  resolvePicks,
  servicesDescription,
} from '@/lib/services';
import type { OrderType, ServicePicks, Store, StoreService } from '@/types/domain';

const MOBILE_PATTERN = /^\+?\d{10,15}$/;

type FieldErrors = { name?: string; mobile?: string; people?: string; description?: string };

export default function BookingScreen() {
  const params = useLocalSearchParams<{ storeId: string; slotStart: string; services?: string }>();
  const { storeId, slotStart } = params;
  const picks = parseServices(params.services);
  const hasPicks = Object.keys(picks).length > 0;
  const store = useStore(storeId);
  const profile = useMyProfile();
  const services = useStoreServices(storeId);

  // Without picks the form doesn't wait for the items; their card appears once they load.
  if (store.isLoading || profile.isLoading || (hasPicks && services.isLoading)) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  if (!store.data || !slotStart) {
    return (
      <Screen>
        <Banner
          message={{
            type: 'error',
            text: store.error ? errorMessage(store.error) : 'This booking link is incomplete.',
          }}
        />
        <Button label="Back to dashboard" onPress={() => router.back()} />
      </Screen>
    );
  }

  // Mounted only after loading, so the profile and picks prefill seed the form state once.
  return (
    <BookingForm
      services={services.data ?? []}
      initialPicks={picks}
      servicesError={hasPicks && services.isError ? errorMessage(services.error) : null}
      store={store.data}
      slotStart={slotStart}
      initialName={profile.data?.name ?? ''}
      initialMobile={profile.data?.mobile ?? ''}
    />
  );
}

type BookingFormProps = {
  /** The store's products or services (empty while loading or if it has none). */
  services: StoreService[];
  /** Picked on the dashboard; the form can change them. */
  initialPicks: ServicePicks;
  /** The picks couldn't be loaded; the booking can still go ahead without them. */
  servicesError: string | null;
  store: Store;
  slotStart: string;
  initialName: string;
  initialMobile: string;
};

function BookingForm({
  services,
  initialPicks,
  servicesError,
  store,
  slotStart,
  initialName,
  initialMobile,
}: BookingFormProps) {
  const [picks, setPicks] = useState(initialPicks);
  const [servicesOpen, setServicesOpen] = useState(false);
  // Picked items that still exist, numbered as in the store's list and clamped to their limits.
  const picked = resolvePicks(services, picks);
  const words = catalogWords(store.catalogType);
  const [name, setName] = useState(initialName);
  const [mobile, setMobile] = useState(initialMobile);
  const [people, setPeople] = useState<number>();
  const [orderType, setOrderType] = useState<OrderType>(() => defaultOrderType(store));
  // Dark stores take orders, so there's no head count to ask for.
  const asksPeople = !store.isDarkStore;
  const theme = useTheme();
  // Prefilled with the numbered items and prices; the user can edit it.
  const [description, setDescription] = useState(() =>
    servicesDescription(
      resolvePicks(services, initialPicks),
      catalogWords(store.catalogType).Items,
    ),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmCancel, setConfirmCancel] = useState(false);
  const createBooking = useCreateBooking();

  const confirm = () => {
    const cleanMobile = mobile.replace(/[\s-]/g, '');
    const next: FieldErrors = {
      name: name.trim() ? undefined : 'Name is required.',
      mobile: MOBILE_PATTERN.test(cleanMobile) ? undefined : 'Enter a valid mobile number.',
      people: !asksPeople || people ? undefined : 'Choose how many people are coming.',
      // The server rejects bookings without a description.
      description: description.trim() ? undefined : 'Description is required.',
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    createBooking.mutate(
      {
        storeId: store.id,
        slotStart,
        name: name.trim(),
        mobile: cleanMobile,
        people: asksPeople && people ? people : 1,
        orderType,
        description: description.trim(),
        services: picked.map(({ serviceId, name: serviceName, price, qty }) => ({
          serviceId,
          name: serviceName,
          price,
          qty,
        })),
      },
      {
        onSuccess: (booking) =>
          router.dismissTo({
            pathname: '/dashboard',
            params: { booked: booking.slotStart, status: booking.status },
          }),
      },
    );
  };

  /** New picks from the picker: swap the description's items block, keeping the rest. */
  const saveServices = (next: ServicePicks) => {
    const nextPicked = resolvePicks(services, next);
    setDescription((d) =>
      replaceServicesBlock(
        d,
        servicesDescription(picked, words.Items),
        servicesDescription(nextPicked, words.Items),
      ),
    );
    setErrors((e) => ({ ...e, description: undefined }));
    setPicks(next);
    setServicesOpen(false);
  };

  return (
    <Screen>
      <View style={styles.summary}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {store.name}
        </ThemedText>
        <ThemedText type="subtitle">{formatSlotStart(slotStart)}</ThemedText>
      </View>

      <Banner
        message={
          createBooking.isError
            ? { type: 'error', text: errorMessage(createBooking.error) }
            : servicesError
              ? { type: 'error', text: `Your ${words.items} couldn't be loaded: ${servicesError}` }
              : null
        }
      />

      {services.length || picked.length ? (
        <View style={[styles.services, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.servicesHeader}>
            <View style={styles.flex}>
              <ThemedText type="smallBold" accessibilityRole="header">
                {words.Items}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                You can select {words.items} by clicking here
              </ThemedText>
            </View>
            <Button
              label={picked.length ? `${words.Items} (${countServices(picks)})` : words.Items}
              variant="secondary"
              size="sm"
              onPress={() => setServicesOpen(true)}
            />
          </View>
          {picked.map((s, i) => (
            <View
              key={s.serviceId}
              style={[
                styles.serviceLine,
                i === 0 && styles.firstLine,
                i === 0 && { borderTopColor: theme.border },
              ]}>
              <ThemedText type="small" style={styles.flex}>
                {s.number}. {s.name}
                {s.qty > 1 ? ` × ${s.qty}` : ''}
              </ThemedText>
              <ThemedText type="small">{formatPrice(s.price * s.qty)}</ThemedText>
            </View>
          ))}
          {picked.length ? (
            <View style={[styles.serviceLine, styles.total, { borderTopColor: theme.border }]}>
              <ThemedText type="smallBold" style={styles.flex}>
                Total
              </ThemedText>
              <ThemedText type="smallBold">
                {formatPrice(picked.reduce((sum, s) => sum + s.price * s.qty, 0))}
              </ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoComplete="name"
        textContentType="name"
      />
      <TextField
        label="Contact (mobile)"
        value={mobile}
        onChangeText={setMobile}
        error={errors.mobile}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <Select
        label="Order type"
        value={orderType}
        options={orderTypeOptions(store)}
        onChange={setOrderType}
      />
      {asksPeople ? (
        <Select
          label="How many people are coming"
          placeholder={`1 to ${store.maxPerBooking}`}
          value={people}
          options={Array.from({ length: store.maxPerBooking }, (_, i) => ({
            label: String(i + 1),
            value: i + 1,
          }))}
          onChange={(value) => {
            setPeople(value);
            setErrors((e) => ({ ...e, people: undefined }));
          }}
          error={errors.people}
        />
      ) : null}
      <TextField
        label="Description"
        value={description}
        onChangeText={(value) => {
          setDescription(value);
          setErrors((e) => ({ ...e, description: undefined }));
        }}
        placeholder="Anything the store should know"
        hint="Tell the store what you need."
        error={errors.description}
        multiline
      />

      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={() => setConfirmCancel(true)} />
        <Button
          label="Confirm"
          variant="success"
          onPress={confirm}
          loading={createBooking.isPending}
        />
      </View>

      {servicesOpen ? (
        <ServicesModal
          storeId={store.id}
          storeName={store.name}
          catalogType={store.catalogType}
          initial={picks}
          onClose={() => setServicesOpen(false)}
          onSave={saveServices}
        />
      ) : null}
      <ConfirmModal
        visible={confirmCancel}
        title="Discard this booking?"
        message="Nothing will be saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    gap: Spacing.one,
  },
  flex: {
    flex: 1,
  },
  services: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  servicesHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  firstLine: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  serviceLine: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  total: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.one,
    marginTop: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
  },
});
