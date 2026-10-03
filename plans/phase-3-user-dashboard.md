# Phase 3: User dashboard and booking

Reference: [references/user_dash.png](references/user_dash.png)

## Goal

Anyone, signed in or not, can pick a store and a day and see how busy each slot is. Signed-in users can book a slot.

## Components (`src/features/user-dashboard/`)

**Layout**

- Header: the GHOOMO wordmark and a Menu button.
- Below it: a store `Select` and "Max Count : N per <unit>".

**Visitor Schedule card** (white, rounded)

- Title "Visitor Schedule", subtitle "Monitor visitors by day and hour", and a purple date pill.
- Month and Day selects.
- `SlotGrid`: slots run from the store's open time to its close time, using `buildSlots`.
- `SlotBlock`: shows the time, a big count and "visitors".
- Block colors come from `slotState`: pale green when ok, amber when full, red when over. A selected block gets a blue border.

**Buttons**

- Reset (red) clears every selection.
- Book (green):
  - with no slot selected, it shows "Time is not selected";
  - for guests it reads "Login to book" and opens login;
  - otherwise it opens the booking modal.

## Booking modal (`src/app/booking.tsx`)

- Fields: name, mobile (10–15 digits), number of people (a Select from 1 to `maxPerBooking`) and description.
- **Cancel** opens a `ConfirmModal` ("Nothing will be saved") and then goes back.
- **Confirm** calls `createBooking`, shows a success message and goes back. The `storeSlots` query is invalidated, so the grid shows the new count.

## Acceptance

- Guests can browse but can't book.
- After a signed-in user books, the slot's count goes up.
- Slots past capacity change color.

## Done

- `src/app/(app)/dashboard.tsx` picks the dashboard by role. The store dashboard is a placeholder until phase 4.
- Slot grid columns depend on the grid's measured width: 3 on phones, 4 at 520px or wider, and 1 for stores whose limit unit is `day`.
- Slots that start in the past are dimmed and can't be selected, since the API rejects past bookings.
- Book with no store selected shows "Store is not selected."; with no slot, "Time is not selected."
- A guest's store selection is kept through "Login to book" → login → dashboard.
- After Confirm, the modal calls `router.dismissTo('/dashboard', { booked, status })`. The dashboard shows "Booking confirmed" if the store auto-approves, or "Booking requested … The store will review it." if not.
- The booking modal pre-fills name and mobile from the user's profile.
- Decorative glyphs (▾, ✓) in `Select` are `aria-hidden`.
- Field errors on selects clear when you pick a value.
- Verified in Chrome via Playwright (390px wide), no console errors:
  - a guest sees 13 hourly slots, with 12 PM marked "over capacity";
  - Login to book goes to login;
  - "Time is not selected" appears when it should;
  - Cancel shows the warning and returns to the dashboard;
  - Confirm validates the form, then the dashboard shows the message and the slot's count goes from 1 to 3 (full);
  - Reset clears the selection.
