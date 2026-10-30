import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import { Platform } from 'react-native';

/**
 * Signs every Ghoomo API request with this app's client key (Api.md §0): only our apps may call
 * the API. Pure-JS HMAC because Hermes has no `crypto.subtle`. Keys are built in at bundle time.
 */
const CLIENT_ID = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
const KEYS: Record<string, string | undefined> = {
  android: process.env.EXPO_PUBLIC_ANDROID_APP_KEY,
  ios: process.env.EXPO_PUBLIC_IOS_APP_KEY,
  web: process.env.EXPO_PUBLIC_WEB_APP_KEY,
};
const KEY = utf8ToBytes(KEYS[CLIENT_ID] ?? '');
export const CLIENT_NOT_ALLOWED = 'CLIENT_NOT_ALLOWED';

/** Server time minus ours, learned from a CLIENT_NOT_ALLOWED response (a wrong phone clock). */
let clockOffset = 0;

/** The three signature headers for a request to the absolute `url`. */
export function signatureHeaders(method: string, url: string): Record<string, string> {
  // The signed path includes the base URL's /apis prefix and any query string.
  const path = url.replace(/^[a-z]+:\/\/[^/]+/i, '');
  const timestamp = String(Date.now() + clockOffset);
  const message = utf8ToBytes(`${timestamp}.${method.toUpperCase()}.${path}`);
  return { 'X-Client-Id': CLIENT_ID, 'X-Timestamp': timestamp, 'X-Signature': bytesToHex(hmac(sha256, KEY, message)) };
}

/**
 * For a rejected signature: adopts the server's clock when ours is off by more than a minute and
 * says whether retrying could help.
 */
export function adoptServerTime(data: { code?: string; serverTime?: number } | null): boolean {
  if (data?.code !== CLIENT_NOT_ALLOWED || !Number.isFinite(Number(data.serverTime))) return false;
  const offset = Number(data.serverTime) - Date.now();
  if (Math.abs(offset - clockOffset) < 60_000) return false;
  clockOffset = offset;
  return true;
}
