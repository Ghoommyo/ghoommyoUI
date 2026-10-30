import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { queryKeys, useAppConfig } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { AD_REQUEST, BANNER_ID, startAds } from '@/lib/ads';
import { useT } from '@/i18n/language-provider';

/**
 * A Google banner pinned under the screen's content, while the admin has ads switched on.
 * It takes no space until an ad has loaded, and none if it fails (offline, nothing to show).
 */
export function AdBanner() {
  const { t } = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const config = useAppConfig();
  const enabled = config.data?.adsEnabled === true && !!BANNER_ID;
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    startAds().then((ok) => live && setReady(ok));
    return () => {
      live = false;
    };
  }, [enabled]);

  // Coming back to the app re-reads the switch, so turning ads off reaches open apps too.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') queryClient.invalidateQueries({ queryKey: queryKeys.appConfig });
    });
    return () => sub.remove();
  }, [queryClient]);

  if (!enabled || !ready || !BANNER_ID) return null;
  return (
    <View
      accessibilityLabel={t('common.advertisement')}
      style={loaded ? [styles.shown, { paddingBottom: insets.bottom, backgroundColor: theme.background }] : styles.loading}>
      <BannerAd
        unitId={BANNER_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={AD_REQUEST}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setLoaded(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shown: {
    alignItems: 'center',
  },
  // Laid out off to the side so the ad can load without taking space yet.
  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
});
