# Phase 6: Settings and profile

## Packages

`npx expo install expo-maps`

Then add the `expo-maps` plugin to `app.json`, along with `android.config.googleMaps.apiKey` (a placeholder for now; it needs a real key).

## Settings (`(app)/settings.tsx`)

**Store settings**

- Fields: store name, max per slot, max per booking, limit unit (Day / Hour / Half hour), auto-approve switch, and open/close hour selects. Validation: open must be before close, and both limits must be at least 1.
- **Save** calls `updateStoreSettings` and invalidates the store queries.
- **Cancel** resets the form.

**User settings**: show the current app version from `Constants.expoConfig?.version`.

## Profile (`(app)/profile.tsx`)

- **User profile**: name and mobile.
- **Store profile**: address, PIN code, city, state, country and bio, plus the read-only `StoreMap`:
  - **native**: `AppleMaps.View` on iOS and `GoogleMaps.View` on Android, with a marker at the store's coordinates;
  - **web** (`StoreMap.web.tsx`): an address card with an "Open in Maps" `ExternalLink`.

## Acceptance

- Changes to store settings show up on the user dashboard right away: slot length, hours and capacity colors.
- Profile edits persist in the mock for the rest of the session.
- The map renders in a dev build.

## Done

- **Google Maps key:** the Android key comes from the `GOOGLE_MAPS_API_KEY` env var through `app.config.js`, so it isn't committed. Set it locally, or as an EAS environment variable, before Android builds.
- **`StoreMap`:**
  - In a dev build it shows `expo-maps` (AppleMaps on iOS, GoogleMaps on Android with gestures off) above the address card.
  - In Expo Go it shows only the address card. `native-map.tsx` is loaded with `React.lazy`, so Expo Go never evaluates `expo-maps`.
  - On web, `store-map.web.tsx` shows only the address card.
- **Open/close times:** half-hour `Select`s with validation, closing as late as midnight (`24:00`). `Select` lists now open scrolled to the current value.
- **Store settings:** Cancel resets the form to the saved values. Saving invalidates every store query, so the user dashboard picks up the new slot length, hours and capacity right away.
- **User settings:** shows `Constants.expoConfig.version`.
- **Verified:**
  - Chrome via Playwright, no console errors:
    - Cancel resets the form;
    - closing before opening, and a limit of 0, are both rejected;
    - after saving "2 per half hour", the user dashboard shows "2 per half hour" and 26 slots;
    - store profile validates the PIN and saves; the address card updates;
    - user settings shows version 1.0.0;
    - a user profile edit shows up in the side menu.
  - `expo export` builds both the iOS and Android bundles. `expo-doctor` passes 21/21 checks.
  - **Not verified on a device:** the native map, since no simulator is available in this environment.
