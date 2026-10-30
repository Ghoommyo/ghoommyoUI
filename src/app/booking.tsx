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
import { DeliveryAddressField, OTHER_ADDRESS, StoreAddressCard } from '@/features/bookings/booking-address';
import {
  useAddresses,
  useCreateBooking,
  useMyProfile,
  useSaveAddress,
  useStore,
  useStoreServices,
} from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { ServicesModal } from '@/features/services/services-modal';
import { formatSlotStart } from '@/lib/date';
import {
  asksPeople as asksPeopleFor,
  needsDeliveryAddress,
  visitsStore,
  catalogLabels,
  catalogWords,
  defaultOrderType,
  orderTypeOptions,
  storeTypeLabel,
} from '@/lib/order-types';
import {
  countServices,
  formatPrice,
  parseServices,
  replaceServicesBlock,
  resolvePicks,
  servicesDescription,
} from '@/lib/services';
import type { OrderType, ServicePicks, Store, StoreService } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

const MOBILE_PATTERN = /^\+?\d{10,15}$/;

type FieldErrors = {
  name?: string;
  mobile?: string;
  people?: string;
  description?: string;
  address?: string;
};

const MAX_ADDRESS_LENGTH = 500;

export default function BookingScreen() {
  const { t } = useT();
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
            text: store.error ? errorMessage(store.error) : t('book.incompleteLink'),
          }}
        />
        <Button label={t('book.backToDashboard')} onPress={() => router.back()} />
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
      inactive={!!profile.data?.inactive}
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
  /** The admin made the customer inactive: they can't submit requests. */
  inactive: boolean;
};

