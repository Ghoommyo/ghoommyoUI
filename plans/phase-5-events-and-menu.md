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

- `UserEventsTabs` (`src/features/events/user-events-tabs.tsx`) is shared by the Events screen and the bottom of the user dashboard. Rows show the store's name.
- `SideMenu` is the Drawer's `drawerContent`:
  - The header shows the avatar plus a display name: the profile name for users, the store name for stores, "Guest" when signed out.
  - The current route is highlighted.
  - It navigates with `router.navigate` after closing the drawer.
- Logout cancel only closes the dialog: the drawer stays open on the same screen, as the spec asks. Confirm closes the drawer, signs out and goes to `/login`.
- Signed-out deep links to protected drawer routes (e.g. `/events`) fall back to `/dashboard` through `Drawer.Protected`.
- Verified in Chrome via Playwright, no console errors:
  - the guest menu leads to login;
  - the dashboard's event tabs show Coming, In-Progress and Completed correctly;
  - the user menu items and avatar are right, and the menu leads to Events;
  - cancelling logout keeps the session, confirming goes to login;
  - a signed-out `/events` redirects to the dashboard;
  - the store menu has no Events item.
