import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { RatingBadge } from '@/components/ui/stars';
import { StorePhoto } from '@/components/ui/store-photo';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RatingSummary } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

type StoreCardProps = {
  id: string;
  name: string;
  photoUrl: string;
  bio: string;
  rating: RatingSummary;
  /** "Products · Bakery · Pune 411001". */
  line: string;
};

/** A store in a list (Home, Explore stores): photo, name, stars, a line about it, its bio, Book and Profile. */
export function StoreCard({ id, name, photoUrl, bio, rating, line }: StoreCardProps) {
  const { t } = useT();
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <StorePhoto uri={photoUrl} name={name} style={styles.photo} />
      <View style={styles.top}>
        <ThemedText type="smallBold" style={styles.name}>
          {name}
        </ThemedText>
        <RatingBadge rating={rating} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {line}
      </ThemedText>
      {bio ? (
        <ThemedText type="small" numberOfLines={2}>
          {bio}
        </ThemedText>
      ) : null}
      <View style={styles.actions}>
        <Button
          label={t('home.book')}
          variant="success"
          size="sm"
          accessibilityLabel={t('app.bookAt', { name })}
          onPress={() => router.navigate({ pathname: '/dashboard', params: { storeId: id } })}
        />
        <Button
          label={t('home.profile')}
          variant="secondary"
          size="sm"
          accessibilityLabel={t('home.profileNamed', { name })}
          onPress={() => router.push({ pathname: '/stores/[id]', params: { id } })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  photo: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Spacing.two,
    marginBottom: Spacing.one,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
