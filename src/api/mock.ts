import { ApiError, getAuthToken, type Api } from '@/api/client';
import { addDays, makeDateKey, todayKey } from '@/lib/date';
import { buildSlotStarts, daysInMonth, visitorCount } from '@/lib/slots';
import { normalizeStoreName, storeKey, validateStoreName } from '@/lib/store-name';
import type { Booking, Role, Store, UserProfile } from '@/types/domain';

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

const stores: Store[] = [
  {
    id: 's1',
    name: 'Raju Tailor',
    maxPerSlot: 3,
    maxPerBooking: 3,
    limitUnit: 'hour',
    autoApprove: false,
    openAt: '09:00',
    closeAt: '22:00',
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
    profile: {
      address: '8 Palasia Square',
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
  }));
}

const bookings: Booking[] = seedBookings();

function currentAccount(): Account {
  const token = getAuthToken();
  const account = token?.startsWith('mock.') && accounts.find((a) => a.id === token.slice(5));
  if (!account) throw new ApiError('Your session has expired. Please log in again.', 401);
  return account;
}

function findStore(storeId: string): Store {
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
    return clone(stores);
  },

  async getStore(storeId) {
    await delay();
    return clone(findStore(storeId));
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

  async createBooking(input) {
    await delay();
    const account = currentAccount();
    if (account.role !== 'user') throw new ApiError('Only users can make bookings.', 403);
    const store = findStore(input.storeId);
    if (input.slotStart.slice(0, 10) < todayKey()) {
      throw new ApiError('You cannot book a date in the past.', 400);
    }
    if (input.people < 1 || input.people > store.maxPerBooking) {
      throw new ApiError(`${store.name} allows 1–${store.maxPerBooking} people per booking.`, 400);
    }
    const booking: Booking = {
      ...input,
      id: newId('b'),
      storeName: store.name,
      userId: account.id,
      status: store.autoApprove ? 'accepted' : 'pending',
      createdAt: new Date().toISOString(),
    };
    bookings.push(booking);
    return clone(booking);
  },

  async setBookingStatus(bookingId, status) {
    await delay();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) throw new ApiError('Booking not found.', 404);
    requireStoreOwner(booking.storeId);
    booking.status = status;
    return clone(booking);
  },

  async getMyBookings() {
    await delay();
    const account = currentAccount();
    return clone(bookings.filter((b) => b.userId === account.id));
  },

  async updateStoreSettings(storeId, settings) {
    await delay();
    requireStoreOwner(storeId);
    const store = findStore(storeId);
    Object.assign(store, settings);
    for (const b of bookings) if (b.storeId === storeId) b.storeName = store.name;
    return clone(store);
  },

  async updateStoreProfile(storeId, profile) {
    await delay();
    requireStoreOwner(storeId);
    const store = findStore(storeId);
    store.profile = { ...profile };
    return clone(store);
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
