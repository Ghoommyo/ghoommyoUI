import type { Api } from '@/api/client';
import { API_URL, USE_REAL_API } from '@/api/config';
import { createGhoomoApi } from '@/api/ghoomo/client';
import { mockApi } from '@/api/mock';

/** Dummy data unless EXPO_PUBLIC_USE_REAL_API=true (see src/api/config.ts). */
export const api: Api = USE_REAL_API ? createGhoomoApi(API_URL) : mockApi;

export { ApiError, errorMessage } from '@/api/client';
