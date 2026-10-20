import { storeTypeLabel } from '@/lib/order-types';
import type { Store } from '@/types/domain';

export const OTHER_STORES = 'Other stores';

export type StoreGroup = { type: string; stores: Store[] };

/** Highest rated first (average, then number of ratings); unrated stores last, then by name. */
export function byRating(a: Store, b: Store) {
  const ra = a.rating.average ?? -1;
  const rb = b.rating.average ?? -1;
  return rb - ra || b.rating.count - a.rating.count || a.name.localeCompare(b.name);
}

/**
 * Stores grouped by what kind they are (a product store's category, a service store's type of
 * service; "Other stores" when not set). Groups with more stores come first; "Other stores" last.
 */
export function groupStoresByType(stores: Store[]): StoreGroup[] {
  const groups = new Map<string, Store[]>();
  for (const store of stores) {
    const type = storeTypeLabel(store) ?? OTHER_STORES;
    groups.set(type, [...(groups.get(type) ?? []), store]);
  }
  return [...groups.entries()]
    .map(([type, list]) => ({ type, stores: [...list].sort(byRating) }))
    .sort(
      (a, b) =>
        Number(a.type === OTHER_STORES) - Number(b.type === OTHER_STORES) ||
        b.stores.length - a.stores.length ||
        a.type.localeCompare(b.type),
    );
}
