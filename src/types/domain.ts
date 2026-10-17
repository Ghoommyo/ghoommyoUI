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

export interface Store extends StoreSettings {
  id: string;
  profile: StoreProfile;
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
