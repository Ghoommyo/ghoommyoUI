import type { Api } from '@/api/client';
import { createHttpApi } from '@/api/http';
import { mockApi } from '@/api/mock';

const baseUrl = process.env.EXPO_PUBLIC_API_URL;

/** Uses the in-memory mock unless `EXPO_PUBLIC_API_URL` points at a real backend. */
export const api: Api = baseUrl ? createHttpApi(baseUrl) : mockApi;

export { ApiError, errorMessage } from '@/api/client';
