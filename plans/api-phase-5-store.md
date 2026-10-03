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

_Fill in when the phase lands._
