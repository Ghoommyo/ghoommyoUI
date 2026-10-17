# API phase 5: Store dashboard

## Goal

The owner's calendar, search, and accept/reject actions run on the Ghoomo API.

## Changes

- The owner's `getStore` combines `GET /location/{locCode}`, `/settings` and `/profile`. The settings and profile rows are created lazily by these GETs.
- `getStoreMonthSummary` adds up each day in the month's SHOP calendar.
- `getStoreBookings` uses `POST /events/all-appointment` with `selected_dates`. The status tabs filter on the client.
- `setBookingStatus` uses `PUT /appointment` with `{apntmnt_id, status}`.

## Acceptance

- Against the stub, the store sees:
  - the counts on its calendar;
  - search results for the selected days;
  - Accept and Reject updating the tabs.

## Done

- `getStore` gets an owner path. When the signed-in token is a location token for that store id, it loads `/location/{code}`, `/settings` and `/profile` in parallel; anyone else gets the public browse row.
- `getStoreBookings` ignores the store id, because the server scopes the results to the token's location.
- **Known API gap:** rejecting a booking doesn't lower the calendar count, because the API has no way to decrement it. In the dummy backend, rejected bookings stop counting; in API mode, the calendar keeps showing the original head-count.
- Each accept or reject refetches the owner's store, which is three GETs. That's fine for now; to trim it, narrow the invalidation in `useSetBookingStatus` to the bookings and month queries.
- **Verified against a fresh stub** (Playwright, all 6 steps, no console errors):
  - "Max Count : 39 per day";
  - today shows 5 visitors;
  - Search lists 2 pending bookings;
  - Accept moves a booking to Accepted, next to the seeded accepted one;
  - Reject moves one to Rejected;
  - the All tab shows 3.
