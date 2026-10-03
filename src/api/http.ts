import { ApiError, getAuthToken, type Api } from '@/api/client';

/**
 * REST client for the real backend. No backend exists yet, so the paths below
 * are a proposed contract — align them with the server once it's built.
 */
export function createHttpApi(baseUrl: string): Api {
  async function request<T>(path: string, init: { method?: string; body?: unknown } = {}) {
    const token = getAuthToken();
    const response = await fetch(`${baseUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(data?.message ?? `Request failed (${response.status})`, response.status);
    }
    return data as T;
  }

  return {
    signup: (credentials) => request('/auth/signup', { method: 'POST', body: credentials }),
    login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),

    listStores: () => request('/stores'),
    getStore: (storeId) => request(`/stores/${storeId}`),
    getStoreSlots: (storeId, date) => request(`/stores/${storeId}/slots?date=${date}`),
    getStoreMonthSummary: (storeId, year, month) =>
      request(`/stores/${storeId}/summary?year=${year}&month=${month + 1}`),
    getStoreBookings: (storeId, dates) =>
      request(`/stores/${storeId}/bookings?dates=${dates.join(',')}`),

    createBooking: (booking) => request('/bookings', { method: 'POST', body: booking }),
    setBookingStatus: (bookingId, status) =>
      request(`/bookings/${bookingId}/status`, { method: 'PATCH', body: { status } }),
    getMyBookings: () => request('/me/bookings'),

    updateStoreSettings: (storeId, settings) =>
      request(`/stores/${storeId}/settings`, { method: 'PUT', body: settings }),
    updateStoreProfile: (storeId, profile) =>
      request(`/stores/${storeId}/profile`, { method: 'PUT', body: profile }),
    getUserProfile: () => request('/me/profile'),
    updateUserProfile: (profile) => request('/me/profile', { method: 'PUT', body: profile }),
  };
}
