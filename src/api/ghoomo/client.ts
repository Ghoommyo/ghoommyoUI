import { ApiError, getAuthToken, type Api } from '@/api/client';
import {
  API_DEFAULTS,
  appointmentToBooking,
  calendarId,
  daySummaryFromCalendar,
  fromStatus,
  localToIso,
  locationToStore,
  profileToRequest,
  profileToStore,
  serviceToRequest,
  serviceToStore,
  settingsToRequest,
  settingsToStore,
  slotKey,
  slotsFromCalendar,
} from '@/api/ghoomo/mappers';
import type {
  GhoomoAppointment,
  GhoomoCalendar,
  GhoomoLocation,
  GhoomoLocationClaims,
  GhoomoNotification,
  GhoomoProfile,
  GhoomoReminderSettings,
  GhoomoReviewsResponse,
  GhoomoService,
  GhoomoSettings,
  GhoomoUserClaims,
} from '@/api/ghoomo/types';
import { decodeJwt } from '@/lib/jwt';
import { normalizeStoreName, storeKey } from '@/lib/store-name';
import { parseDateKey } from '@/lib/date';
import { orderTypeFromApi, orderTypeToApi } from '@/lib/order-types';
import type { AppNotification, Booking, NotificationKind, Session, Store, UserProfile } from '@/types/domain';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Statuses that mean "nothing there" for this call; they resolve to `null` instead of throwing. */
  emptyOn?: number[];
};

export type GhoomoRequest = <T>(path: string, options?: RequestOptions) => Promise<T | null>;

