import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { ReviewsList } from '@/features/reviews/reviews-list';
import { useStores } from '@/hooks/queries';

/** `/reviews?storeId=…` shows any store's reviews; a signed-in store without the param sees its own. */
export default function ReviewsScreen() {
  const { storeId: param } = useLocalSearchParams<{ storeId?: string }>();
  const { session } = useSession();
  const storeId = param || (session?.role === 'store' ? session.accountId : undefined);
  const stores = useStores();
  const name =
    stores.data?.find((s) => s.id === storeId)?.name ??
    (session?.role === 'store' && storeId === session.accountId ? session.name : undefined);

  if (!storeId) return <Redirect href="/dashboard" />;

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        <ReviewsList
          key={storeId}
          storeId={storeId}
          header={
            <View style={styles.header}>
              <AppHeader title="Reviews" />
              <View style={styles.nameRow}>
                <ThemedText type="default" style={styles.name}>
                  {name ?? 'Store'}
                </ThemedText>
                <Button label="← Dashboard" variant="secondary" size="sm" onPress={() => router.navigate('/dashboard')} />
              </View>
            </View>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    gap: Spacing.three,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
    fontWeight: 700,
  },
});
