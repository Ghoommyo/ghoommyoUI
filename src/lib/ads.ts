import { Platform } from 'react-native';
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  MaxAdContentRating,
  TestIds,
} from 'react-native-google-mobile-ads';

/**
 * Google AdMob (plans/phase-29-ads.md in the web repo). Ads show only when the admin's
 * "Show ads" switch is on and this build has a banner ID; development builds always use
 * Google's test banner, so we never click our own real ads.
 */
const RELEASE_BANNER_ID =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS
    : process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID;

export const BANNER_ID = __DEV__ ? TestIds.ADAPTIVE_BANNER : RELEASE_BANNER_ID || null;

/** Every ad request: not personalised (no tracking, so no iPhone tracking prompt). */
export const AD_REQUEST = { requestNonPersonalizedAdsOnly: true };

let started: Promise<boolean> | null = null;

/**
 * Asks for consent where the law needs it (Google's form, EU/UK only), then starts the SDK
 * limited to general-audience ads. Runs once; resolves to whether ads may be requested.
 */
export function startAds(): Promise<boolean> {
  started ??= (async () => {
    let canRequestAds = true;
    try {
      ({ canRequestAds } = await AdsConsent.gatherConsent());
    } catch {
      // No consent form could be loaded: Google then serves only limited ads, which is fine.
    }
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.G,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await mobileAds().initialize();
    return canRequestAds;
  })().catch(() => false);
  return started;
}

/** Whether the user must be offered "Privacy choices" (Google decides; EU/UK users). */
export async function privacyChoicesRequired(): Promise<boolean> {
  try {
    const info = await AdsConsent.getConsentInfo();
    return info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  } catch {
    return false;
  }
}

export function showPrivacyChoices() {
  return AdsConsent.showPrivacyOptionsForm().catch(() => undefined);
}
