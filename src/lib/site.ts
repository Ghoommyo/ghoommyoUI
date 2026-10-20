import * as WebBrowser from 'expo-web-browser';

import { API_URL } from '@/api/config';

/** The website (the API's host without `/apis`), where Privacy, Terms and Help live. */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || API_URL.replace(/\/apis\/?$/, '')).replace(/\/$/, '');

export const SUPPORT_EMAIL = 'ghoommyo@gmail.com';

/** Opens a website page (e.g. `/privacy`) in the in-app browser. */
export function openSitePage(path: string) {
  return WebBrowser.openBrowserAsync(`${SITE_URL}${path}`);
}
