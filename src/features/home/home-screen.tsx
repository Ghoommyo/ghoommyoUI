import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { RatingBadge } from '@/components/ui/stars';
import { StorePhoto } from '@/components/ui/store-photo';
import { Spacing } from '@/constants/theme';
import { useStores } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { storeTypeLabel } from '@/lib/order-types';
import { groupStoresByType } from '@/lib/store-groups';
import type { Store } from '@/types/domain';

const TOP = 6;

/** Home: store types, each with its highest-rated stores. Open to everyone. */
export function HomeScreen() {
  const theme = useTheme();
  const stores = useStores();
  const [type, setType] = useState<string | null>(null);
  const groups = groupStoresByType(stores.data ?? []);
  const shown = type ? groups.filter((g) => g.type === type) : groups;
  const chips = [
    { type: null as string | null, count: stores.data?.length ?? 0 },
    ...groups.map((g) => ({ type: g.type, count: g.stores.length })),
  ];

  return (
    <Screen>
      <AppHeader title="Home" />
      <ThemedText themeColor="textSecondary">Find a store by what it offers. The best rated ones are at the top.</ThemedText>
      {stores.isLoading ? (
        <ActivityIndicator style={styles.empty} color={theme.primary} />
      ) : stores.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(stores.error) }} />
      ) : !groups.length ? (
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          No stores yet.
        </ThemedText>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            accessibilityLabel="Store types">
            {chips.map((chip) => {
              const selected = type === chip.type;
              return (
                <Pressable
                  key={chip.type ?? 'all'}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setType(chip.type)}
                  style={[
                    styles.chip,
                    { borderColor: selected ? theme.primary : theme.border },
                    { backgroundColor: selected ? theme.primary : theme.backgroundElement },
                  ]}>
                  <ThemedText type="smallBold" style={selected ? { color: theme.onPrimary } : undefined}>
                    {chip.type ?? 'All'} ({chip.count})
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
          {shown.map((group) => (
            <View key={group.type} style={styles.group}>
              <View style={styles.groupHeader}>
                <ThemedText type="subtitle" style={styles.groupTitle} accessibilityRole="header">
                  {group.type}
                </ThemedText>
                {!type && group.stores.length > TOP ? (
                  <Pressable accessibilityRole="button" onPress={() => setType(group.type)} hitSlop={8}>
                    <ThemedText type="smallBold" style={{ color: theme.primary }}>
                      See all {group.stores.length}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
              {(type ? group.stores : group.stores.slice(0, TOP)).map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

function StoreCard({ store }: { store: Store }) {
  const theme = useTheme();
  const kind = storeTypeLabel(store);
  const place = [store.profile.city, store.profile.pin].filter(Boolean).join(' ');
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <StorePhoto uri={store.profile.photoUrl} name={store.name} style={styles.cardPhoto} />
      <View style={styles.cardTop}>
        <ThemedText type="smallBold" style={styles.cardName}>
          {store.name}
        </ThemedText>
        <RatingBadge rating={store.rating} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {store.catalogType === 'service' ? 'Services' : 'Products'}
        {kind ? ` · ${kind}` : ''}
        {place ? ` · ${place}` : ''}
      </ThemedText>
      <View style={styles.cardActions}>
        <Button
          label="Book"
          variant="success"
          size="sm"
          accessibilityLabel={`Book at ${store.name}`}
          onPress={() => router.navigate({ pathname: '/dashboard', params: { storeId: store.id } })}
        />
        <Button
          label="Reviews"
          variant="secondary"
          size="sm"
          accessibilityLabel={`Reviews for ${store.name}`}
          onPress={() => router.push({ pathname: '/reviews', params: { storeId: store.id } })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.five,
  },
  chips: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: 22,
    borderWidth: 1,
  },
  group: {
    gap: Spacing.two,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  groupTitle: {
    fontSize: 22,
    lineHeight: 30,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardPhoto: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Spacing.two,
    marginBottom: Spacing.one,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  cardName: {
    flex: 1,
    fontSize: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
