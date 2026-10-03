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

_Fill in when the phase lands._