/** Fetch wrapper for the Ghoomo API: JSON in/out, token sent as received, errors as ApiError. */
export function createRequest(baseUrl: string): GhoomoRequest {
  return async function request<T>(path: string, { method = 'GET', body, emptyOn = [] }: RequestOptions = {}) {
    const token = getAuthToken();
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          // Sign-in responses already include the "Bearer " prefix (Api.md §1).
          ...(token ? { Authorization: /^Bearer /i.test(token) ? token : `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError('Could not reach the server. Check your connection and API URL.', 0);
    }
    if (emptyOn.includes(response.status)) return null;

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      // Errors use either an `error` or a `message` key.
      const message = data?.error ?? data?.message ?? `Request failed (${response.status})`;
      throw new ApiError(message, response.status);
    }
    return data as T;
  };
}

type TokenResponse = { message: string; token: string };
type EventsResponse = { success: boolean; data: GhoomoAppointment[] };

export function createGhoomoApi(baseUrl: string): Api {
  const request = createRequest(baseUrl);

  /** Claims of the signed-in account; endpoints that need them are only reachable signed in. */
  function claims<T extends GhoomoUserClaims | GhoomoLocationClaims>(): T {
    const token = getAuthToken();
    if (!token) throw new ApiError('Please log in again.', 401);
    return decodeJwt<T>(token);
  }

  // The API has no user-profile endpoints yet: keep edits for this session, keyed by account.
  const userProfiles = new Map<string, UserProfile>();
  // Nor a username on signup: remember it by email for this app session (lost on reload).
  const usernames = new Map<string, string>();
  const displayName = (email: string) =>
    usernames.get(email.toLowerCase()) ?? email.split('@')[0] ?? '';

  /** Active SHOP locations with their settings. GET /location is public, so guests can browse. */
  async function listShops(): Promise<Store[]> {
    const res = await request<{ locationList: GhoomoLocation[] }>('/location', { emptyOn: [404] });
    return (res?.locationList ?? [])
      .filter((row) => row.loc_type === 'SHOP' && row.active !== 0)
      .map((row) => locationToStore(row));
  }

  /** The signed-in owner's location code, or undefined when not signed in as a store. */
  function ownLocCode(): string | undefined {
    const token = getAuthToken();
    if (!token) return undefined;
    const c = decodeJwt<Partial<GhoomoLocationClaims>>(token);
    return c.locCode ? c.locCode : undefined;
  }

  function requireOwnLocCode(): string {
    const locCode = ownLocCode();
    if (!locCode) throw new ApiError('Log in as a store to change its details.', 403);
    return locCode;
  }

  /** Owner view of their store. The settings/profile GETs also create those rows on first use. */
  async function getOwnStore(locCode: string): Promise<Store> {
    const base = `/location/${encodeURIComponent(locCode)}`;
    const [location, settings, profile] = await Promise.all([
      request<{ locationList: GhoomoLocation[] }>(base),
      request<{ locationList: GhoomoSettings[] }>(`${base}/settings`),
      request<{ locationList: GhoomoProfile[] }>(`${base}/profile`),
    ]);
    const row = location?.locationList[0];
    if (!row) throw new ApiError('Store not found.', 404);
    return {
      id: row.user_id,
      name: row.loc_name,
      ...settingsToStore(settings?.locationList[0] ?? {}),
      profile: profileToStore(profile?.locationList[0]),
      // The owner's own rating summary is on the Reviews screen (GET /reviews).
      rating: { average: null, count: 0 },
    };
  }

  async function findShop(storeId: string): Promise<Store> {
    const locCode = ownLocCode();
    if (locCode && claims<GhoomoLocationClaims>().userId === storeId) return getOwnStore(locCode);

    const store = (await listShops()).find((s) => s.id === storeId);
    if (!store) throw new ApiError('Store not found.', 404);
    return store;
  }

  /** A month's SHOP calendar; `null` when nothing has been booked that month (404). */
  async function getCalendar(storeId: string, year: number, month: number) {
    const id = encodeURIComponent(calendarId(year, month, storeId));
    const res = await request<{ calendarDetails: GhoomoCalendar }>(`/calendar/${id}`, { emptyOn: [404] });
    return res?.calendarDetails.day_details ?? null;
  }

  return {
    async signup(input) {
      if (input.role === 'user') {
        // `username` isn't accepted by POST /signup yet; kept locally until it is.
        await request('/signup', {
          method: 'POST',
          body: { user_name: input.email, password: input.password, confirmPassword: input.password },
        });
        usernames.set(input.email.trim().toLowerCase(), input.username.trim());
        return {};
      }
      const name = normalizeStoreName(input.locationName);
      await request('/location/signup', {
        method: 'POST',
        body: {
          location_name: name,
          location_type: 'SHOP',
          email: input.email,
          password: input.password,
          confirmPassword: input.password,
        },
      });
      return { loginCode: storeKey(name) };
    },

    async login(credentials): Promise<Session> {
      if (credentials.role === 'user') {
        const res = await request<TokenResponse>('/signin', {
          method: 'POST',
          body: { user_name: credentials.email, password: credentials.password },
        });
        const claims = decodeJwt<GhoomoUserClaims>(res!.token);
        return {
          token: res!.token,
          role: 'user',
          accountId: claims.userId,
          email: claims.userName,
          name: displayName(claims.userName),
        };
      }
      // POST /location/signin only takes the location code for now; email login needs the API fix.
      if (credentials.login.includes('@')) {
        throw new ApiError(
          "Logging in with email isn't supported by the server yet. Use your store name.",
          400,
        );
      }
      const res = await request<TokenResponse>('/location/signin', {
        method: 'POST',
        body: { location_code: storeKey(credentials.login), password: credentials.password },
      });
      const claims = decodeJwt<GhoomoLocationClaims>(res!.token);
      if (claims.locType !== 'SHOP') {
        throw new ApiError('Only shop accounts can use this app for now.', 403);
      }
      return {
        token: res!.token,
        role: 'store',
        accountId: claims.userId,
        email: claims.locCode, // the location token carries no email
        name: claims.locName,
        locCode: claims.locCode,
      };
    },

    listStores: listShops,
    getStore: findShop,

    async getStoreSlots(storeId, date) {
      const { year, month } = parseDateKey(date);
      const [store, dayDetails] = await Promise.all([
        findShop(storeId),
        getCalendar(storeId, year, month),
      ]);
      return slotsFromCalendar(dayDetails, date, store);
    },

    async getStoreMonthSummary(storeId, year, month) {
      return daySummaryFromCalendar(await getCalendar(storeId, year, month), year, month);
    },

    // The token scopes this to the owner's location; status tabs filter on the client.
    async getStoreBookings(_storeId, dates) {
      const res = await request<{ all_appointments: GhoomoAppointment[] }>(
        '/events/all-appointment',
        { method: 'POST', body: { selected_dates: dates } },
      );
      return (res?.all_appointments ?? [])
        .map(appointmentToBooking)
        .sort((a, b) => a.slotStart.localeCompare(b.slotStart));
    },

    async getStoreServices(storeId) {
      const res = await request<{ services: GhoomoService[] }>(`/services/${encodeURIComponent(storeId)}`);
      return (res?.services ?? []).map(serviceToStore);
    },

    async getServiceTypes() {
      const res = await request<{ serviceTypes: string[] }>('/service-types');
      return res?.serviceTypes ?? [];
    },

    // Owner routes are addressed by the token's location code; the store id isn't needed.
    async createService(_storeId, input) {
      const locCode = requireOwnLocCode();
      const res = await request<{ service: GhoomoService }>(
        `/location/${encodeURIComponent(locCode)}/services`,
        { method: 'POST', body: serviceToRequest(input) },
      );
      return serviceToStore(res!.service);
    },

    async updateService(_storeId, serviceId, input) {
      const locCode = requireOwnLocCode();
      const res = await request<{ service: GhoomoService }>(
        `/location/${encodeURIComponent(locCode)}/services/${encodeURIComponent(serviceId)}`,
        { method: 'PUT', body: serviceToRequest(input) },
      );
      return serviceToStore(res!.service);
    },

    async deleteService(_storeId, serviceId) {
      const locCode = requireOwnLocCode();
      await request(`/location/${encodeURIComponent(locCode)}/services/${encodeURIComponent(serviceId)}`, {
        method: 'DELETE',
      });
    },

    async createBooking(input): Promise<Booking> {
      const store = await findShop(input.storeId);
      const { userId } = claims<GhoomoUserClaims>();
      const createdAt = new Date().toISOString();
      // A dark-store order or a home visit counts as one, whatever the head count.
      const count = store.isDarkStore || input.orderType === 'homeVisit' ? 1 : input.people;
      const res = await request<{ appointmentId: string; status?: string; orderType?: string }>('/appointment', {
        method: 'POST',
        body: {
          loc_id: store.id,
          loc_name: store.name,
          apntmnt_time: localToIso(input.slotStart),
          apntmnt_period: store.limitUnit === 'day' ? 'DAY' : 'HOUR',
          cret_on: createdAt,
          cret_by: input.name,
          bokng_name: input.name,
          bokng_mobile: input.mobile,
          bokng_cnt: count,
          order_type: orderTypeToApi(input.orderType),
          bokng_desc: input.description,
          ...(input.services.length
            ? { services: input.services.map((svc) => ({ svc_id: svc.serviceId, qty: svc.qty })) }
            : {}),
        },
      });
      const appointmentId = res!.appointmentId;

      // Second call adds the head-count to the availability calendar. If it fails the booking
      // still exists (Api.md §6), so don't fail the whole flow.
      const { year, month, day } = parseDateKey(input.slotStart.slice(0, 10));
      try {
        await request('/calendar', {
          method: 'POST',
          body: {
            plan_id: appointmentId,
            count_of_ppl: count,
            type: 'SHOP',
            details: [
              {
                calendar_id: calendarId(year, month, store.id),
                days: [day],
                time: slotKey(input.slotStart.slice(11, 16)),
              },
            ],
          },
        });
      } catch (error) {
        console.warn('Booking saved but the availability calendar was not updated', error);
      }

      return {
        ...input,
        id: appointmentId,
        storeName: store.name,
        userId,
        // Auto-approving stores accept the booking on creation.
        status: res!.status === 'ACCEPTED' ? 'accepted' : 'pending',
        createdAt,
        rating: null,
        people: count,
        // The server's pick when it differs from what was sent (it never should).
        orderType: orderTypeFromApi(res!.orderType) ?? input.orderType,
      };
    },

    async setBookingStatus(bookingId, status) {
      const res = await request<{ appointment: GhoomoAppointment }>('/appointment', {
        method: 'PUT',
        body: { apntmnt_id: bookingId, status: fromStatus(status) },
      });
      return appointmentToBooking(res!.appointment);
    },

    async getMyBookings() {
      const ranges = ['coming-events', 'inprogress-events', 'completed-events'];
      const lists = await Promise.all(
        ranges.map((range) => request<EventsResponse>(`/events/${range}`)),
      );
      const rows = lists.flatMap((res) => res?.data ?? []);
      const unique = new Map(rows.map((row) => [row.apntmnt_id, appointmentToBooking(row)]));
      return [...unique.values()];
    },

    async updateBooking(bookingId, changes) {
      const res = await request<{ appointment: GhoomoAppointment }>(
        `/appointment/${encodeURIComponent(bookingId)}`,
        { method: 'PUT', body: changes },
      );
      return appointmentToBooking(res!.appointment);
    },

    async rateBooking(bookingId, rating) {
      const res = await request<{ rating: { stars: number; review: string } }>(
        `/appointment/${encodeURIComponent(bookingId)}/rating`,
        { method: 'PUT', body: rating },
      );
      return { stars: res!.rating.stars, review: res!.rating.review ?? '' };
    },

    async getReviews(storeId, cursor) {
      const query = new URLSearchParams({ limit: '10', ...(cursor ? { cursor } : {}) });
      const res = await request<GhoomoReviewsResponse>(`/reviews/${encodeURIComponent(storeId)}?${query}`);
      return {
        reviews: res?.reviews ?? [],
        nextCursor: res?.nextCursor ?? null,
        ...(res?.summary ? { summary: res.summary } : {}),
      };
    },

    async getNotifications(): Promise<AppNotification[]> {
      const res = await request<{ notifications: GhoomoNotification[] }>('/notifications');
      return (res?.notifications ?? []).map((n) => ({
        id: n.ntfy_id,
        kind: n.kind as NotificationKind,
        text: n.text,
        createdAt: n.cret_on,
        read: Boolean(n.read_on),
        booking: n.appointment ? appointmentToBooking(n.appointment) : null,
      }));
    },

    async markNotificationsRead(ids) {
      if (ids.length) await request('/notifications/read', { method: 'POST', body: { ids } });
    },

    // The events endpoints are scoped to the caller: a location token gets the store's own bookings.
    async getReminderBookings() {
      const lists = await Promise.all(
        ['inprogress-events', 'coming-events'].map((range) => request<EventsResponse>(`/events/${range}`)),
      );
      const rows = lists.flatMap((res) => res?.data ?? []);
      const unique = new Map(rows.map((row) => [row.apntmnt_id, appointmentToBooking(row)]));
      return [...unique.values()].filter((b) => b.status === 'accepted');
    },

    async getReminderSettings() {
      const res = await request<{ settings: GhoomoReminderSettings }>('/reminder-settings');
      return { enabled: !!res?.settings.enabled, hoursBefore: res?.settings.hoursBefore ?? 1 };
    },

    async saveReminderSettings(settings, platform) {
      const res = await request<{ settings: GhoomoReminderSettings }>('/reminder-settings', {
        method: 'PUT',
        body: { ...settings, platform },
      });
      return { enabled: !!res?.settings.enabled, hoursBefore: res?.settings.hoursBefore ?? settings.hoursBefore };
    },

    // Name and max-per-booking aren't stored by the API yet (see API_DEFAULTS); the rest is saved.
    async updateStoreSettings(_storeId, settings) {
      const locCode = requireOwnLocCode();
      const path = `/location/${encodeURIComponent(locCode)}/settings`;
      await request(path); // creates the row if it doesn't exist; PUT 404s otherwise
      await request(path, { method: 'PUT', body: settingsToRequest(settings) });
      return getOwnStore(locCode);
    },

    async updateStoreProfile(_storeId, profile) {
      const locCode = requireOwnLocCode();
      const path = `/location/${encodeURIComponent(locCode)}/profile`;
      await request(path);
      await request(path, { method: 'PUT', body: profileToRequest(profile) });
      return getOwnStore(locCode);
    },
    async getUserProfile() {
      const { userId, userName } = claims<GhoomoUserClaims>();
      return (
        userProfiles.get(userId) ?? {
          name: userName ? displayName(userName) : '',
          mobile: API_DEFAULTS.userMobile,
        }
      );
    },

    async updateUserProfile(profile) {
      userProfiles.set(claims<GhoomoUserClaims>().userId, profile);
      return profile;
    },
  };
}
