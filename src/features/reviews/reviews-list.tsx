import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Stars } from '@/components/ui/stars';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useStoreReviews } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { MONTHS } from '@/lib/date';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
};

/**
 * A store's reviews with the rating summary. Loads 10 at a time; the next 10 load as the end of
 * the list comes into view. It is the screen's scroller, so `header` goes above the summary.
 */
export function ReviewsList({ storeId, header }: { storeId: string; header: ReactElement }) {
  const theme = useTheme();
  const reviews = useStoreReviews(storeId);
  const summary = reviews.data?.pages[0]?.summary;
  const list = reviews.data?.pages.flatMap((page) => page.reviews) ?? [];

  return (
    <FlatList
      data={list}
      keyExtractor={(r) => r.id}
      contentContainerStyle={styles.content}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (reviews.hasNextPage && !reviews.isFetchingNextPage) reviews.fetchNextPage();
      }}
      ListHeaderComponent={
        <View style={styles.headerArea}>
          {header}
          {reviews.isError ? <Banner message={{ type: 'error', text: errorMessage(reviews.error) }} /> : null}
          {summary && summary.count > 0 && summary.average !== null ? (
            <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.average}>{summary.average.toFixed(1)}</ThemedText>
              <View style={styles.summaryText}>
                <Stars value={summary.average} size={22} />
                <ThemedText type="small" themeColor="textSecondary">
                  {summary.count} {summary.count === 1 ? 'review' : 'reviews'}
                </ThemedText>
              </View>
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={[styles.review, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.reviewTop}>
            <ThemedText type="smallBold" style={styles.name}>
              {item.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDate(item.createdAt)}
            </ThemedText>
          </View>
          <Stars value={item.stars} size={14} />
          {item.review ? <ThemedText>{item.review}</ThemedText> : null}
        </View>
      )}
      ListEmptyComponent={
        reviews.isLoading ? (
          <ActivityIndicator style={styles.empty} />
        ) : reviews.isError ? null : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No reviews yet.
          </ThemedText>
        )
      }
      ListFooterComponent={
        reviews.isFetchingNextPage ? (
          <ActivityIndicator style={styles.footer} />
        ) : list.length > 0 && !reviews.hasNextPage ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
            That&apos;s all the reviews.
          </ThemedText>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  headerArea: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  average: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: 800,
  },
  summaryText: {
    gap: Spacing.one,
  },
  review: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  reviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.five,
  },
  footer: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
});
