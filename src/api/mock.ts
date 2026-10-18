import { ApiError, getAuthToken, type Api } from '@/api/client';
import { addDays, makeDateKey, todayKey } from '@/lib/date';
import { needsDeliveryAddress, orderTypeChoices, orderTypeToApi } from '@/lib/order-types';
import { cleanServiceType, MAX_SERVICE_TYPE_LENGTH, STANDARD_SERVICE_TYPES } from '@/lib/service-types';
import { buildSlotStarts, daysInMonth, visitorCount } from '@/lib/slots';
import { normalizeStoreName, storeKey, validateStoreName } from '@/lib/store-name';
import type {
  SavedAddress,
  AddressInput,
  AppNotification,
  Booking,
  NotificationKind,
  ReminderSettings,
  Review,
  Role,
  ServiceInput,
  Store,
  StoreService,
  UserProfile,
} from '@/types/domain';

/**
 * In-memory backend used until a real API exists. Data resets on reload;
 * the seeded accounts below always exist.
 *
 *   user@ghoomyo.app  / password123  (user, logs in by email)
 *   store@ghoomyo.app / password123  (store "Raju Tailor"; also logs in as "Raju Tailor" or "raju_tailor")
 */

interface Account {
  id: string;
  email: string;
  password: string;
  role: Role;
  /** Stores only: the unique key derived from the store name (`storeKey`). */
  locCode?: string;
  profile: UserProfile;
}

const LATENCY_MS = 250;
const delay = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
let nextId = 1000;
const newId = (prefix: string) => `${prefix}${nextId++}`;

const accounts: Account[] = [
  {
    id: 'u1',
    email: 'user@ghoomyo.app',
    password: 'password123',
    role: 'user',
    profile: { name: 'Asha Verma', mobile: '9876543210' },
  },
  {
    id: 's1',
    email: 'store@ghoomyo.app',
    password: 'password123',
    role: 'store',
    locCode: 'raju_tailor',
    profile: { name: 'Raju Tailor', mobile: '9123456780' },
  },
];

/** Stores as kept in memory; `rating` is computed from `reviews` when they're read. */
type StoreRecord = Omit<Store, 'rating'>;

const stores: StoreRecord[] = [
  {
    id: 's1',
    name: 'Raju Tailor',
    maxPerSlot: 3,
    maxPerBooking: 3,
    limitUnit: 'hour',
    autoApprove: false,
    openAt: '09:00',
    closeAt: '22:00',
    maxServiceQty: 2,
    isDarkStore: false,
    catalogType: 'service',
    serviceType: null,
    profile: {
      address: '12 MG Road',
      pin: '452001',
      city: 'Indore',
      state: 'Madhya Pradesh',
      country: 'India',
      bio: 'Custom tailoring and alterations since 1998.',
      lat: 22.7196,
      lng: 75.8577,
    },
  },
  {
    id: 's2',
    name: 'City Salon',
    maxPerSlot: 2,
    maxPerBooking: 2,
    limitUnit: 'halfHour',
    autoApprove: true,
    openAt: '10:00',
    closeAt: '19:00',
    maxServiceQty: 1,
    isDarkStore: false,
    catalogType: 'service',
    serviceType: 'Barber',
    profile: {
      address: '45 Vijay Nagar',
      pin: '452010',
      city: 'Indore',
      state: 'Madhya Pradesh',
      country: 'India',
      bio: 'Haircuts, styling and grooming.',
      lat: 22.7533,
      lng: 75.8937,
    },
  },
  {
    id: 's3',
    name: 'Green Grocers',
    maxPerSlot: 1000,
    maxPerBooking: 10,
    limitUnit: 'day',
    autoApprove: true,
    openAt: '07:00',
    closeAt: '21:00',
    maxServiceQty: 1,
    // No dine-in: bookings are orders.
    isDarkStore: true,
    catalogType: 'product',
    serviceType: null,
    profile: {
      // No address entered yet, so customers can't visit: only Porter.
      address: '',
      pin: '452001',
      city: 'Indore',
      state: 'Madhya Pradesh',
      country: 'India',
      bio: 'Fresh produce delivered from local farms.',
      lat: 22.7244,
      lng: 75.8839,
    },
  },
];

