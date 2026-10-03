# API phase 4: Browsing and booking

## Goal

A user dashboard and booking flow that run on the Ghoomo API.

## Changes

- `listStores` and `getStore`:
  - read `GET /location` (public, so guests can browse) and keep only `loc_type === 'SHOP'`;
  - parse `max_limit`, which arrives as a string.
- `getStoreSlots`:
  - reads `GET /calendar/{month}{yyyy}_{locId}_SHOP`; a 404 means no bookings yet;
  - adds up the `"H:M"` entries inside each slot built by `buildSlotStarts`.
- `createBooking`:
  - `POST /appointment` with `apntmnt_time` set to the slot start in ISO UTC;
  - then `POST /calendar` with `{calendar_id, days:[day], time:"H:M"}`;
  - if the calendar call fails, the booking stands and only a warning is logged.
- `getMyBookings` merges `GET /events/{coming,inprogress,completed}-events`.

## Known gaps (hardcoded until the API supports them)

- **Max people per booking:** fixed at `API_DEFAULTS.maxPerBooking`.
- **Booking status:** new appointments are always `PENDING` on the server, even when the store auto-approves.
- **Calendar counts:** they don't drop when a booking is rejected, because the API has no way to decrement them.

## Acceptance

- Against the stub:
  - guests can browse SHOPs, and PLACE locations are hidden;
  - a user can book, and the slot count goes up;
  - the booking appears under Events.

## Done

- **`listStores` and `getStore`:** `GET /location` (public), keeping active SHOPs only; a 404 means an empty list.
- **`getStoreSlots`:** fetches the store and that month's calendar in parallel. A 404 on the calendar means no bookings that month, not an error.
- **`createBooking`:**
  - `apntmnt_period` is `HOUR`, or `DAY` for day-unit stores.
  - It returns a `pending` booking.
  - The calendar POST runs inside try/catch: if it fails, the booking stands and a warning is logged.
- **`getMyBookings`:** calls the three `/events/*` endpoints in parallel and de-duplicates by `apntmnt_id`.
- **User profile:** brought forward from phase 6, because the booking modal pre-fills from it.
  - The name is the email prefix and the mobile starts empty (`API_DEFAULTS.userMobile`).
  - Edits live in memory for the session.
- **Bug fixed:** on web, a `Select` or `ConfirmModal` closed just before navigating could stay frozen mid fade-out, drawn over the next screen and catching its taps. The fade is now turned off on web; native keeps it.
- **Verified against the stub** (Playwright, all 6 steps, no console errors):
  - the store list has SHOPs only;
  - City Salon, which has no settings, uses the server defaults (100 per day, one all-day slot);
  - calendar counts show up per slot;
  - Login to book works, and the name is pre-filled;
  - booking tomorrow at 3 PM for 2 people takes that slot from 1 to 3 (full);
  - the booking appears under Coming Events.

  The stub's log shows the payloads match Api.md: UTC `apntmnt_time`, numeric `bokng_cnt`, calendar `time: "15:0"`, and `calendar_id` ending in `_SHOP`.
