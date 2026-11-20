import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { useSession } from '@/auth/session';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Banner, type BannerMessage } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Screen } from '@/components/ui/screen';
import { Select, type SelectOption } from '@/components/ui/select';
import { RatingBadge } from '@/components/ui/stars';
import { StorePhoto } from '@/components/ui/store-photo';
import { Spacing } from '@/constants/theme';
import { UserEventsTabs } from '@/features/events/user-events-tabs';
import { ServicesModal } from '@/features/services/services-modal';
import { DayStrip } from '@/features/user-dashboard/day-strip';
import { SlotGrid } from '@/features/user-dashboard/slot-grid';
import { useMyProfile, useStores, useStoreSlots } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLong, formatMonthYear, formatSlotStart, makeDateKey, toDateKey } from '@/lib/date';
import { catalogLabels, storeTypeLabel } from '@/lib/order-types';
import { countServices, encodeServices, parseServices } from '@/lib/services';
import { daysInMonth, firstDay, isOpenDay, limitUnitLabel, nextOpenDay, openDaysLabel } from '@/lib/slots';
import type { ServicePicks, SlotStart } from '@/types/domain';
import { useT } from '@/i18n/language-provider';
import type { Language } from '@/i18n/languages';

/** The next 12 months, starting with the current one; values are `year-month` (0-based month). */
function monthOptions(today: Date, language: Language): SelectOption<string>[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { label: formatMonthYear(d.getFullYear(), d.getMonth(), language), value: `${d.getFullYear()}-${d.getMonth()}` };
  });
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SLOT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** What a guest had picked before logging in (`?storeId=&date=&slot=&services=`), or null. */
function restoreFrom(
  params: { storeId?: string; date?: string; slot?: string; services?: string },
  today: Date,
): { storeId: string; monthKey?: string; day?: number; slot: SlotStart | null; picks: ServicePicks } | null {
  if (!params.storeId) return null;
  let monthKey: string | undefined;
  let day: number | undefined;
  if (params.date && DATE_PATTERN.test(params.date)) {
    const [y, m, d] = params.date.split('-').map(Number);
    const offset = y * 12 + (m - 1) - (today.getFullYear() * 12 + today.getMonth());
    const past = offset === 0 && d < today.getDate();
    if (offset >= 0 && offset < 12 && d >= 1 && d <= daysInMonth(y, m - 1) && !past) {
      monthKey = `${y}-${m - 1}`;
      day = d;
    }
  }
  const slot =
    day && params.slot && SLOT_PATTERN.test(params.slot) && params.slot.startsWith(params.date!) ? params.slot : null;
  return { storeId: params.storeId, monthKey, day, slot, picks: parseServices(params.services) };
}

function nowSlotStart(now: Date): SlotStart {
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return `${toDateKey(now)}T${time}`;
}

