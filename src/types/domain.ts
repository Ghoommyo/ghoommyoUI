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
  email: string;
}

export interface Credentials {
  email: string;
  password: string;
  role: Role;
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
  lat: number;
  lng: number;
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
