import { ApiError, getAuthToken, type Api } from '@/api/client';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT';
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

const notYet = (name: string) => async (): Promise<never> => {
  throw new ApiError(`${name} is not wired to the Ghoomo API yet.`, 501);
};

export function createGhoomoApi(baseUrl: string): Api {
  createRequest(baseUrl);
  return {
    signup: notYet('signup'),
    login: notYet('login'),
    listStores: notYet('listStores'),
    getStore: notYet('getStore'),
    getStoreSlots: notYet('getStoreSlots'),
    getStoreMonthSummary: notYet('getStoreMonthSummary'),
    getStoreBookings: notYet('getStoreBookings'),
    createBooking: notYet('createBooking'),
    setBookingStatus: notYet('setBookingStatus'),
    getMyBookings: notYet('getMyBookings'),
    updateStoreSettings: notYet('updateStoreSettings'),
    updateStoreProfile: notYet('updateStoreProfile'),
    getUserProfile: notYet('getUserProfile'),
    updateUserProfile: notYet('updateUserProfile'),
  };
}
