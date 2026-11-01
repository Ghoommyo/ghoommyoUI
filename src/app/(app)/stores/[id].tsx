import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, errorMessage } from '@/api';
import { useSession } from '@/auth/session';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AdBanner } from '@/components/ui/ad-banner';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { ServiceImage } from '@/components/ui/service-image';
import { Sheet } from '@/components/ui/sheet';
import { RatingBadge } from '@/components/ui/stars';
import { StorePhoto } from '@/components/ui/store-photo';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ReviewsList } from '@/features/reviews/reviews-list';
import { useGallery, useStorePage, useStoreServices } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatTime } from '@/lib/date';
import { openState } from '@/lib/open-now';
import { catalogLabels, orderTypeLabel } from '@/lib/order-types';
import { formatPrice } from '@/lib/services';
import { openDaysLabel, shortDay } from '@/lib/slots';
import type { GalleryImage, StorePage } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

type Tab = 'reviews' | 'items' | 'gallery';

/** `/stores/{id}`: a store's public profile with Reviews (first), its products or services, and its gallery. */
export default function StoreScreen() {
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { t } = useT();
  const theme = useTheme();
  const store = useStorePage(id);
  const linkedTab: Tab = tabParam === 'items' || tabParam === 'gallery' ? tabParam : 'reviews';
  // The screen stays mounted between stores, so a new link (another store, another tab) resets the tab.
  const link = `${id}/${linkedTab}`;
  const [picked, setPicked] = useState<{ link: string; tab: Tab } | null>(null);
  const tab = picked?.link === link ? picked.tab : linkedTab;
  const setTab = (next: Tab) => setPicked({ link, tab: next });

  if (!store.data) {
    return (
      <ThemedView style={styles.fill}>
        <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
          <View style={styles.content}>
            <AppHeader title={t('storePage.title')} />
            {store.isError ? (
              <Banner
                message={{
                  type: 'error',
                  text:
                    store.error instanceof ApiError && store.error.status === 404
                      ? t('storePage.notFound')
                      : errorMessage(store.error),
                }}
              />
            ) : (
              <ActivityIndicator style={styles.empty} color={theme.primary} />
            )}
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const page = store.data;
  const words = catalogLabels(t, page.catalogType);
  const tabs = [
    { key: 'reviews' as const, label: t('menu.reviews') },
    { key: 'items' as const, label: words.Items },
    ...(page.galleryOn ? [{ key: 'gallery' as const, label: t('gallery.title') }] : []),
  ];
  const shown: Tab = tab === 'gallery' && !page.galleryOn ? 'reviews' : tab;
  const header = (
    <View style={styles.header}>
      <AppHeader title={page.name} />
      <StoreHeader store={page} />
      <SegmentedTabs tabs={tabs} value={shown} onChange={setTab} />
    </View>
  );

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        {shown === 'reviews' ? (
          // The reviews list is the scroller, so it loads more as its end comes into view.
          <ReviewsList key={page.id} storeId={page.id} header={header} />
        ) : (
          <ScrollView contentContainerStyle={[styles.content, styles.scroll]}>
            {header}
            {shown === 'items' ? <ItemsTab storeId={page.id} items={words.items} /> : <GalleryTab storeId={page.id} />}
          </ScrollView>
        )}
        <AdBanner />
      </SafeAreaView>
    </ThemedView>
  );
}

function StoreHeader({ store }: { store: StorePage }) {
  const { t, language } = useT();
  const theme = useTheme();
  const { session } = useSession();
  const state = openState(store);
  const joined = store.joinedOn ? new Date(store.joinedOn) : null;
  const since = [
    store.openSince ? t('storePage.openSince', { year: store.openSince }) : '',
    joined && !Number.isNaN(joined.getTime()) ? t('storePage.joined', { date: formatDate(joined, language) }) : '',
  ].filter(Boolean);
  const address = [store.address.address, store.address.city, store.address.pin, store.address.country]
    .filter(Boolean)
    .join(', ');
  const mapLink =
    store.address.mapUrl ||
    (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '');
  const type = [
    t(store.catalogType === 'service' ? 'catalog.Services' : 'catalog.Products'),
    store.category,
    store.isDarkStore ? t('storeSettings.darkStore') : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const rows: { label: string; value: ReactElement | string }[] = [
    {
      label: t('storePage.hours'),
      value: t('storePage.hoursValue', {
        days: openDaysLabel(store.openDays, t),
        open: formatTime(store.openAt, language),
        close: formatTime(store.closeAt, language),
      }),
    },
    { label: t('storePage.type'), value: type },
    ...(store.orderTypes.length
      ? [{ label: t('storePage.takes'), value: store.orderTypes.map((orderType) => orderTypeLabel(t, orderType)).join(', ') }]
      : []),
    {
      label: t('storePage.address'),
      value: (
        <View style={styles.addressValue}>
          <ThemedText type="small" themeColor={address ? 'text' : 'textSecondary'}>
            {address || t('storePage.noAddress')}
          </ThemedText>
          {mapLink ? (
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(mapLink)} hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {t('profile.openInMaps')}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ),
    },
  ];

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <StorePhoto uri={store.photoUrl} name={store.name} style={styles.photo} />
      <View style={styles.chipRow}>
        <View style={[styles.chip, { backgroundColor: state.open ? theme.success : theme.backgroundSelected }]}>
          <ThemedText type="smallBold" style={state.open ? { color: theme.onPrimary } : undefined}>
            {state.open
              ? t('storePage.openNow', { time: formatTime(state.closesAt, language) })
              : state.day === null
                ? t('storePage.opensToday', { time: formatTime(state.opensAt, language) })
                : t('storePage.opensOn', { day: shortDay(t, state.day), time: formatTime(state.opensAt, language) })}
          </ThemedText>
        </View>
        <RatingBadge rating={store.rating} />
      </View>
      {store.bio ? <ThemedText>{store.bio}</ThemedText> : null}
      {since.length ? (
        <ThemedText type="small" themeColor="textSecondary">
          {since.join(' · ')}
        </ThemedText>
      ) : null}
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <ThemedText type="smallBold" style={styles.rowLabel}>
            {row.label}
          </ThemedText>
          <View style={styles.rowValue}>
            {typeof row.value === 'string' ? <ThemedText type="small">{row.value}</ThemedText> : row.value}
          </View>
        </View>
      ))}
      {/* Stores don't book; customers and guests do (guests are asked to log in there). */}
      {session?.role !== 'store' ? (
        <View style={styles.book}>
          <Button
            label={t('home.book')}
            variant="success"
            accessibilityLabel={t('app.bookAt', { name: store.name })}
            onPress={() => router.navigate({ pathname: '/dashboard', params: { storeId: store.id } })}
          />
        </View>
      ) : null}
    </View>
  );
}

