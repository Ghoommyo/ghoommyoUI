export type Role = 'user' | 'store';

export type LimitUnit = 'day' | 'hour' | 'halfHour';

export type BookingStatus = 'pending' | 'accepted' | 'rejected';

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
  /** No dine-in: bookings are orders, so the head count can't change. Read-only in the app. */
  isDarkStore?: boolean;
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
