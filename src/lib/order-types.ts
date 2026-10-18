import type { Booking, CatalogType, OrderType, StoreProfile, StoreSettings } from '@/types/domain';

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  table: 'Book table',
  pickup: 'Pickup',
  porter: 'Porter',
  appointment: 'Book appointment',
  homeVisit: 'Book home visit',
};

const TO_API: Record<OrderType, string> = {
  table: 'TABLE',
  pickup: 'PICKUP',
  porter: 'PORTER',
  appointment: 'APPOINTMENT',
  homeVisit: 'HOME_VISIT',
};
const FROM_API = Object.fromEntries(Object.entries(TO_API).map(([k, v]) => [v, k])) as Record<
  string,
  OrderType
>;

export const orderTypeToApi = (type: OrderType) => TO_API[type];
export const orderTypeFromApi = (value: unknown): OrderType | null =>
  FROM_API[String(value ?? '').toUpperCase()] ?? null;

type OrderTypeStore = Pick<StoreSettings, 'isDarkStore' | 'catalogType'> & {
  profile?: Pick<StoreProfile, 'address'>;
};

/** The customer goes to the store for these, so the store needs an address to offer them. */
export const visitsStore = (type: OrderType | null) =>
  type === 'table' || type === 'pickup' || type === 'appointment';
/** The store goes to the customer for these, so the booking needs a delivery address. */
export const needsDeliveryAddress = (type: OrderType | null) => type === 'porter' || type === 'homeVisit';
/** Whether the store entered an address customers can visit. */
export const hasStoreAddress = (store: { profile?: Pick<StoreProfile, 'address'> }) =>
  !!store.profile?.address.trim();

/**
 * The order types a store offers, the first being the default. Stores without an address only
 * offer Porter / Book home visit.
 * Products: Book table / Pickup / Porter (dark stores: Porter / Pickup).
 * Services: Book appointment / Book home visit (dark stores: home visit only).
 */
export function orderTypeChoices(store: OrderTypeStore): OrderType[] {
  const all: OrderType[] =
    store.catalogType === 'service'
      ? store.isDarkStore
        ? ['homeVisit']
        : ['appointment', 'homeVisit']
      : store.isDarkStore
        ? ['porter', 'pickup']
        : ['table', 'pickup', 'porter'];
  // A store without an address can't be visited (only checked when the profile is known).
  return store.profile && !hasStoreAddress(store) ? all.filter((type) => !visitsStore(type)) : all;
}

export function orderTypeOptions(store: OrderTypeStore): { label: string; value: OrderType }[] {
  return orderTypeChoices(store).map((value) => ({ label: ORDER_TYPE_LABEL[value], value }));
}

export const defaultOrderType = (store: OrderTypeStore): OrderType => orderTypeChoices(store)[0];

/** Whether a booking asks how many people are coming: not at dark stores (orders) and not for home visits. */
export const asksPeople = (isDarkStore: boolean | undefined, orderType: OrderType | null) =>
  !isDarkStore && orderType !== 'homeVisit';

/**
 * Whether a booking shows its head count: not for dark-store orders or home visits (always 1),
 * but yes for bookings made before the store went dark (no type, table or appointment).
 */
export const showsPeople = (
  booking: Pick<Booking, 'orderType'>,
  isDarkStore: boolean | undefined,
) =>
  booking.orderType !== 'homeVisit' &&
  (!isDarkStore ||
    booking.orderType === null ||
    booking.orderType === 'table' ||
    booking.orderType === 'appointment');

/** What a slot or day counts: orders at dark stores, visitors elsewhere. */
export const countNoun = (isDarkStore: boolean | undefined, n: number) =>
  isDarkStore ? (n === 1 ? 'order' : 'orders') : n === 1 ? 'visitor' : 'visitors';

/** The store's type of service (e.g. "Plumber") to show customers: service stores with one set, else null. */
export const serviceTypeLabel = (store: Pick<StoreSettings, 'catalogType' | 'serviceType'> | undefined) =>
  store?.catalogType === 'service' && store.serviceType ? store.serviceType : null;

/** How a store's items are called: Products (default) or Services. */
export function catalogWords(catalogType: CatalogType | undefined) {
  const service = catalogType === 'service';
  return {
    Items: service ? 'Services' : 'Products',
    items: service ? 'services' : 'products',
    Item: service ? 'Service' : 'Product',
    item: service ? 'service' : 'product',
  };
}

export type CatalogWords = ReturnType<typeof catalogWords>;
