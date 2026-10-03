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

_Fill in when the phase lands._
