import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/api';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AdBanner } from '@/components/ui/ad-banner';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { StoreCard } from '@/features/stores/store-card';
import { useSearchStores } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import type { StorePage } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

/** Explore stores: search by name, 20 at a time, more as the end of the list comes into view. Open to everyone. */
export default function ExploreScreen() {
  const { t } = useT();
  const theme = useTheme();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(q ?? '');
  const [query, setQuery] = useState(q ?? '');
  // Search once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const stores = useSearchStores(query);
  const list = stores.data?.pages.flatMap((page) => page.stores) ?? [];

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        <FlatList
          data={list}
          keyExtractor={(store) => store.id}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (stores.hasNextPage && !stores.isFetchingNextPage && !stores.isFetchNextPageError) stores.fetchNextPage();
          }}
          ListHeaderComponent={
            <View style={styles.header}>
              <AppHeader title={t('explore.title')} />
              <TextField
                label={t('explore.search')}
                value={text}
                onChangeText={setText}
                placeholder={t('explore.searchPlaceholder')}
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={() => setQuery(text.trim())}
              />
              {stores.isError && !stores.data ? (
                <Banner message={{ type: 'error', text: errorMessage(stores.error) }} />
              ) : null}
            </View>
          }
          renderItem={({ item }) => <ExploreCard store={item} />}
          ListEmptyComponent={
            stores.isLoading ? (
              <ActivityIndicator style={styles.empty} color={theme.primary} />
            ) : stores.isError ? null : (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                {query ? t('explore.none', { query }) : t('explore.noStores')}
              </ThemedText>
            )
          }
          ListFooterComponent={
            stores.isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={theme.primary} />
            ) : stores.isFetchNextPageError ? (
              <View style={styles.footer}>
                <Banner message={{ type: 'error', text: t('explore.loadMoreFailed') }} />
                <Button label={t('explore.loadMore')} variant="secondary" onPress={() => stores.fetchNextPage()} />
              </View>
            ) : list.length > 0 && !stores.hasNextPage ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
                {t('explore.allShown')}
              </ThemedText>
            ) : null
          }
        />
        <AdBanner />
      </SafeAreaView>
    </ThemedView>
  );
}

function ExploreCard({ store }: { store: StorePage }) {
  const { t } = useT();
  const place = [store.address.city, store.address.pin].filter(Boolean).join(' ');
  const line = [t(store.catalogType === 'service' ? 'catalog.Services' : 'catalog.Products'), store.category, place]
    .filter(Boolean)
    .join(' · ');
  return (
    <StoreCard id={store.id} name={store.name} photoUrl={store.photoUrl} bio={store.bio} rating={store.rating} line={line} />
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
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.three,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.five,
  },
  footer: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
});