function seedBookings(): Booking[] {
  const today = todayKey();
  const seed: [number, string, string, number, string, Booking['status']][] = [
    [-3, '11:00', 'Neha', 2, 'Blouse fitting', 'accepted'],
    [-1, '17:00', 'Asha Verma', 1, 'Collect kurta', 'accepted'],
    [0, '10:00', 'Rohit', 3, 'Suit measurements', 'pending'],
    [0, '12:00', 'Asha Verma', 2, 'Alteration pickup', 'pending'],
    [0, '12:00', 'Karan', 2, 'Wedding sherwani', 'accepted'],
    [1, '15:00', 'Asha Verma', 1, 'Trial for dress', 'pending'],
    [2, '19:00', 'Meera', 1, 'Hemming', 'rejected'],
  ];
  return seed.map(([offset, time, name, people, description, status], i) => ({
    id: `b${i + 1}`,
    storeId: 's1',
    storeName: 'Raju Tailor',
    userId: name === 'Asha Verma' ? 'u1' : `guest${i}`,
    slotStart: `${addDays(today, offset)}T${time}`,
    name,
    mobile: '9000000000',
    people,
    description,
    status,
    createdAt: new Date().toISOString(),
    rating: null,
    services: [],
    // The oldest one predates order types.
    orderType: i === 0 ? null : 'appointment',
    deliveryAddress: null,
  }));
}

const bookings: Booking[] = seedBookings();

/** Customers' saved delivery addresses, newest first. */
const addresses: (SavedAddress & { accountId: string })[] = [
  { id: 'addr1', accountId: 'u1', label: 'Home', address: '21 Saket Nagar, Indore 452018' },
];
const MAX_ADDRESSES = 20;

function readAddress(input: AddressInput): AddressInput {
  const address = input.address.trim();
  const label = input.label.trim();
  if (!address || address.length > 500) throw new ApiError('address is required (at most 500 characters)', 400);
  if (label.length > 40) throw new ApiError('label must be at most 40 characters', 400);
  return { label, address };
}

function currentCustomer() {
  const account = currentAccount();
  if (account.role !== 'user') throw new ApiError('Forbidden: user login required', 403);
  return account;
}

/** Types of service stores added through "Other"; every store can pick them. */
const addedServiceTypes = new Set<string>(['Barber']);

/** Validates a type of service and adds it to the list if new; returns the listed spelling. */
function addServiceType(name: string): string {
  const clean = cleanServiceType(name);
  if (!clean || clean.length > MAX_SERVICE_TYPE_LENGTH) {
    throw new ApiError('serviceType must be 1 to 60 characters, or null', 400);
  }
  const listed = [...STANDARD_SERVICE_TYPES, ...addedServiceTypes].find((t) => t.toLowerCase() === clean.toLowerCase());
  if (listed) return listed;
  addedServiceTypes.add(clean);
  return clean;
}

/** Services as kept in memory; the effective `maxQty` is worked out from the store when read. */
interface StoredService extends Omit<StoreService, 'maxQty'> {
  storeId: string;
}

const services: StoredService[] = [
  ['s1', 'Blouse stitching', 'Lined blouse, fitted to your measurements', 450, null],
  ['s1', 'Kurta alteration', 'Take in, let out or shorten', 150, null],
  ['s1', 'Hemming', 'Trousers, skirts or sarees', 80, 1],
  ['s1', 'Express delivery', 'Ready the next day', 200, 1],
  ['s2', 'Haircut', 'Classic cut and wash', 200, null],
  ['s2', 'Beard trim', '', 100, null],
].map(([storeId, name, description, price, maxQtyOverride], i) => ({
  id: `svc${i + 1}`,
  storeId: storeId as string,
  name: name as string,
  description: description as string,
  price: price as number,
  imageUrl: '',
  maxQtyOverride: maxQtyOverride as number | null,
}));

