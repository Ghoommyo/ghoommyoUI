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

_Fill in when the phase lands._
