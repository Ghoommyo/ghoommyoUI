# Phase 1: Foundation

## Goal

Replace the starter template with the app's skeleton: theme, UI kit, domain types, mock API, session handling, the providers and empty routes.

## Packages

`npx expo install @tanstack/react-query expo-secure-store`

## Changes

**Remove** the starter code: `src/app/explore.tsx`, `src/components/app-tabs*.tsx`, `hint-row.tsx`, `web-badge.tsx`, `animated-icon*` and `ui/collapsible.tsx`, plus the starter-only images they reference.

**Theme** (`src/constants/theme.ts`): add `primary`, `success`, `danger`, `warning`, `accent` (orange), `card`, `cardText`, `slot`, `slotFull`, `slotOver` and `border` tokens. The dark palette matches the reference screenshots (slate `#1F232B`).

**Domain and API**

- `src/types/domain.ts`: `Role`, `Session`, `Store`, `StoreSettings`, `StoreProfile`, `Booking`, `BookingStatus`, `UserProfile`, `Slot`.
- `src/api/client.ts`: the `Api` interface and the `ApiError` class.
- `src/api/mock.ts`: seeded data (2 users, 3 stores, bookings around today) with simulated latency.
- `src/api/http.ts`: a `fetch` wrapper with a Bearer token. The endpoint paths are TODO until a backend exists.
- `src/api/index.ts`: picks the mock or the HTTP client.

**Session**

- `src/auth/token-storage.ts` and `token-storage.web.ts`.
- `src/auth/session.tsx`: `SessionProvider` and `useSession()`.

**Pure helpers** (`src/lib/`): `slots.ts` (`buildSlots`, `slotState`, `daysInMonth`, `bucketEvents`) and `date.ts` (formatting).

**UI kit** (`src/components/ui/`): `Button`, `TextField`, `Select`, `ConfirmModal`, `SegmentedTabs`, `Banner`, `Avatar`, `Screen`, `Brand` (the "GHOOMO" wordmark).

**Routes**: the root `_layout.tsx` (QueryClient, Session, Protected Stack, hides the splash once the session has loaded), the intro `index.tsx`, and placeholder screens for the rest.

## Acceptance

- The app boots on web and native and shows the intro screen. Get started leads to the dashboard placeholder.
- Lint and typecheck pass.
- The `lib/slots.ts` helpers give correct results on sample data.

## Done

- Starter screens, components and images removed. `eslint.config.js` was added the first time `expo lint` ran (it also added `eslint` and `eslint-config-expo` as dev dependencies).
- `src/hooks/use-color-scheme.web.ts` now uses `useSyncExternalStore` for hydration. The old `setState`-in-effect failed the React Compiler lint rule.
- If any query gets a 401, the user is signed out. This is done with a QueryCache subscription in `src/app/_layout.tsx`.
- `buildSlotStarts` creates slots that start before `closeAt`. The mock's Raju Tailor store is open 09:00–22:00, giving 13 hourly slots (9 AM–9 PM) like the reference screenshot.
- The wordmark reads "GHOOMYO", the app's name; the old app's screenshot says "GHOOMO".
- Verified: `tsc` and lint pass; a Node script exercised the slot/date helpers; the web bundle builds and the intro screen renders in headless Chrome.