function ItemsTab({ storeId, items }: { storeId: string; items: string }) {
  const { t } = useT();
  const theme = useTheme();
  const services = useStoreServices(storeId);
  if (services.isLoading) return <ActivityIndicator style={styles.empty} color={theme.primary} />;
  if (services.isError) return <Banner message={{ type: 'error', text: errorMessage(services.error) }} />;
  if (!services.data?.length) {
    return (
      <ThemedText themeColor="textSecondary" style={styles.empty}>
        {t('storePage.noItems', { items })}
      </ThemedText>
    );
  }
  return (
    <View style={styles.list}>
      {services.data.map((service) => (
        <View key={service.id} style={[styles.item, { backgroundColor: theme.backgroundElement }]}>
          <ServiceImage uri={service.imageUrl} size={72} />
          <View style={styles.itemText}>
            <View style={styles.itemTop}>
              <ThemedText type="smallBold" style={styles.itemName}>
                {service.name}
              </ThemedText>
              <ThemedText type="smallBold">{formatPrice(service.price)}</ThemedText>
            </View>
            {service.productType ? (
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {service.productType}
              </ThemedText>
            ) : null}
            {service.description ? (
              <ThemedText type="small" themeColor="textSecondary">
                {service.description}
              </ThemedText>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function GalleryTab({ storeId }: { storeId: string }) {
  const { t } = useT();
  const theme = useTheme();
  const gallery = useGallery(storeId);
  const [open, setOpen] = useState<number | null>(null);
  if (gallery.isLoading) return <ActivityIndicator style={styles.empty} color={theme.primary} />;
  if (gallery.isError) return <Banner message={{ type: 'error', text: errorMessage(gallery.error) }} />;
  const images = gallery.data ?? [];
  if (!images.length) {
    return (
      <ThemedText themeColor="textSecondary" style={styles.empty}>
        {t('storePage.noPictures')}
      </ThemedText>
    );
  }
  const shown: GalleryImage | null = open === null ? null : (images[open] ?? null);
  const pictureName = (i: number) => images[i].caption || t('storePage.pictureOf', { count: i + 1, total: images.length });
  return (
    <>
      <View style={styles.grid}>
        {images.map((image, i) => (
          <Pressable
            key={image.id}
            accessibilityRole="imagebutton"
            accessibilityLabel={pictureName(i)}
            onPress={() => setOpen(i)}
            style={styles.cell}>
            <Image
              source={{ uri: image.imageUrl }}
              contentFit="cover"
              accessibilityIgnoresInvertColors
              style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]}
            />
            {image.caption ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {image.caption}
              </ThemedText>
            ) : null}
          </Pressable>
        ))}
      </View>
      <Sheet visible={shown !== null} title={open === null ? '' : pictureName(open)} onClose={() => setOpen(null)}>
        {shown ? (
          <Image
            source={{ uri: shown.imageUrl }}
            contentFit="contain"
            accessibilityLabel={shown.caption || undefined}
            style={styles.full}
          />
        ) : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  scroll: {
    paddingBottom: Spacing.six,
  },
  header: {
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 320,
    borderRadius: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rowLabel: {
    width: 84,
  },
  rowValue: {
    flex: 1,
  },
  addressValue: {
    gap: Spacing.one,
  },
  book: {
    flexDirection: 'row',
    marginTop: Spacing.one,
  },
  list: {
    gap: Spacing.two,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  itemText: {
    flex: 1,
    gap: Spacing.half,
  },
  itemTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  itemName: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cell: {
    width: '48.5%',
    gap: Spacing.one,
  },
  thumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Spacing.three,
  },
  full: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.five,
  },
});
