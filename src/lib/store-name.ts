// Store-name rules shared by the signup form and the dummy backend (which plays the server's role).

import type { Translate } from '@/i18n/translate';

const STORE_NAME_PATTERN = /^[A-Za-z0-9]+( [A-Za-z0-9]+)*$/;

/** Trims and collapses repeated spaces, so `Raju  Tailor ` and `Raju Tailor` are the same store. */
export function normalizeStoreName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** Letters, digits and single spaces only. Returns an error message, or undefined when valid. */
export function validateStoreName(name: string, t: Translate): string | undefined {
  const normalized = normalizeStoreName(name);
  if (!normalized) return t('validation.storeNameRequired');
  if (!STORE_NAME_PATTERN.test(normalized)) return t('validation.storeNameChars');
  if (normalized.length > 60) return t('validation.storeNameLength');
}

/** The unique key a store is saved under: lowercased, spaces → `_` (`Raju Tailor` → `raju_tailor`). */
export function storeKey(name: string): string {
  return normalizeStoreName(name).toLowerCase().replace(/ /g, '_');
}
