import type {
  Booking,
  BookingStatus,
  Credentials,
  DateKey,
  DaySummary,
  NewBooking,
  Session,
  SignupInput,
  SignupResult,
  Slot,
  Store,
  StoreProfile,
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

  createBooking(booking: NewBooking): Promise<Booking>;
  setBookingStatus(bookingId: string, status: BookingStatus): Promise<Booking>;
  getMyBookings(): Promise<Booking[]>;

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
