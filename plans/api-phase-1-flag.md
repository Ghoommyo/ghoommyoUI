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

- `EXPO_PUBLIC_API_URL` falls back to the default when it's empty, not only when it's missing.
- An uncommitted `ios.bundleIdentifier` change in `app.json`, probably from a local `expo run:ios`, was left out of the branch's commits on purpose.
