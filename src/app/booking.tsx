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
import { useCreateBooking, useMyProfile, useStore } from '@/hooks/queries';
import { formatSlotStart } from '@/lib/date';

const MOBILE_PATTERN = /^\+?\d{10,15}$/;

type FieldErrors = { name?: string; mobile?: string; people?: string };

export default function BookingScreen() {
  const { storeId, slotStart } = useLocalSearchParams<{ storeId: string; slotStart: string }>();
  const store = useStore(storeId);
  const profile = useMyProfile();

  if (store.isLoading || profile.isLoading) {
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

  // Mounted only after loading, so the profile prefill seeds the form state once.
  return (
    <BookingForm
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
  storeId: string;
  storeName: string;
  maxPerBooking: number;
  slotStart: string;
  initialName: string;
  initialMobile: string;
};

function BookingForm({
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
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmCancel, setConfirmCancel] = useState(false);
  const createBooking = useCreateBooking();

  const confirm = () => {
    const cleanMobile = mobile.replace(/[\s-]/g, '');
    const next: FieldErrors = {
      name: name.trim() ? undefined : 'Name is required.',
      mobile: MOBILE_PATTERN.test(cleanMobile) ? undefined : 'Enter a valid mobile number.',
      people: people ? undefined : 'Choose how many people are coming.',
    };
    setErrors(next);
    if (!people || Object.values(next).some(Boolean)) return;

    createBooking.mutate(
      { storeId, slotStart, name: name.trim(), mobile: cleanMobile, people, description: description.trim() },
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
          createBooking.isError ? { type: 'error', text: errorMessage(createBooking.error) } : null
        }
      />

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
        onChangeText={setDescription}
        placeholder="Anything the store should know"
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
  },
});
