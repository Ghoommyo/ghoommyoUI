import type {
  AppNotification,
  Booking,
  BookingChanges,
  BookingRating,
  BookingStatus,
  Credentials,
  DateKey,
  DaySummary,
  NewBooking,
  ReminderSettings,
  ReviewsPage,
  ServiceInput,
  Session,
  SignupInput,
  SignupResult,
  Slot,
  Store,
  StoreProfile,
  StoreService,
  StoreSettings,
  UserProfile,
} from '@/types/domain';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Everything the app needs from the backend. Implemented by the mock and the HTTP client. */
export interface Api {
  signup(input: SignupInput): Promise<SignupResult>;
  login(credentials: Credentials): Promise<Session>;

  listStores(): Promise<Store[]>;
  getStore(storeId: string): Promise<Store>;
  getStoreSlots(storeId: string, date: DateKey): Promise<Slot[]>;
  /** `month` is 0-based. */
  getStoreMonthSummary(storeId: string, year: number, month: number): Promise<DaySummary[]>;
  getStoreBookings(storeId: string, dates: DateKey[]): Promise<Booking[]>;
  /** A store's active services, in the order they were added. Public. */
  getStoreServices(storeId: string): Promise<StoreService[]>;
  /** Owner only, like the other store updates. */
  createService(storeId: string, input: ServiceInput): Promise<StoreService>;
  updateService(storeId: string, serviceId: string, input: ServiceInput): Promise<StoreService>;
  deleteService(storeId: string, serviceId: string): Promise<void>;

  createBooking(booking: NewBooking): Promise<Booking>;
  setBookingStatus(bookingId: string, status: BookingStatus): Promise<Booking>;
  getMyBookings(): Promise<Booking[]>;
  /** The customer edits their own pending/accepted booking; the store is notified. */
  updateBooking(bookingId: string, changes: BookingChanges): Promise<Booking>;
  /** The customer rates (or re-rates) their own accepted booking; the store is notified. */
  rateBooking(bookingId: string, rating: BookingRating): Promise<BookingRating>;
  /** A store's reviews, newest first, 10 per page. Public. */
  getReviews(storeId: string, cursor?: string | null): Promise<ReviewsPage>;

  /** The signed-in account's notifications (latest 50). */
  getNotifications(): Promise<AppNotification[]>;
  markNotificationsRead(ids: string[]): Promise<void>;

  /** Accepted bookings from today on for the signed-in account (user: their bookings; store: its own). */
  getReminderBookings(): Promise<Booking[]>;
  /** The server copy of the reminder setting (kept for auditing). */
  getReminderSettings(): Promise<ReminderSettings>;
  saveReminderSettings(settings: ReminderSettings, platform: 'ios' | 'android' | 'web'): Promise<ReminderSettings>;

  updateStoreSettings(storeId: string, settings: StoreSettings): Promise<Store>;
  updateStoreProfile(storeId: string, profile: StoreProfile): Promise<Store>;
  getUserProfile(): Promise<UserProfile>;
  updateUserProfile(profile: UserProfile): Promise<UserProfile>;
}

let authToken: string | null = null;

/** Set by the session provider; read by API implementations for authenticated calls. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