export function UserDashboard() {
  const { t, language } = useT();
  const theme = useTheme();
  const { session } = useSession();
  // The admin can make a customer inactive: they can look around but not submit requests.
  const profile = useMyProfile();
  const inactive = session?.role === 'user' && !!profile.data?.inactive;
  const params = useLocalSearchParams<{
    booked?: string;
    status?: string;
    /** From Home's Book button (a store) or the login screen (a guest's whole selection). */
    storeId?: string;
    date?: string;
    slot?: string;
    services?: string;
  }>();
  const { booked, status: bookedStatus } = params;
  const [today] = useState(() => new Date());
  const [initial] = useState(() => restoreFrom(params, today));

  const [storeId, setStoreId] = useState<string | undefined>(initial?.storeId);
  const [monthKey, setMonthKey] = useState(initial?.monthKey ?? `${today.getFullYear()}-${today.getMonth()}`);
  const [day, setDay] = useState(initial?.day ?? today.getDate());
  const [selectedSlot, setSelectedSlot] = useState<SlotStart | null>(initial?.slot ?? null);
  const [message, setMessage] = useState<BannerMessage | null>(null);
  const [picks, setPicks] = useState<ServicePicks>(initial?.picks ?? {});
  const [servicesOpen, setServicesOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const serviceCount = countServices(picks);

  // New params while the screen is open (Home's Book button, back from login): select what they say.
  const restoreKey = [params.storeId, params.date, params.slot, params.services].join('|');
  const [seenRestore, setSeenRestore] = useState(restoreKey);
  if (restoreKey !== seenRestore) {
    setSeenRestore(restoreKey);
    const next = restoreFrom(params, today);
    if (next) {
      setStoreId(next.storeId);
      if (next.monthKey && next.day) {
        setMonthKey(next.monthKey);
        setDay(next.day);
      }
      setSelectedSlot(next.slot);
      setPicks(next.picks);
    }
  }

  // A finished booking comes back with a new `booked` param: start the next one without its slot or items.
  const [seenBooked, setSeenBooked] = useState(booked);
  if (booked !== seenBooked) {
    setSeenBooked(booked);
    if (booked) {
      setPicks({});
      setSelectedSlot(null);
    }
  }

  const [year, month] = monthKey.split('-').map(Number);
  const dateKey = makeDateKey(year, month, day);

  const stores = useStores();
  const store = stores.data?.find((s) => s.id === storeId);
  // The store is closed on the chosen day (new store or new month): move to its next open day that month.
  if (store && !isOpenDay(store.openDays, year, month, day)) {
    const next = nextOpenDay(store.openDays, year, month, day, firstDay(today, year, month));
    // With no open day left this month the day stays, and the schedule says the store is closed.
    if (next !== day) {
      setDay(next);
      setSelectedSlot(null);
    }
  }
  const closedDay = Boolean(store && !isOpenDay(store.openDays, year, month, day));
  // Products or Services, by the store type; "Products" until a store is picked.
  const words = catalogLabels(t, store?.catalogType);
  const slots = useStoreSlots(storeId, dateKey);

  // Confirmation passed back from the booking modal.
  const bookedMessage: BannerMessage | null = booked
    ? {
        type: 'success',
        text: t(bookedStatus === 'accepted' ? 'user.bookedConfirmed' : 'user.bookedRequested', {
          when: formatSlotStart(booked, language),
        }),
      }
    : null;

  const changeMonth = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    setMonthKey(key);
    setDay((d) => Math.max(firstDay(today, y, m), Math.min(d, daysInMonth(y, m))));
    setSelectedSlot(null);
  };

  const hasChoices = Boolean(storeId || selectedSlot || serviceCount);

  const reset = () => {
    setStoreId(undefined);
    setMonthKey(`${today.getFullYear()}-${today.getMonth()}`);
    setDay(today.getDate());
    setSelectedSlot(null);
    setMessage(null);
    setPicks({});
    router.setParams({
      booked: undefined,
      status: undefined,
      storeId: undefined,
      date: undefined,
      slot: undefined,
      services: undefined,
    });
  };

  const book = () => {
    if (!session) {
      // Back here after logging in, with the same store, day, time and items.
      const query: Record<string, string> = { date: dateKey };
      if (storeId) query.storeId = storeId;
      if (selectedSlot) query.slot = selectedSlot;
      if (serviceCount) query.services = encodeServices(picks);
      router.push({ pathname: '/login', params: { next: `/dashboard?${new URLSearchParams(query)}` } });
      return;
    }
    if (!storeId) {
      setMessage({ type: 'error', text: t('user.storeNotSelected') });
      return;
    }
    if (!selectedSlot) {
      setMessage({ type: 'error', text: t('user.timeNotSelected') });
      return;
    }
    setMessage(null);
    router.setParams({ booked: undefined, status: undefined });
    router.push({
      pathname: '/booking',
      params: {
        storeId,
        slotStart: selectedSlot,
        ...(serviceCount ? { services: encodeServices(picks) } : {}),
      },
    });
  };

  return (
    <Screen>
      <AppHeader />
      {/* The booking just made: at the top, where the customer lands, with a way to see it. */}
      {bookedMessage && !message && !inactive ? (
        <View accessibilityRole="alert" style={[styles.booked, { borderColor: theme.success, backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" style={[styles.flex, { color: theme.success }]}>
            {bookedMessage.text}
          </ThemedText>
          <Button label={t('user.seeMyBookings')} variant="text" onPress={() => router.push('/events')} />
        </View>
      ) : null}

      <View style={styles.storeRow}>
        <Select
          placeholder={stores.isLoading ? t('storePicker.loading') : t('storePicker.select')}
          value={storeId}
          options={(stores.data ?? []).map((s) => ({
            // Service stores show their type of service, e.g. "Raju Tailor · Plumber".
            label: storeTypeLabel(s) ? `${s.name} · ${storeTypeLabel(s)}` : s.name,
            value: s.id,
            // The rating opens the store's profile on its Reviews tab; the name still selects the store.
            accessory: {
              content: <RatingBadge rating={s.rating} />,
              accessibilityLabel: t('storePicker.seeProfile', { name: s.name }),
              onPress: () => router.push({ pathname: '/stores/[id]', params: { id: s.id } }),
            },
          }))}
          fieldAccessory={store ? <RatingBadge rating={store.rating} color={theme.cardTextSecondary} /> : null}
          onChange={(id) => {
            // Services belong to a store, so a new store starts with none.
            if (id !== storeId) setPicks({});
            setStoreId(id);
            setSelectedSlot(null);
            setMessage(null);
          }}
          onCard
          style={styles.flex}
        />
        <Button
          label={serviceCount ? `${words.Items} (${serviceCount})` : words.Items}
          variant="secondary"
          disabled={!store}
          accessibilityHint={store ? undefined : t('app.selectStoreFirst')}
          onPress={() => setServicesOpen(true)}
        />
      </View>
      {store ? (
        <View style={styles.storeInfo}>
          <StorePhoto uri={store.profile.photoUrl} name={store.name} style={styles.storePhoto} />
          <ThemedText type="default" themeColor="textSecondary" style={styles.flex}>
            {t(store.isDarkStore ? 'user.maxOrders' : 'user.maxCount', {
              count: store.maxPerSlot,
              unit: limitUnitLabel(t, store.limitUnit),
            })}
            {' · '}
            {t('user.open', { days: openDaysLabel(store.openDays, t) })}
          </ThemedText>
        </View>
      ) : null}
      {stores.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(stores.error) }} onRetry={() => stores.refetch()} />
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.cardHeader}>
          <View style={styles.flex}>
            <ThemedText style={[styles.cardTitle, { color: theme.cardText }]}>
              {t(store?.isDarkStore ? 'schedule.orderTitle' : 'schedule.visitorTitle')}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.cardTextSecondary }}>
              {t(store?.isDarkStore ? 'schedule.monitorOrders' : 'schedule.monitorVisitors')}
            </ThemedText>
          </View>
          <View style={[styles.datePill, { backgroundColor: theme.purple }]}>
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              {formatDayLong(dateKey, language)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Select
            label={t('schedule.month')}
            value={monthKey}
            options={monthOptions(today, language)}
            onChange={changeMonth}
            onCard
            style={styles.flex}
          />
          <View style={styles.flex} />
        </View>
        <DayStrip
          today={today}
          openDays={store?.openDays}
          year={year}
          month={month}
          day={day}
          onChange={(d) => {
            setDay(d);
            setSelectedSlot(null);
          }}
        />

        {!store ? (
          <ThemedText type="small" style={[styles.empty, { color: theme.cardTextSecondary }]}>
            {t('schedule.selectStore')}
          </ThemedText>
        ) : slots.isLoading ? (
          <ActivityIndicator style={styles.empty} color={theme.primary} />
        ) : slots.isError ? (
          <ThemedText type="small" style={[styles.empty, { color: theme.danger }]}>
            {errorMessage(slots.error)}
          </ThemedText>
        ) : closedDay ? (
          <ThemedText type="smallBold" style={[styles.empty, { color: theme.cardTextSecondary }]}>
            {t('schedule.closedDay')}
          </ThemedText>
        ) : !slots.data?.length ? (
          <ThemedText type="small" style={[styles.empty, { color: theme.cardTextSecondary }]}>
            {t('schedule.noSlots')}
          </ThemedText>
        ) : (
          <SlotGrid
            slots={slots.data ?? []}
            maxPerSlot={store.maxPerSlot}
            blockWhenFull={store.blockWhenFull}
            limitUnit={store.limitUnit}
            isDarkStore={store.isDarkStore}
            selected={selectedSlot}
            now={nowSlotStart(new Date())}
            onSelect={(start) => {
              setSelectedSlot(start);
              setMessage(null);
            }}
          />
        )}
      </View>

      <Banner message={inactive ? { type: 'error', text: t('hint.inactiveUser') } : message} />

      <View style={styles.actions}>
        {hasChoices ? <Button label={t('user.reset')} variant="text" onPress={() => setConfirmReset(true)} /> : null}
        <Button
          label={session ? t('user.submit') : t('user.loginToBook')}
          variant="success"
          onPress={book}
          disabled={inactive}
        />
      </View>

      {servicesOpen && store ? (
        <ServicesModal
          storeId={store.id}
          storeName={store.name}
          catalogType={store.catalogType}
          typeLabel={storeTypeLabel(store)}
          initial={picks}
          onClose={() => setServicesOpen(false)}
          onSave={(next) => {
            setPicks(next);
            setServicesOpen(false);
            setMessage(null);
          }}
        />
      ) : null}

      <ConfirmModal
        visible={confirmReset}
        title={t('user.resetTitle')}
        message={t('user.resetMessage')}
        confirmLabel={t('user.resetConfirm')}
        cancelLabel={t('user.resetKeep')}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          reset();
        }}
      />

      {session?.role === 'user' ? <UserEventsTabs /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  storePhoto: {
    width: 64,
    height: 64,
    borderRadius: Spacing.three,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  cardTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 800,
  },
  datePill: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  empty: {
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
  booked: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: Spacing.two,
    paddingLeft: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
  },
});