function BookingForm({
  services,
  initialPicks,
  servicesError,
  store,
  slotStart,
  initialName,
  initialMobile,
  inactive,
}: BookingFormProps) {
  const { t, language } = useT();
  const [picks, setPicks] = useState(initialPicks);
  const [servicesOpen, setServicesOpen] = useState(false);
  // Picked items that still exist, numbered as in the store's list and clamped to their limits.
  const picked = resolvePicks(services, picks);
  const words = catalogLabels(t, store.catalogType);
  // The description's block heading stays English (the server and edits match it).
  const heading = catalogWords(store.catalogType).Items;
  const [name, setName] = useState(initialName);
  const [mobile, setMobile] = useState(initialMobile);
  const [people, setPeople] = useState<number>();
  const [orderType, setOrderType] = useState<OrderType>(() => defaultOrderType(store));
  // Dark-store orders and home visits have no head count to ask for.
  const asksPeople = asksPeopleFor(store.isDarkStore, orderType);
  const theme = useTheme();
  // Prefilled with the numbered items and prices; the user can edit it.
  const [description, setDescription] = useState(() =>
    servicesDescription(
      resolvePicks(services, initialPicks),
      heading,
    ),
  );
  // Porter / home visit: a saved address (newest by default) or Other with its own text.
  const addresses = useAddresses();
  const saveAddress = useSaveAddress();
  const savedAddresses = addresses.data ?? [];
  const [addressChoice, setAddressChoice] = useState<string | null>(null);
  const choice = addressChoice ?? savedAddresses[0]?.id ?? OTHER_ADDRESS;
  const [otherAddress, setOtherAddress] = useState('');
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const needsAddress = needsDeliveryAddress(orderType);
  const deliveryAddress =
    choice === OTHER_ADDRESS
      ? otherAddress.trim()
      : (savedAddresses.find((a) => a.id === choice)?.address ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmCancel, setConfirmCancel] = useState(false);
  const createBooking = useCreateBooking();

  const confirm = () => {
    const cleanMobile = mobile.replace(/[\s-]/g, '');
    const next: FieldErrors = {
      name: name.trim() ? undefined : t('book.nameRequired'),
      mobile: MOBILE_PATTERN.test(cleanMobile) ? undefined : t('booking.invalidMobile'),
      people: !asksPeople || people ? undefined : t('book.choosePeople'),
      // The server rejects bookings without a description.
      description: description.trim() ? undefined : t('book.descriptionRequired'),
      address: !needsAddress
        ? undefined
        : !deliveryAddress
          ? t('book.enterAddress')
          : deliveryAddress.length > MAX_ADDRESS_LENGTH
            ? t('book.addressTooLong', { count: MAX_ADDRESS_LENGTH })
            : undefined,
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
        deliveryAddress: needsAddress ? deliveryAddress : null,
        description: description.trim(),
        services: picked.map(({ serviceId, name: serviceName, price, qty }) => ({
          serviceId,
          name: serviceName,
          price,
          qty,
        })),
      },
      {
        onSuccess: (booking) => {
          // The booking stands even if saving the address fails; it can be added from Addresses.
          if (needsAddress && choice === OTHER_ADDRESS && saveNewAddress) {
            saveAddress.mutate({ input: { label: '', address: deliveryAddress } });
          }
          router.dismissTo({
            pathname: '/dashboard',
            params: { booked: booking.slotStart, status: booking.status },
          });
        },
      },
    );
  };

  /** New picks from the picker: swap the description's items block, keeping the rest. */
  const saveServices = (next: ServicePicks) => {
    const nextPicked = resolvePicks(services, next);
    setDescription((d) =>
      replaceServicesBlock(
        d,
        servicesDescription(picked, heading),
        servicesDescription(nextPicked, heading),
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
        <ThemedText type="subtitle">{formatSlotStart(slotStart, language)}</ThemedText>
      </View>

      <Banner
        message={
          createBooking.isError
            ? { type: 'error', text: errorMessage(createBooking.error) }
            : inactive
              ? { type: 'error', text: t('hint.inactiveUser') }
              : servicesError
              ? { type: 'error', text: t('app.itemsFailed', { items: words.items, error: servicesError }) }
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
              {storeTypeLabel(store) ? (
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {storeTypeLabel(store)}
                </ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary">
                {t('book.selectHint', { items: words.items })}
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
                {t('booking.total')}
              </ThemedText>
              <ThemedText type="smallBold">
                {formatPrice(picked.reduce((sum, s) => sum + s.price * s.qty, 0))}
              </ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      <TextField
        label={t('book.name')}
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoComplete="name"
        textContentType="name"
      />
      <TextField
        label={t('booking.contactMobile')}
        value={mobile}
        onChangeText={setMobile}
        error={errors.mobile}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <Select
        label={t('booking.orderType')}
        value={orderType}
        options={orderTypeOptions(store, t)}
        onChange={(next) => {
          setOrderType(next);
          // The people or address field may have just gone away.
          setErrors((e) => ({ ...e, people: undefined, address: undefined }));
        }}
      />
      {visitsStore(orderType) ? <StoreAddressCard storeName={store.name} profile={store.profile} /> : null}
      {needsAddress ? (
        <DeliveryAddressField
          isHomeVisit={orderType === 'homeVisit'}
          saved={savedAddresses}
          loading={addresses.isLoading}
          choice={choice}
          onChoice={(value) => {
            setAddressChoice(value);
            setErrors((e) => ({ ...e, address: undefined }));
          }}
          other={otherAddress}
          onOther={(value) => {
            setOtherAddress(value);
            setErrors((e) => ({ ...e, address: undefined }));
          }}
          save={saveNewAddress}
          onSave={setSaveNewAddress}
          error={errors.address}
        />
      ) : null}
      {asksPeople ? (
        <Select
          label={t('booking.howManyPeople')}
          placeholder={t('book.peopleRange', { max: store.maxPerBooking })}
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
        label={t('booking.description')}
        value={description}
        onChangeText={(value) => {
          setDescription(value);
          setErrors((e) => ({ ...e, description: undefined }));
        }}
        placeholder={t('book.descriptionPlaceholder')}
        hint={t('book.descriptionHint')}
        error={errors.description}
        multiline
      />

      <View style={styles.actions}>
        <Button label={t('common.cancel')} variant="secondary" onPress={() => setConfirmCancel(true)} />
        <Button
          label={t('book.confirm')}
          variant="success"
          onPress={confirm}
          loading={createBooking.isPending}
          disabled={inactive}
        />
      </View>

      {servicesOpen ? (
        <ServicesModal
          storeId={store.id}
          storeName={store.name}
          catalogType={store.catalogType}
          typeLabel={storeTypeLabel(store)}
          initial={picks}
          onClose={() => setServicesOpen(false)}
          onSave={saveServices}
        />
      ) : null}
      <ConfirmModal
        visible={confirmCancel}
        title={t('book.discardTitle')}
        message={t('book.discardMessage')}
        confirmLabel={t('book.discard')}
        cancelLabel={t('book.keepEditing')}
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
