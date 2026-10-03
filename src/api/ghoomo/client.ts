import { ApiError, getAuthToken, type Api } from '@/api/client';
import { toLocationCode } from '@/api/ghoomo/mappers';
import type { GhoomoLocationClaims, GhoomoUserClaims } from '@/api/ghoomo/types';
import { decodeJwt } from '@/lib/jwt';
import type { Session } from '@/types/domain';

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

type TokenResponse = { message: string; token: string };

export function createGhoomoApi(baseUrl: string): Api {
  const request = createRequest(baseUrl);

  return {
    async signup(input) {
      if (input.role === 'user') {
        await request('/signup', {
          method: 'POST',
          body: { user_name: input.email, password: input.password, confirmPassword: input.password },
        });
        return {};
      }
      await request('/location/signup', {
        method: 'POST',
        body: {
          location_name: input.locationName,
          location_type: 'SHOP',
          email: input.email,
          password: input.password,
          confirmPassword: input.password,
        },
      });
      return { loginCode: toLocationCode(input.locationName) };
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
          name: claims.userName.split('@')[0],
        };
      }
      const res = await request<TokenResponse>('/location/signin', {
        method: 'POST',
        body: { location_code: credentials.locationCode, password: credentials.password },
      });
      const claims = decodeJwt<GhoomoLocationClaims>(res!.token);
      if (claims.locType !== 'SHOP') {
        throw new ApiError('Only shop accounts can use this app for now.', 403);
      }
      return {
        token: res!.token,
        role: 'store',
        accountId: claims.userId,
        email: claims.locCode,
        name: claims.locName,
        locCode: claims.locCode,
      };
    },

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
