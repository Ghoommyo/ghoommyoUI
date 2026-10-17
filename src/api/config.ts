/**
 * Backend switch. Default: the Ghoomo REST API deployed on Vercel (Api.md).
 *
 * - `EXPO_PUBLIC_USE_REAL_API=false`: the in-memory dummy backend in `mock.ts` instead.
 * - `EXPO_PUBLIC_API_URL`: another Ghoomo server, e.g. a local Next.js server or the stub
 *   (`http://localhost:3000/apis`; `http://10.0.2.2:3000/apis` from the Android emulator).
 *
 * Set them in `.env.local` (see `.env.example`) and restart the dev server — EXPO_PUBLIC_ values
 * are inlined at build time.
 */
export const USE_REAL_API = process.env.EXPO_PUBLIC_USE_REAL_API !== 'false';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ghoommyo-eight.vercel.app/apis';
