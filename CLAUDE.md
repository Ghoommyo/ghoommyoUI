# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Ghoomyo is a scheduling and booking app: users browse stores and book time slots, and stores review the bookings they receive. It's built on Expo SDK 57 (React Native 0.86, React 19.2, strict TypeScript) and targets iOS, Android and web.

The phased build plan, product decisions and reference screenshots are in `plans/` (`plans/README.md` is the index; `plans/references/` holds the target dashboard designs). Each phase's **Done** section records non-obvious choices made along the way.

Don't run `npm run reset-project`. It's left over from the starter template and moves all of `src/` into `example/`.

## Commands

The project uses npm (`package-lock.json`), so use `npx`, not `bunx`.

```bash
npm start                 # expo start (also: npm run ios | android | web)
npx expo lint             # lint (React Compiler rules are enforced)
npx tsc --noEmit          # typecheck
npx expo install <pkg>    # add dependencies
npm run stub:api          # local stand-in for the Ghoomo API on :3000 (see Backend)
```

- **Tests:** there's no test runner yet. Changes have been checked by driving the web build in Chrome with Playwright, with the flag off and on (see each phase's **Done** notes).
- **Generated file:** `expo-env.d.ts` is created by `expo start`. Without it, `tsc` reports a missing type for `@/global.css`.

## Architecture

### Backend

- Screens call the `Api` interface (`src/api/client.ts`) through `api` from `@/api`. Which backend that is depends on a flag in `src/api/config.ts`, set in `.env.local` (see `.env.example`). Restart `expo start` after changing it; `--clear` is safest.
- **Flag off (default):** `api` is the in-memory dummy backend (`src/api/mock.ts`), which resets on every reload.
  - Seeded logins (password `password123`): user `user@ghoomyo.app`; store `store@ghoomyo.app`, which also accepts the store name `Raju Tailor` or `raju_tailor`.
  - Seeded bookings are dated relative to today.
- **`EXPO_PUBLIC_USE_REAL_API=true`:** `api` is the Ghoomo client (`src/api/ghoomo/`), pointed at `EXPO_PUBLIC_API_URL` (default `http://localhost:3000/apis`). `Api.md` is the API reference.
  - `types.ts` holds the wire types.
  - `mappers.ts` holds the pure conversions:
    - units, statuses, and local time ↔ UTC ISO;
    - calendar ids (`october2026_<locId>_SHOP`) and unpadded `"H:M"` slot keys;
    - `API_DEFAULTS`.
  - `client.ts` implements `Api`.
- **Without the real backend,** `npm run stub:api` serves the documented routes in memory and logs each request. Seeded logins (password `Secret@123`): user `asha@example.com`, stores `raju_tailor` and `city_salon` (City Salon has no settings yet). There's also a PLACE location, `taj_mahal`.
- **A new endpoint** needs adding in three places: the `Api` interface, `mock.ts` and `ghoomo/client.ts`. Also add it to `scripts/ghoomo-stub.mjs` to test it.
- **How the Ghoomo API shapes the app:**
  - Only SHOP locations are supported; PLACE locations are filtered out.
  - Account identity rules are in `plans/auth-identity.md`, and the store-name rules are in `src/lib/store-name.ts`:
    - store names are unique, letters/digits/spaces only, and saved as `storeKey` (lowercased, spaces turned into `_`);
    - users have a username, which can be shared;
    - stores log in with their email or their store name.
  - The dummy backend enforces all of this. The Ghoomo API doesn't yet: its client sends the store key as `location_code`, rejects store email login with a "not supported yet" message, and keeps usernames in memory for the session.
  - A booking takes two calls: `POST /appointment`, then `POST /calendar`.
  - Slot and day counts come from the calendar, which doesn't drop when a booking is rejected.
  - Owner routes are addressed by `session.locCode`.
  - Settings and profile rows are created by their GET, so updates GET before they PUT.
- **API gaps:** the API has nowhere to store store name edits, max per booking, state, map coordinates, or the user's name and mobile. Usernames at signup and store login by email aren't supported either. They use `API_DEFAULTS` or session-only values, and are read-only in the UI when the flag is on. Wire each one through when the API supports it.

### Session and auth

- `src/auth/session.tsx` (`useSession`) stores the `Session` (JWT, role, `accountId`, and for stores `locCode`). Ghoomo sessions are built from the JWT claims (`src/lib/jwt.ts`); the token is sent exactly as received, already prefixed with `Bearer `. `src/auth/storage.ts` uses SecureStore; `storage.web.ts` uses localStorage.
- `setAuthToken` gives the API layer the token.
- **For store accounts, `accountId` is also the store id.**
- If any query fails with a 401, the user is signed out (see `src/app/_layout.tsx`).

### Data fetching

- TanStack Query hooks live in `src/hooks/queries.ts`. Queries that belong to an account include the account id in their key.
- Mutations invalidate the queries they affect. For example, a new booking invalidates `['stores', storeId]`, which refreshes slots, the month summary and the store's bookings.

### Routing and guards

- The root `Stack` (`src/app/_layout.tsx`) has the intro (`index`), the `(app)` Drawer, the `(auth)` group (guarded by `!session`) and the `booking` modal (guarded by `role === 'user'`).
- `(app)/_layout.tsx` is a left `Drawer` whose content is `features/side-menu`. `events` requires the user role; `profile` and `settings` require a session.
- `Stack.Protected`'s `redirectTo` doesn't exist until SDK 58, so blocked routes fall back to the anchor. Explicit redirects use `router.replace`.

### Screens

- Route files stay thin and pick the component by role:
  - `dashboard` renders `StoreDashboard` or `UserDashboard`;
  - `settings` and `profile` branch the same way.
- Feature components live in `src/features/<area>/`. Shared UI (`Select`, `ConfirmModal`, `SegmentedTabs`, `Banner`, `Screen`, etc.) is in `src/components/ui/`.

### Cross-platform rules

- Use the `Select` modal, not native pickers, and `ConfirmModal`, not `Alert.alert`, which does nothing on web.
- `.web.ts(x)` siblings override the native versions: `storage`, `use-color-scheme`, `store-map`.
- `expo-maps` only runs in dev builds. `store-map.tsx` lazy-loads it and falls back to an address card in Expo Go and on web.
- The Android Google Maps key comes from `GOOGLE_MAPS_API_KEY` through `app.config.js`.

### Domain rules

- The pure helpers are in `src/lib/slots.ts` and `src/lib/date.ts`.
- **Dates and slot times are local-time strings**, `YYYY-MM-DD` and `YYYY-MM-DDTHH:mm`, never `Date`/ISO with a timezone. That way string comparisons order them correctly.
- Slots run from `openAt` until `closeAt`, stepped by the store's `limitUnit` (`day`, `hour` or `halfHour`).
- In the dummy backend, rejected bookings don't count toward visitor totals. The Ghoomo calendar can't decrement, so with the real API they still count.
- `slotState` marks a slot `full` when its count reaches the max and `over` when it exceeds it.

### Theming

- `src/constants/theme.ts` holds the color tokens. The dark palette follows the reference screenshots.
- Use `useTheme()` or `ThemedText`/`ThemedView` rather than literal colors.
- The React Compiler is on, so don't add manual `useMemo`/`useCallback`. Lint rejects `setState` inside effects and refs read during render.

### Path aliases

`@/*` → `src/*`, `@/assets/*` → `assets/*`.
