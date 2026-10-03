# API phase 2: Ghoomo client foundation and stub server

## Goal

Build the typed Ghoomo client and the pure mapping layer. Add a stub server so the API flows can be tested without the real backend.

## Changes

- `src/api/ghoomo/types.ts`: request and response types for each route in Api.md.
- `src/api/ghoomo/mappers.ts`: pure functions that translate between the API and the app:
  - location row → `Store`, with documented defaults when settings are `null`;
  - appointment → `Booking`;
  - `DAY` / `HOUR` / `HALF_HOUR` ↔ `day` / `hour` / `halfHour`;
  - `PENDING` / `ACCEPTED` / `REJECTED` ↔ `pending` / `accepted` / `rejected`;
  - local `YYYY-MM-DDTHH:mm` ↔ ISO UTC;
  - `calendarId(year, month, locId)` → `october2026_<id>_SHOP`;
  - `slotKey('09:00')` → `'9:0'`;
  - calendar `day_details` → slot counts and per-day totals;
  - `API_DEFAULTS` for the fields the API can't store yet.
- `src/api/ghoomo/client.ts`: `createGhoomoApi(baseUrl)` with a `request()` helper that:
  - sends the token exactly as received, already prefixed with `Bearer `;
  - reads errors from either the `error` or the `message` key;
  - lets the caller treat specific statuses, such as the calendar's 404, as empty.
- `src/lib/jwt.ts`: `decodeJwt()` decodes the claims, handling base64url and the `Bearer ` prefix.
- `scripts/ghoomo-stub.mjs` and `npm run stub:api`: an in-memory Node server with no dependencies. It mimics the documented routes, status codes and response shapes, and logs each request.
- The placeholder `src/api/http.ts` is removed.

## Acceptance

- A Node script checks the mappers: time round-trips, slot keys, unit and status mapping, and string numbers.
- `curl` against the stub returns the shapes documented in Api.md.

## Done

- The client's `request()` handles four cases:
  - **Token:** sent exactly as received, with `Bearer ` added only if it's missing.
  - **Network failure:** becomes `ApiError(status 0)` with a "could not reach the server" message.
  - **"Nothing there" statuses:** each call lists them in `emptyOn` (e.g. the calendar's 404), and they resolve to `null`.
  - **Error bodies:** read from either the `error` or the `message` key.
- Until phases 3–6 fill them in, the methods throw `ApiError(501)`.
- `StoreProfile.lat`/`lng` are now optional, and there's a new `mapUrl` field (Ghoomo `loc_nav`).
  - `MapFallback` prefers `mapUrl`, then coordinates, then an address search.
  - `StoreMap` shows no native pin when there are no coordinates.
- The stub (`npm run stub:api`) has:
  - an HS256 JWT signed with HMAC, so a tampered token gets a 401;
  - lazy profile and settings rows, and PUTs that return 404 before the first GET;
  - empty strings ignored on profile PUT;
  - PLACE rows, and a shop (`city_salon`) whose settings are `null`;
  - seeded Raju Tailor appointments, with calendar rows to match.
- Checked with `curl` and a Node mapper script, which covered:
  - local↔ISO round trips;
  - unpadded `"9:0"` keys, and half-hour keys counted in the right hourly slot;
  - the `day` unit;
  - null settings → server defaults;
  - string numbers;
  - JWT UTF-8 decoding.
