import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { StoreCard } from '@/features/stores/store-card';
import { useStores } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { storeTypeLabel } from '@/lib/order-types';
import { groupStoresByType, OTHER_STORES } from '@/lib/store-groups';
import type { Store } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

const TOP = 6;

/** Home: store types, each with its highest-rated stores. Open to everyone. */
export function HomeScreen() {
  const { t } = useT();
  const theme = useTheme();
  const stores = useStores();
  const [type, setType] = useState<string | null>(null);
  const groups = groupStoresByType(stores.data ?? []);
  // Store types are what stores typed; only the catch-all group is ours to translate.
  const typeName = (name: string) => (name === OTHER_STORES ? t('home.otherStores') : name);
  const shown = type ? groups.filter((g) => g.type === type) : groups;
  const chips = [
    { type: null as string | null, count: stores.data?.length ?? 0 },
    ...groups.map((g) => ({ type: g.type, count: g.stores.length })),
  ];

  return (
    <Screen ads>
      <AppHeader title={t('home.title')} />
      <ThemedText themeColor="textSecondary">{t('home.intro')}</ThemedText>
      {stores.isLoading ? (
        <ActivityIndicator style={styles.empty} color={theme.primary} />
      ) : stores.isError ? (
        <Banner message={{ type: 'error', text: errorMessage(stores.error) }} />
      ) : !groups.length ? (
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          {t('home.noStores')}
        </ThemedText>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            accessibilityLabel={t('home.storeTypes')}>
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
                    {chip.type ? typeName(chip.type) : t('home.all')} ({chip.count})
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
          {shown.map((group) => (
            <View key={group.type} style={styles.group}>
              <View style={styles.groupHeader}>
                <ThemedText type="subtitle" style={styles.groupTitle} accessibilityRole="header">
                  {typeName(group.type)}
                </ThemedText>
                {!type && group.stores.length > TOP ? (
                  <Pressable accessibilityRole="button" onPress={() => setType(group.type)} hitSlop={8}>
                    <ThemedText type="smallBold" style={{ color: theme.primary }}>
                      {t('home.seeAll', { count: group.stores.length })}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
              {(type ? group.stores : group.stores.slice(0, TOP)).map((store) => (
                <HomeCard key={store.id} store={store} />
              ))}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

function HomeCard({ store }: { store: Store }) {
  const { t } = useT();
  const kind = storeTypeLabel(store);
  const place = [store.profile.city, store.profile.pin].filter(Boolean).join(' ');
  const line = [t(store.catalogType === 'service' ? 'catalog.Services' : 'catalog.Products'), kind, place].filter(Boolean).join(' · ');
  return (
    <StoreCard
      id={store.id}
      name={store.name}
      photoUrl={store.profile.photoUrl}
      bio={store.profile.bio}
      rating={store.rating}
      line={line}
    />
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
});