function withMaxQty({ storeId, ...service }: StoredService): StoreService {
  return { ...service, maxQty: service.maxQtyOverride ?? findStore(storeId).maxServiceQty };
}

/** The same rules as the server (Api.md §5.4a). */
function checkServiceInput(input: ServiceInput): ServiceInput {
  const name = input.name.trim();
  if (!name) throw new ApiError('name is required', 400);
  if (!Number.isFinite(input.price) || input.price < 0) throw new ApiError('price must be a number of at least 0', 400);
  if (input.maxQty !== null && (!Number.isInteger(input.maxQty) || input.maxQty < 1)) {
    throw new ApiError('maxQty must be empty or a whole number of at least 1', 400);
  }
  const imageUrl = input.imageUrl.trim();
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) throw new ApiError('imageUrl must start with http:// or https://', 400);
  return { ...input, name, description: input.description.trim(), imageUrl, price: Math.round(input.price * 100) / 100 };
}

function findOwnService(storeId: string, serviceId: string): StoredService {
  requireStoreOwner(storeId);
  const service = services.find((svc) => svc.id === serviceId && svc.storeId === storeId);
  if (!service) throw new ApiError('Service not found', 404);
  return service;
}

interface StoredReview extends Review {
  storeId: string;
  bookingId: string;
  userId: string;
}

/** Seeded reviews for Raju Tailor, so the reviews screen has more than one page. */
function seedReviews(): StoredReview[] {
  const names = ['Neha', 'Karan', 'Meera', 'Rohit', 'Priya', 'Arjun', 'Sana', 'Vikram', 'Isha', 'Dev', 'Anya', 'Kabir'];
  return names.map((name, i) => ({
    id: `r${i + 1}`,
    storeId: 's1',
    bookingId: `seed-booking-${i + 1}`,
    userId: `guest-r${i}`,
    name,
    stars: [5, 4, 5, 3, 4, 5, 2, 4, 5, 4, 3, 5][i],
    review: i % 3 === 2 ? '' : ['Neat stitching and on time.', 'Friendly and quick.', 'Good fit after one trial.'][i % 3],
    createdAt: new Date(Date.now() - (i + 1) * 36e5).toISOString(),
  }));
}

const reviews: StoredReview[] = seedReviews();

interface StoredNotification extends Omit<AppNotification, 'booking'> {
  recipientId: string;
  bookingId: string;
}

const notifications: StoredNotification[] = [];

/** Reminder settings per account id (the real backend keeps an audit trail; the mock keeps the latest). */
const reminderSettings = new Map<string, ReminderSettings>();

function notify(recipientId: string, bookingId: string, kind: NotificationKind, text: string) {
  notifications.push({
    id: newId('n'),
    recipientId,
    bookingId,
    kind,
    text,
    createdAt: new Date().toISOString(),
    read: false,
  });
}

function withRating(store: StoreRecord): Store {
  const own = reviews.filter((r) => r.storeId === store.id);
  const average = own.length ? Math.round((own.reduce((sum, r) => sum + r.stars, 0) / own.length) * 10) / 10 : null;
  return { ...store, rating: { average, count: own.length } };
}

const MOBILE_PATTERN = /^\+?\d{10,15}$/;
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

function currentAccount(): Account {
  const token = getAuthToken();
  const account = token?.startsWith('mock.') && accounts.find((a) => a.id === token.slice(5));
  if (!account) throw new ApiError('Your session has expired. Please log in again.', 401);
  return account;
}

function findStore(storeId: string): StoreRecord {
  const store = stores.find((s) => s.id === storeId);
  if (!store) throw new ApiError('Store not found.', 404);
  return store;
}

function requireStoreOwner(storeId: string) {
  const account = currentAccount();
  if (account.role !== 'store' || account.id !== storeId) {
    throw new ApiError('You can only manage your own store.', 403);
  }
}

