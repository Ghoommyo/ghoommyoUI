# Phase 4: Store dashboard

Reference: [references/store_dash.png](references/store_dash.png)

## Goal

A signed-in store sees its monthly load at a glance, picks days, and accepts or rejects the bookings on them.

## Components (`src/features/store-dashboard/`)

**Header**: the GHOOMO wordmark, the store name (the old app showed "undefined" here) and "Max Count : N per day".

**`MonthCalendar`**

- Shows "October, 2026" with round prev/next buttons that have orange chevrons.
- A SUN–SAT header, then a 7-column grid of days.

**`DayCell`**

- A large day number with a count pill below. The pill shows "NA" when the day has no bookings.
- The pill turns amber or red when the day is full or over capacity.
- Today gets an orange glow ring.
- Tapping a day toggles its selection.

**Search**: a green button, aligned right. It fetches `getStoreBookings(storeId, selectedDays)`. With no days selected, it shows a message.

**`EventsTabs`**

- Tabs: Open (pending), Accepted, Rejected and All. The tab bar scrolls horizontally on narrow screens.
- **`BookingRow`**: shows the timestamp, name, number of people and description, plus Accept and Reject buttons.
- After Accept or Reject, `setBookingStatus` runs and the tab lists refetch.

## Acceptance

- Selecting days and pressing Search fills the tabs.
- Accepting a booking moves it from Open to Accepted.
- Month navigation works.

## Done

_Fill in when the phase lands._
