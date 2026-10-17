/**
 * Backend switch. Off (default): the in-memory dummy backend in `mock.ts`.
 * On: the Ghoomo REST API described in Api.md.
 *
 * Set in `.env.local` (see `.env.example`) and restart the dev server — EXPO_PUBLIC_ values
 * are inlined at build time.
 */
export const USE_REAL_API = process.env.EXPO_PUBLIC_USE_REAL_API === 'true';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/apis';
