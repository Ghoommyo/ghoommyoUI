# Ghoomyo implementation plan

Ghoomyo is a scheduling and booking app: users find nearby stores and book time slots, and stores manage the bookings they receive. This folder holds the build plan, one file per phase. Tick a phase here when it lands, and fill in the **Done** notes in its file.

## Decisions

- **No backend yet.** All data goes through a typed `Api` interface (`src/api/client.ts`). It uses an in-memory mock (`src/api/mock.ts`) unless `EXPO_PUBLIC_API_URL` is set; then it uses `src/api/http.ts`.
- **Platforms:** iOS, Android and web.
- **Auth:** the JWT is stored with `expo-secure-store` on native and `localStorage` on web (`token-storage.web.ts`).
- **Data fetching:** TanStack Query. After a booking or a status change, the mutation invalidates the affected queries so the screens refetch.
- **Dropdowns:** a custom `Select` modal works the same on all platforms. Native pickers and `@react-native-community/datetimepicker` have no web support.
- **Confirmations:** a custom `ConfirmModal`, because `Alert.alert` does nothing on web.
- **Store map:** a read-only `expo-maps` view on native, and an address card with an "Open in Maps" link on web. `expo-maps` needs a dev build.

### Expo SDK 57 facts (checked against the docs)

- `Drawer` ships in `expo-router/drawer` (SDK 56+). Reanimated, worklets and gesture-handler are already installed.
- `Stack.Protected guard` is available, but `redirectTo` is SDK 58+, so redirects are done explicitly with `router.replace`.
- `expo-maps` supports iOS and Android only, is alpha, and isn't in Expo Go. Android needs a Google Maps API key at `android.config.googleMaps.apiKey`.

## Routes

```
src/app/
  _layout.tsx          providers + root Stack, splash hide
  index.tsx            intro screen (what the app is) → Get started
  (auth)/login.tsx     guard: signed out
  (auth)/signup.tsx
  (app)/_layout.tsx    Drawer (left) with SideMenu
  (app)/dashboard.tsx  store → StoreDashboard, user/guest → UserDashboard
  (app)/events.tsx     user only
  (app)/settings.tsx   store or user settings
  (app)/profile.tsx    store or user profile
  booking.tsx          modal; user session required
```

## Visual references

- [references/user_dash.png](references/user_dash.png): user dashboard (Visitor Schedule card, slot grid, event tabs).
- [references/store_dash.png](references/store_dash.png): store dashboard (month calendar, Search, events tabs).

Where the screenshots and the spec disagree, the spec wins. The menu opens from the left, and users see a read-only status chip instead of Approve/Reject.

## Phases

- [x] [Phase 1: Foundation](phase-1-foundation.md)
- [x] [Phase 2: Auth](phase-2-auth.md)
- [x] [Phase 3: User dashboard and booking](phase-3-user-dashboard.md)
- [x] [Phase 4: Store dashboard](phase-4-store-dashboard.md)
- [x] [Phase 5: Events tracker and side menu](phase-5-events-and-menu.md)
- [x] [Phase 6: Settings and profile](phase-6-settings-and-profile.md)
- [x] [Phase 7: Docs](phase-7-docs.md)

Every phase ends with `npx expo lint` and `npx tsc --noEmit` passing, followed by a commit and a push.

## API integration (branch `api_integration`)

This work connects the UI to the Ghoomo backend described in [`Api.md`](../Api.md). An env flag picks the backend: `EXPO_PUBLIC_USE_REAL_API=true` uses the real API; leaving it unset or setting anything else keeps the built-in dummy data. `.env.example` lists every variable.

Decisions:

- **SHOP locations only.** PLACE locations, which are booked by whole day through `/event` and `/traveller/*`, are hidden for now.
- **Hardcoded values for missing fields.** The API has nowhere to store some fields, so in API mode they get hardcoded values from `API_DEFAULTS` until the API supports them: max people per booking, store-name edits, state, map coordinates, and the user's name and mobile.
- **Verification uses a stub server** (`scripts/ghoomo-stub.mjs`) built from Api.md, because the real backend can't be run here.

- [x] [API phase 1: Branch, flag and plan docs](api-phase-1-flag.md)
- [x] [API phase 2: Ghoomo client foundation and stub server](api-phase-2-client.md)
- [x] [API phase 3: Auth](api-phase-3-auth.md)
- [x] [API phase 4: Browsing and booking](api-phase-4-booking.md)
- [x] [API phase 5: Store dashboard](api-phase-5-store.md)
- [x] [API phase 6: Settings and profile](api-phase-6-settings-profile.md)
- [x] [API phase 7: Docs and wrap-up](api-phase-7-docs.md)

## Signup and login identity

These are the account rules for signup and login: unique store names with no special characters, usernames for users, and store login by email or store name. The dummy backend handles all of them now; the Ghoomo API changes are pending.

- [x] [Signup and login identity rules](auth-identity.md)
