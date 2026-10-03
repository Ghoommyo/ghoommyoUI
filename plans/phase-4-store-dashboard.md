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

- Day cells are colored against the day capacity: `maxPerSlot` × the number of slots between open and close. Raju Tailor works out to 3 × 13 = 39 per day.
- Days with 0 visitors show "NA", as in the reference. Today gets a `boxShadow` orange glow, which works on web and on the new architecture. Selected days get a blue outline.
- Selected days are remembered across month changes. There's a Clear button and an "N days selected" hint.
- Rows in the All tab also show a status chip. Accept is hidden on accepted rows and Reject on rejected rows. Only the row being updated shows a spinner.
- `EventCard` and `StatusChip` live in `src/components/event-card.tsx` so the phase 5 events tracker can reuse them.
- `SegmentedTabs` uses `NoInfer` on `value` and `onChange`, the same fix applied to `Select` in phase 2.
- Verified in Chrome via Playwright (390px wide), no console errors:
  - store login shows "Raju Tailor" with "Max Count : 39 per day";
  - today shows 7 visitors;
  - Search with no days selected shows a message;
  - selecting today and tomorrow, then Search, lists 3 open bookings;
  - Accept moves a booking from Open to Accepted;
  - Reject drops today's count from 7 to 5;
  - the All tab works, and so does the previous-month button.
