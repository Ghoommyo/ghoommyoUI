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
import { formatSlotStart } from '@/lib/date';
import { formatPrice, parseServices, resolvePicks, servicesDescription } from '@/lib/services';

const MOBILE_PATTERN = /^\+?\d{10,15}$/;

type FieldErrors = { name?: string; mobile?: string; people?: string; description?: string };

export default function BookingScreen() {
  const params = useLocalSearchParams<{ storeId: string; slotStart: string; services?: string }>();
  const { storeId, slotStart } = params;
  const picks = parseServices(params.services);
  const hasPicks = Object.keys(picks).length > 0;
  const store = useStore(storeId);
  const profile = useMyProfile();
  // Services are only needed to turn the picks from the dashboard into names and prices.
  const services = useStoreServices(hasPicks ? storeId : undefined);

  if (store.isLoading || profile.isLoading || services.isLoading) {
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

  // Picked services that still exist, numbered as in the store's list and clamped to their limits.
  const picked = resolvePicks(services.data ?? [], picks);

  // Mounted only after loading, so the profile and services prefill seed the form state once.
  return (
    <BookingForm
      picked={picked}
      servicesError={services.isError ? errorMessage(services.error) : null}
      storeId={store.data.id}
      storeName={store.data.name}
      maxPerBooking={store.data.maxPerBooking}
      slotStart={slotStart}
      initialName={profile.data?.name ?? ''}
      initialMobile={profile.data?.mobile ?? ''}
    />
  );
}

type BookingFormProps = {
  picked: ReturnType<typeof resolvePicks>;
  /** The picks couldn't be loaded; the booking can still go ahead without them. */
  servicesError: string | null;
  storeId: string;
  storeName: string;
  maxPerBooking: number;
  slotStart: string;
  initialName: string;
  initialMobile: string;
};

function BookingForm({
  picked,
  servicesError,
  storeId,
  storeName,
  maxPerBooking,
  slotStart,
  initialName,
  initialMobile,
}: BookingFormProps) {
  const [name, setName] = useState(initialName);
  const [mobile, setMobile] = useState(initialMobile);
  const [people, setPeople] = useState<number>();
  const theme = useTheme();
  // Prefilled with the numbered services and prices; the user can edit it.
  const [description, setDescription] = useState(() => servicesDescription(picked));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmCancel, setConfirmCancel] = useState(false);
  const createBooking = useCreateBooking();

  const confirm = () => {
    const cleanMobile = mobile.replace(/[\s-]/g, '');
    const next: FieldErrors = {
      name: name.trim() ? undefined : 'Name is required.',
      mobile: MOBILE_PATTERN.test(cleanMobile) ? undefined : 'Enter a valid mobile number.',
      people: people ? undefined : 'Choose how many people are coming.',
      // The server rejects bookings without a description.
      description: description.trim() ? undefined : 'Description is required.',
    };
    setErrors(next);
    if (!people || Object.values(next).some(Boolean)) return;

    createBooking.mutate(
      {
        storeId,
        slotStart,
        name: name.trim(),
        mobile: cleanMobile,
        people,
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

  return (
    <Screen>
      <View style={styles.summary}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {storeName}
        </ThemedText>
        <ThemedText type="subtitle">{formatSlotStart(slotStart)}</ThemedText>
      </View>

      <Banner
        message={
          createBooking.isError
            ? { type: 'error', text: errorMessage(createBooking.error) }
            : servicesError
              ? { type: 'error', text: `Your services couldn't be loaded: ${servicesError}` }
              : null
        }
      />

      {picked.length ? (
        <View
          style={[styles.services, { backgroundColor: theme.backgroundElement }]}
          accessibilityLabel="Selected services">
          <ThemedText type="smallBold">Services</ThemedText>
          {picked.map((s) => (
            <View key={s.serviceId} style={styles.serviceLine}>
              <ThemedText type="small" style={styles.flex}>
                {s.number}. {s.name}
                {s.qty > 1 ? ` × ${s.qty}` : ''}
              </ThemedText>
              <ThemedText type="small">{formatPrice(s.price * s.qty)}</ThemedText>
            </View>
          ))}
          <View style={[styles.serviceLine, styles.total, { borderTopColor: theme.border }]}>
            <ThemedText type="smallBold" style={styles.flex}>
              Total
            </ThemedText>
            <ThemedText type="smallBold">
              {formatPrice(picked.reduce((sum, s) => sum + s.price * s.qty, 0))}
            </ThemedText>
          </View>
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
        label="How many people are coming"
        placeholder={`1 to ${maxPerBooking}`}
        value={people}
        options={Array.from({ length: maxPerBooking }, (_, i) => ({
          label: String(i + 1),
          value: i + 1,
        }))}
        onChange={(value) => {
          setPeople(value);
          setErrors((e) => ({ ...e, people: undefined }));
        }}
        error={errors.people}
      />
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
