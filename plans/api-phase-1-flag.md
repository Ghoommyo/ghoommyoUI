# API phase 1: Branch, flag and plan docs

## Goal

Create the `api_integration` branch and add an env flag that chooses between the Ghoomo API and the dummy backend.

## Changes

- `src/api/config.ts`:
  - `USE_REAL_API` comes from `EXPO_PUBLIC_USE_REAL_API === 'true'`.
  - `API_URL` comes from `EXPO_PUBLIC_API_URL`, defaulting to `http://localhost:3000/apis`.
- `src/api/index.ts` returns the HTTP client when the flag is on and `mockApi` otherwise.
- `.env.example` documents the variables. Real values go in `.env.local`, which is gitignored.
- `Api.md` (the API reference) is committed, along with these plan files.

## Acceptance

- With the flag off, the app works exactly as before.
- Typecheck and lint pass.

## Done

_Fill in when the phase lands._
