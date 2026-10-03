# Phase 5: Events tracker and side menu

## Events tracker (`(app)/events.tsx`, users only)

- Tabs:
  - **Coming**: events from tomorrow onwards.
  - **In-Progress**: events today.
  - **Completed**: events before today.
- The tabs are built from `bucketEvents(getMyBookings())`.
- **`EventRow`** (a blue rounded card): shows the date, time and store name, the description, the number of people, and a status chip (✓ Accepted / ◦ Pending / ✕ Rejected).
- The same `UserEventsTabs` component also appears under the user dashboard when signed in, as in `references/user_dash.png`.

## Side menu (`(app)/_layout.tsx` → `src/features/side-menu/SideMenu.tsx`)

- A `Drawer` from `expo-router/drawer` that opens from the left, triggered by the header Menu button.
- **Signed in**: shows an avatar (initials), the account name or email, and links to Dashboard, Profile, Settings, Events (users only) and Logout.
- **Logout** opens a `ConfirmModal`. Confirming signs out and goes to `/login`; cancelling leaves you on the same screen.
- **Guests**: see Dashboard, Login and Signup.

## Acceptance

- The drawer works on web and native.
- The events buckets are correct relative to today.
- Cancelling a logout leaves the session intact.

## Done

_Fill in when the phase lands._