export const mockApi: Api = {
  async signup(input) {
    await delay();
    const email = input.email.trim().toLowerCase();
    if (input.role === 'user') {
      // Users log in by email, so it must be unique; usernames may repeat.
      if (accounts.some((a) => a.role === 'user' && a.email === email)) {
        throw new ApiError('Email already registered', 409);
      }
      accounts.push({
        id: newId('u'),
        email,
        password: input.password,
        role: 'user',
        profile: { name: input.username.trim(), mobile: '' },
      });
      return {};
    }

    const nameError = validateStoreName(input.locationName);
    if (nameError) throw new ApiError(nameError, 400);
    const name = normalizeStoreName(input.locationName);
    const locCode = storeKey(name);
    if (accounts.some((a) => a.locCode === locCode)) {
      throw new ApiError('Store name already taken', 409);
    }
    // Stores can log in by email, so it must be unique among stores.
    if (accounts.some((a) => a.role === 'store' && a.email === email)) {
      throw new ApiError('Email already registered', 409);
    }
    const id = newId('s');
    accounts.push({ id, email, password: input.password, role: 'store', locCode, profile: { name, mobile: '' } });
    stores.push({
      id,
      name,
      maxPerSlot: 10,
      maxPerBooking: 4,
      limitUnit: 'hour',
      autoApprove: false,
      openAt: '09:00',
      closeAt: '18:00',
      maxServiceQty: 1,
      isDarkStore: false,
      catalogType: 'product',
      serviceType: null,
      profile: {
        address: '',
        pin: '',
        city: '',
        state: '',
        country: '',
        bio: '',
        lat: 22.7196,
        lng: 75.8577,
      },
    });
    return { loginCode: locCode };
  },

  async login(credentials) {
    await delay();
    let account: Account | undefined;
    if (credentials.role === 'user') {
      const email = credentials.email.trim().toLowerCase();
      account = accounts.find((a) => a.role === 'user' && a.email === email);
    } else {
      // Stores log in with their email or their store name (any case/spacing, or the key itself).
      const login = credentials.login.trim().toLowerCase();
      account = login.includes('@')
        ? accounts.find((a) => a.role === 'store' && a.email === login)
        : accounts.find((a) => a.locCode === storeKey(login));
    }
    if (!account) throw new ApiError('User not found', 404);
    if (account.password !== credentials.password) throw new ApiError('Invalid credentials', 401);
    const store = account.role === 'store' ? stores.find((s) => s.id === account.id) : undefined;
    return {
      token: `mock.${account.id}`,
      role: account.role,
      accountId: account.id,
      email: account.email,
      name: store?.name ?? account.profile.name,
      locCode: account.locCode,
    };
  },

  async listStores() {
    await delay();
    return clone(stores.map(withRating));
  },

  async getStore(storeId) {
    await delay();
    return clone(withRating(findStore(storeId)));
  },

  async getStoreSlots(storeId, date) {
    await delay();
    const store = findStore(storeId);
    const dayBookings = bookings.filter(
      (b) => b.storeId === storeId && b.slotStart.startsWith(date),
    );
    const starts = buildSlotStarts(date, store.openAt, store.closeAt, store.limitUnit);
    if (store.limitUnit === 'day') return [{ start: starts[0], count: visitorCount(dayBookings) }];
    return starts.map((start, i) => {
      const end = starts[i + 1] ?? `${date}T${store.closeAt}`;
      const inSlot = dayBookings.filter((b) => b.slotStart >= start && b.slotStart < end);
      return { start, count: visitorCount(inSlot) };
    });
  },

  async getStoreMonthSummary(storeId, year, month) {
    await delay();
    findStore(storeId);
    return Array.from({ length: daysInMonth(year, month) }, (_, i) => {
      const date = makeDateKey(year, month, i + 1);
      const dayBookings = bookings.filter(
        (b) => b.storeId === storeId && b.slotStart.startsWith(date),
      );
      return { date, count: visitorCount(dayBookings) };
    });
  },

  async getStoreBookings(storeId, dates) {
    await delay();
    requireStoreOwner(storeId);
    const days = new Set(dates);
    return clone(
      bookings
        .filter((b) => b.storeId === storeId && days.has(b.slotStart.slice(0, 10)))
        .sort((a, b) => a.slotStart.localeCompare(b.slotStart)),
    );
  },

  async getAddresses() {
    await delay();
    const account = currentCustomer();
    return clone(addresses.filter((a) => a.accountId === account.id).map(({ accountId: _owner, ...a }) => a));
  },

  async saveAddress(input, addressId) {
    await delay();
    const account = currentCustomer();
    const clean = readAddress(input);
    const own = addresses.filter((a) => a.accountId === account.id);
    if (addressId) {
      const existing = own.find((a) => a.id === addressId);
      if (!existing) throw new ApiError('Address not found', 404);
      Object.assign(existing, clean);
      return clone({ id: existing.id, label: existing.label, address: existing.address });
    }
    // The same address text again returns the saved one instead of a copy.
    const same = own.find((a) => a.address === clean.address);
    if (same) return clone({ id: same.id, label: same.label, address: same.address });
    if (own.length >= MAX_ADDRESSES) {
      throw new ApiError(`You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`, 400);
    }
    const saved = { id: newId('addr'), accountId: account.id, ...clean };
    addresses.unshift(saved);
    return clone({ id: saved.id, label: saved.label, address: saved.address });
  },

  async deleteAddress(addressId) {
    await delay();
    const account = currentCustomer();
    const index = addresses.findIndex((a) => a.id === addressId && a.accountId === account.id);
    if (index < 0) throw new ApiError('Address not found', 404);
    addresses.splice(index, 1);
  },

  async getServiceTypes() {
    await delay();
    return [...STANDARD_SERVICE_TYPES, ...[...addedServiceTypes].sort((a, b) => a.localeCompare(b))];
  },

  async getStoreServices(storeId) {
    await delay();
    findStore(storeId);
    return clone(services.filter((svc) => svc.storeId === storeId).map(withMaxQty));
  },

  async createService(storeId, input) {
    await delay();
    requireStoreOwner(storeId);
    const { maxQty, ...fields } = checkServiceInput(input);
    const service: StoredService = { ...fields, id: newId('svc'), storeId, maxQtyOverride: maxQty };
    services.push(service);
    return clone(withMaxQty(service));
  },

  async updateService(storeId, serviceId, input) {
    await delay();
    const service = findOwnService(storeId, serviceId);
    const { maxQty, ...fields } = checkServiceInput(input);
    Object.assign(service, fields, { maxQtyOverride: maxQty });
    return clone(withMaxQty(service));
  },

  async deleteService(storeId, serviceId) {
    await delay();
    const service = findOwnService(storeId, serviceId);
    services.splice(services.indexOf(service), 1);
  },

  async createBooking(input) {
    await delay();
    const account = currentAccount();
    if (account.role !== 'user') throw new ApiError('Only users can make bookings.', 403);
    const store = findStore(input.storeId);
    if (input.slotStart.slice(0, 10) < todayKey()) {
      throw new ApiError('You cannot book a date in the past.', 400);
    }
    // Dark-store orders and home visits count as 1, whatever the head count.
    const people = store.isDarkStore || input.orderType === 'homeVisit' ? 1 : input.people;
    if (people < 1 || people > store.maxPerBooking) {
      throw new ApiError(`${store.name} allows 1–${store.maxPerBooking} people per booking.`, 400);
    }
    // Stores without an address only take Porter / home visits (orderTypeChoices checks the profile).
    const allowed = orderTypeChoices(store);
    if (!allowed.includes(input.orderType)) {
      const labels = allowed.map(orderTypeToApi);
      const list = labels.length > 1 ? `${labels.slice(0, -1).join(', ')} or ${labels.at(-1)}` : labels[0];
      throw new ApiError(`This store takes ${list} bookings`, 400);
    }
    // Booked services: each one the store's, listed once, within its limit. Name and price are snapshotted.
    const ids = new Set<string>();
    const booked = input.services.map(({ serviceId, qty }) => {
      const stored = services.find((svc) => svc.id === serviceId && svc.storeId === store.id);
      if (!stored || ids.has(serviceId)) throw new ApiError("services contains a service this location doesn't offer", 400);
      ids.add(serviceId);
      const { maxQty } = withMaxQty(stored);
      if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) {
        throw new ApiError(`qty for ${stored.name} must be between 1 and ${maxQty}`, 400);
      }
      return { serviceId, name: stored.name, price: stored.price, qty };
    });
    // Porter and home visits go to the customer, so they need an address; store visits don't keep one.
    const deliveryAddress = needsDeliveryAddress(input.orderType) ? (input.deliveryAddress ?? '').trim() : null;
    if (deliveryAddress !== null && (!deliveryAddress || deliveryAddress.length > 500)) {
      throw new ApiError('delivery_address is required for PORTER and HOME_VISIT bookings (at most 500 characters)', 400);
    }
    const booking: Booking = {
      ...input,
      deliveryAddress,
      people,
      services: booked,
      id: newId('b'),
      storeName: store.name,
      userId: account.id,
      status: store.autoApprove ? 'accepted' : 'pending',
      createdAt: new Date().toISOString(),
      rating: null,
    };
    bookings.push(booking);
    notify(
      store.id,
      booking.id,
      store.autoApprove ? 'AUTO_ACCEPTED' : 'NEW_REQUEST',
      `${booking.name || 'A customer'} requested a booking${store.autoApprove ? ' — auto-approved' : ''}`,
    );
    return clone(booking);
  },

  async setBookingStatus(bookingId, status) {
    await delay();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) throw new ApiError('Booking not found.', 404);
    requireStoreOwner(booking.storeId);
    booking.status = status;
    if (status !== 'pending') {
      notify(booking.userId, booking.id, status === 'accepted' ? 'ACCEPTED' : 'REJECTED', `${booking.storeName} ${status} your booking`);
    }
    return clone(booking);
  },

  async getMyBookings() {
    await delay();
    const account = currentAccount();
    return clone(bookings.filter((b) => b.userId === account.id));
  },

  async updateBooking(bookingId, changes) {
    await delay();
    const account = currentAccount();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking || booking.userId !== account.id) throw new ApiError('Appointment not found', 404);
    if (booking.status === 'rejected') throw new ApiError('Only pending or accepted bookings can be changed', 409);
    const store = findStore(booking.storeId);
    const message = changes.message?.trim() ?? '';
    const people = changes.people ?? booking.people;
    const mobile = changes.mobile?.trim() ?? booking.mobile;
    if (!Number.isInteger(people) || people < 1 || people > store.maxPerBooking) {
      throw new ApiError(`people must be a whole number from 1 to ${store.maxPerBooking}`, 400);
    }
    if (!MOBILE_PATTERN.test(mobile.replace(/[\s-]/g, ''))) throw new ApiError('mobile must be a valid phone number', 400);
    const peopleChanged = people !== booking.people;
    const mobileChanged = mobile !== booking.mobile;
    if (!message && !peopleChanged && !mobileChanged) throw new ApiError('Nothing to change', 400);
    if (peopleChanged && booking.orderType === 'homeVisit') {
      throw new ApiError("Home visits don't have a number of people", 400);
    }
    if (peopleChanged && store.isDarkStore) {
      throw new ApiError("This store takes orders; the number of people can't change", 400);
    }
    if (message) booking.description = `${booking.description}\n=====\n${message}`;
    booking.people = people;
    booking.mobile = mobile;
    const parts = [
      message && 'sent a message',
      peopleChanged && `changed the booking to ${people} ${people === 1 ? 'person' : 'people'}`,
      mobileChanged && 'updated their mobile number',
    ].filter((part): part is string => Boolean(part));
    const said = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
    notify(booking.storeId, booking.id, 'UPDATED', `${booking.name || 'A customer'} ${said}`);
    return clone(booking);
  },

  async rateBooking(bookingId, rating) {
    await delay();
    const account = currentAccount();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking || booking.userId !== account.id) throw new ApiError('Appointment not found', 404);
    if (booking.status !== 'accepted') throw new ApiError('Only accepted bookings can be rated', 409);
    if (!Number.isInteger(rating.stars) || rating.stars < 1 || rating.stars > 5) {
      throw new ApiError('stars must be a whole number from 1 to 5', 400);
    }
    const review = rating.review.trim();
    const existing = reviews.find((r) => r.bookingId === bookingId);
    const name = account.profile.name.trim() || booking.name.trim() || 'Customer';
    if (existing) Object.assign(existing, { stars: rating.stars, review });
    else {
      reviews.push({
        id: newId('r'),
        storeId: booking.storeId,
        bookingId,
        userId: account.id,
        name,
        stars: rating.stars,
        review,
        createdAt: new Date().toISOString(),
      });
    }
    booking.rating = { stars: rating.stars, review };
    const excerpt = review.length > 80 ? `${review.slice(0, 80).trimEnd()}…` : review;
    notify(
      booking.storeId,
      booking.id,
      'RATED',
      `${name} ${existing ? 'updated their rating to' : 'rated your store'} ${stars(rating.stars)}${excerpt ? `: "${excerpt}"` : ''}`,
    );
    return clone(booking.rating);
  },

  async getReviews(storeId, cursor) {
    await delay();
    const own = reviews
      .filter((r) => r.storeId === storeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const start = cursor ? Number(cursor) || 0 : 0;
    const page = own.slice(start, start + 10).map(({ id, name, stars: s, review, createdAt }) => ({
      id,
      name,
      stars: s,
      review,
      createdAt,
    }));
    const next = start + 10 < own.length ? String(start + 10) : null;
    return { reviews: page, nextCursor: next, ...(cursor ? {} : { summary: withRating(findStore(storeId)).rating }) };
  },

  async getNotifications() {
    await delay();
    const account = currentAccount();
    return notifications
      .filter((n) => n.recipientId === account.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50)
      .map(({ recipientId: _recipient, bookingId, ...n }) => ({
        ...n,
        booking: clone(bookings.find((b) => b.id === bookingId) ?? null),
      }));
  },

  async markNotificationsRead(ids) {
    await delay();
    const account = currentAccount();
    for (const n of notifications) if (n.recipientId === account.id && ids.includes(n.id)) n.read = true;
  },

  async getReminderBookings() {
    await delay();
    const account = currentAccount();
    const today = todayKey();
    return clone(
      bookings.filter(
        (b) =>
          b.status === 'accepted' &&
          b.slotStart.slice(0, 10) >= today &&
          (account.role === 'store' ? b.storeId === account.id : b.userId === account.id),
      ),
    );
  },

  async getReminderSettings() {
    await delay();
    return clone(reminderSettings.get(currentAccount().id) ?? { enabled: false, hoursBefore: 1 });
  },

  async saveReminderSettings(settings) {
    await delay();
    if (!Number.isInteger(settings.hoursBefore) || settings.hoursBefore < 1 || settings.hoursBefore > 72) {
      throw new ApiError('hoursBefore must be a whole number from 1 to 72', 400);
    }
    reminderSettings.set(currentAccount().id, { ...settings });
    return clone(settings);
  },

  async updateStoreSettings(storeId, settings) {
    await delay();
    requireStoreOwner(storeId);
    const store = findStore(storeId);
    Object.assign(store, settings, { serviceType: settings.serviceType && addServiceType(settings.serviceType) });
    for (const b of bookings) if (b.storeId === storeId) b.storeName = store.name;
    return clone(withRating(store));
  },

  async updateStoreProfile(storeId, profile) {
    await delay();
    requireStoreOwner(storeId);
    const store = findStore(storeId);
    store.profile = { ...profile };
    return clone(withRating(store));
  },

  async getUserProfile() {
    await delay();
    return clone(currentAccount().profile);
  },

  async updateUserProfile(profile) {
    await delay();
    const account = currentAccount();
    account.profile = { ...profile };
    return clone(account.profile);
  },
};
