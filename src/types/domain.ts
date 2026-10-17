export type Role = 'user' | 'store';

export type LimitUnit = 'day' | 'hour' | 'halfHour';

export type BookingStatus = 'pending' | 'accepted' | 'rejected';

/** How the customer gets what they booked. Which ones a store offers: `src/lib/order-types.ts`. */
export type OrderType = 'table' | 'pickup' | 'porter' | 'appointment' | 'homeVisit';

/** What a store's items are called and which order types it offers. */
export type CatalogType = 'product' | 'service';

/** `YYYY-MM-DD`, local time. */
export type DateKey = string;

/** `YYYY-MM-DDTHH:mm`, local time. */
export type SlotStart = string;

export interface Session {
  token: string;
  role: Role;
  /** For stores this is also the store id. */
  accountId: string;
  /** Users: their email. Stores: their login (location) code. */
  email: string;
  /** Display name: the user's name or the store's name. */
  name?: string;
  /** Store login code (Ghoomo `loc_code`); owner endpoints are addressed by it. */
  locCode?: string;
}

/** Users sign in with their email; stores with their email or store name. */
export type Credentials =
  | { role: 'user'; email: string; password: string }
  | { role: 'store'; /** Email, or store name in any case/spacing. */ login: string; password: string };

export type SignupInput =
  /** `username` is a display name and may be shared by several users. */
  | { role: 'user'; username: string; email: string; password: string }
  /** `locationName` is unique per store once normalized (see `storeKey`). */
  | { role: 'store'; locationName: string; email: string; password: string };

export interface SignupResult {
  /** For stores: the code to log in with. */
  loginCode?: string;
}

export interface StoreSettings {
  name: string;
  /** Visitors allowed per `limitUnit`. */
  maxPerSlot: number;
  maxPerBooking: number;
  limitUnit: LimitUnit;
  autoApprove: boolean;
  /** `HH:mm` */
  openAt: string;
  /** `HH:mm` */
  closeAt: string;
  /** No dine-in: bookings are orders (1 each), with no head count. */
  isDarkStore: boolean;
  /** Products (default) or Services: the items' name and the order types offered. */
  catalogType: CatalogType;
  /** How many of each service a booking may include, for services without their own limit. */
  maxServiceQty: number;
}

export interface StoreProfile {
  address: string;
  pin: string;
  city: string;
  state: string;
  country: string;
  bio: string;
  /** Not stored by the Ghoomo API yet, so absent in API mode (no map pin). */
  lat?: number;
  lng?: number;
  /** Navigation link set by the store (Ghoomo `loc_nav`). */
  mapUrl?: string;
}

/** Average stars (1 decimal; null when unrated) and how many ratings. */
export interface RatingSummary {
  average: number | null;
  count: number;
}

export interface Store extends StoreSettings {
  id: string;
  profile: StoreProfile;
  rating: RatingSummary;
}

/** A priced add-on a store offers (e.g. "Haircut ₹200"). */
export interface StoreService {
  id: string;
  name: string;
  /** `''` when unset. */
  description: string;
  /** INR. */
  price: number;
  /** `''` when unset; a placeholder image is shown then. */
  imageUrl: string;
  /** The service's own per-booking limit; null uses the store's `maxServiceQty`. */
  maxQtyOverride: number | null;
  /** The limit that applies: `maxQtyOverride ?? maxServiceQty`. */
  maxQty: number;
}

/** What a store enters to add or edit a service. */
export interface ServiceInput {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  /** null = the store default. */
  maxQty: number | null;
}

/** Service id → quantity picked for a booking. */
export type ServicePicks = Record<string, number>;

/** A service as booked: name and price at booking time. */
export interface BookedService {
  serviceId: string;
  name: string;
  price: number;
  qty: number;
}

export interface UserProfile {
  name: string;
  mobile: string;
}

export interface Booking {
  id: string;
  storeId: string;
  storeName: string;
  userId: string;
  slotStart: SlotStart;
  name: string;
  mobile: string;
  people: number;
  description: string;
  status: BookingStatus;
  createdAt: string;
  /** The customer's own rating; only on the customer's bookings. */
  rating: BookingRating | null;
  /** Services added to the booking; empty when none. */
  services: BookedService[];
  /** Null for bookings made before order types existed. */
  orderType: OrderType | null;
}

export interface BookingRating {
  /** 1–5 */
  stars: number;
  review: string;
}

/** What a customer can change on their own pending/accepted booking. */
export interface BookingChanges {
  /** Appended to the description below a `=====` line. */
  message?: string;
  people?: number;
  mobile?: string;
}

/** A public review of a store. `name` is never an email. */
export interface Review {
  id: string;
  name: string;
  stars: number;
  review: string;
  createdAt: string;
}

export interface ReviewsPage {
  reviews: Review[];
  /** Pass to the next `getReviews` call; null on the last page. */
  nextCursor: string | null;
  /** Only on the first page. */
  summary?: RatingSummary;
}

export type NotificationKind = 'NEW_REQUEST' | 'AUTO_ACCEPTED' | 'ACCEPTED' | 'REJECTED' | 'UPDATED' | 'RATED';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  text: string;
  /** ISO timestamp. */
  createdAt: string;
  read: boolean;
  /** The booking it's about; null if it no longer exists. */
  booking: Booking | null;
}

/** Booking reminders (iOS/Android). Applies to all accepted bookings. */
export interface ReminderSettings {
  enabled: boolean;
  /** 1–72 */
  hoursBefore: number;
}

export interface NewBooking {
  storeId: string;
  slotStart: SlotStart;
  name: string;
  mobile: string;
  people: number;
  description: string;
  services: BookedService[];
  orderType: OrderType;
}

export interface Slot {
  start: SlotStart;
  /** Visitors booked into this slot (rejected bookings excluded). */
  count: number;
}

export interface DaySummary {
  date: DateKey;
  count: number;
}
