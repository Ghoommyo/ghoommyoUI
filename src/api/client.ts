import type {
  AddressInput,
  AppNotification,
  Booking,
  BookingChanges,
  BookingRating,
  BookingStatus,
  Credentials,
  DateKey,
  DaySummary,
  EmailCodeRequest,
  EmailCodeSent,
  GalleryImage,
  NewBooking,
  PasswordReset,
  ReminderSettings,
  ReviewsPage,
  ImageKind,
  PickedImage,
  ServiceInput,
  Session,
  SignupInput,
  SignupResult,
  Slot,
  Store,
  StorePage,
  StoreProfile,
  StoreService,
  StoreSettings,
  StoresPage,
  UserProfile,
  SavedAddress,
} from '@/types/domain';
import type { Language } from '@/i18n/languages';
import { say } from '@/i18n/translate';

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
  /** Emails a 6-digit code to verify an email (signup) or reset a password. */
  sendEmailCode(input: EmailCodeRequest): Promise<EmailCodeSent>;
  /** Checks the code; returns the `verificationToken` for `signup` or `resetPassword`. */
  verifyEmailCode(input: EmailCodeRequest & { code: string }): Promise<string>;
  resetPassword(input: PasswordReset): Promise<void>;
  /** Saves the screens' language on the signed-in account (user or store). */
  setLanguage(language: Language): Promise<void>;

  listStores(): Promise<Store[]>;
  getStore(storeId: string): Promise<Store>;
  /** Explore stores: names containing `query` (any case), by name, 20 per page. Public. */
  searchStores(query: string, cursor?: string | null): Promise<StoresPage>;
  /** A store's public profile page. Public. */
  getStorePage(storeId: string): Promise<StorePage>;
  /** A store's gallery as customers see it (empty while the admin has it off). Public. */
  getGallery(storeId: string): Promise<GalleryImage[]>;
  /** The signed-in store's own gallery (also while it's off). */
  getMyGallery(storeId: string): Promise<GalleryImage[]>;
  /** Adds a gallery picture, or edits `imageId`. Needs the gallery turned on; at most 20. */
  saveGalleryImage(storeId: string, input: Omit<GalleryImage, 'id'>, imageId?: string): Promise<GalleryImage>;
  deleteGalleryImage(storeId: string, imageId: string): Promise<void>;
  getStoreSlots(storeId: string, date: DateKey): Promise<Slot[]>;
  /** `month` is 0-based. */
  getStoreMonthSummary(storeId: string, year: number, month: number): Promise<DaySummary[]>;
  getStoreBookings(storeId: string, dates: DateKey[]): Promise<Booking[]>;
  /** A store's active services, in the order they were added. Public. */
  getStoreServices(storeId: string): Promise<StoreService[]>;
  /** App-wide switches the admin sets (for now, whether to show ads). Public. */
  getAppConfig(): Promise<{ adsEnabled: boolean }>;
  /** Types of service a service store can pick: the standard trades, then ones stores added (A–Z). Public. */
  getServiceTypes(): Promise<string[]>;
  /** Categories a product store can pick: the standard ones, then ones stores added (A–Z). Public. */
  getStoreCategories(): Promise<string[]>;
  /** Types a store can give its products (the admin manages the list). Public. */
  getProductTypes(): Promise<string[]>;
  /** The signed-in customer's saved delivery addresses, newest first. */
  getAddresses(): Promise<SavedAddress[]>;
  /** Adds an address, or edits `addressId`. Saving the same text twice returns the existing one. */
  saveAddress(input: AddressInput, addressId?: string): Promise<SavedAddress>;
  deleteAddress(addressId: string): Promise<void>;
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
  /**
   * Uploads a picture and returns its URL, which is then saved on an item, the store profile or the
   * user profile. `item`/`store` need a store whose uploads the admin turned on.
   */
  uploadImage(kind: ImageKind, image: PickedImage): Promise<string>;
  getUserProfile(): Promise<UserProfile>;
  updateUserProfile(profile: UserProfile): Promise<UserProfile>;
  /**
   * Deletes the signed-in customer's or store's account; the password must match. Bookings stay
   * for the other side without personal details, and upcoming ones are cancelled.
   */
  deleteAccount(password: string): Promise<void>;
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
  return say('error.generic');
}
