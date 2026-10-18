# Store address for visits, saved delivery addresses

Branch `delivery_addresses` (from `notifications_service_types`). The Next.js repo's `plans/phase-19-addresses.md` is the shared plan (copied below); the backend, the production migration and the web part are done there.

## Context
The booking form picks an order type, but nobody is told **where**:
- For **Book table / Pickup**, and **Book appointment** (agreed), the customer goes to the store, so the form should show the store's address. A store that hasn't entered an address can't offer those types.
- For **Porter**, and **Book home visit** (agreed), the store comes to the customer, so the customer picks a delivery address:
  - a dropdown of saved addresses plus **Other**, which opens a text box
  - a **Save this address** checkbox
  - an **Addresses** page in the user menu to add, edit and delete them
- A saved address is an optional **label** (Home, Office) plus the **full address** as free text (agreed).

Today the store lists don't even carry the store's profile, so customers can't see store addresses at all.

## Rules
| Order type | Customer sees | Needs |
|---|---|---|
| Book table, Pickup, Book appointment | the store's address (address, city, PIN, map link) | the store has an address; otherwise the type isn't offered |
| Porter, Book home visit | a delivery address dropdown | a delivery address is required on the booking |

- Without a store address, the choices are: Product → Porter only; Service → Book home visit only. Dark stores are unchanged (their visit types are already gone). There's always at least one choice.
- **"Has an address"** = the store profile's `loc_address` isn't blank.

## Branches
New branch `delivery_addresses` in both repos, from `notifications_service_types` (the branch being merged). Plan files are `plans/phase-19-addresses.md` (web) and `plans/addresses.md` (app), with README rows. Each major step gets its own commit; push at the end.

## Backend (Next repo)
- **Migration `db/migrations/009_addresses.sql`** (additive; also in `db/schema.sql`):
  - `ghoomo.user_addr_tbl`:
    - `addr_id uuid pk default gen_random_uuid()`, `user_id varchar not null`
    - `addr_label varchar(40)` (null = none), `addr_text varchar(500) not null`
    - `cret_on timestamptz default now()`, `updt_on timestamptz`, `active int not null default 1`
    - index on `user_id where active = 1`
  - `apntmnt_tbl.dlvry_addr text` (null), a snapshot of the address for Porter and home-visit bookings
- **Address book routes** (user token; own rows only, otherwise 404), following `app/apis/traveller/profile/route.tsx`:
  - `GET /apis/traveller/addresses` → `{ addresses: [{ id, label, address }] }`, newest first
  - `POST /apis/traveller/addresses` `{ label?, address }` → 201 `{ address }`:
    - `address` is 1–500 characters (trimmed); `label` is up to 40
    - at most 20 per user (400 beyond that)
    - an exact duplicate of an existing address text returns the existing one, so ticking Save twice doesn't double it
  - `PUT /apis/traveller/addresses/{addressId}` `{ label?, address }` → `{ address }`
  - `DELETE /apis/traveller/addresses/{addressId}` is a soft delete. Past bookings keep their snapshot.
  - SQL goes in `QUERIES_FIRED`; add `ADDRESS_TABLE` to `tablesName.tsx`
- **Store lists** (`GET_LOCATIONS_WITH_SETTINGS` / `GET_SHOPS_WITH_SETTINGS`): `LEFT JOIN loc_profile_tbl p` (active) and add `p.loc_address, p.loc_city, p.loc_pin_code, p.loc_country, p.loc_nav`. This is public information already shown on store profiles.
- **Order types** (`app/constants/statusConstants.tsx`): `allowedOrderTypes(catalogType, isDarkStore, hasAddress)` drops `TABLE`, `PICKUP` and `APPOINTMENT` when there's no address. `GET_BOOKING_SETTINGS` adds a `has_addr` subselect from the profile.
- **`POST /apis/appointment`:**
  - takes `delivery_address`: required (1–500 characters) for `PORTER`/`HOME_VISIT` → otherwise 400 "delivery_address is required for PORTER and HOME_VISIT bookings"
  - ignored (stored null) for other types
  - saved as `dlvry_addr`; appointment rows return it
- **`docs/API.md`:** the address routes, `dlvry_addr`/`delivery_address`, the store-list profile columns, and the order-type table with the address rule.

## Web
- **Domain:**
  - `SavedAddress { id, label, address }`
  - `Booking.deliveryAddress: string | null` and `NewBooking.deliveryAddress`
  - `Store.profile` filled from the list rows (`toStore` uses the row when no separate profile is passed)
  - `ghoomoApi.ts`: address CRUD functions; `createBooking` sends `delivery_address`
  - `queries.ts`: `useAddresses`, `useSaveAddress`, `useDeleteAddress`
- **`app/util/orderTypes.ts`:**
  - `orderTypeChoices(store)` also applies the address rule, via `hasStoreAddress(store)`
  - `needsDeliveryAddress(type)` (porter, homeVisit) and `visitsStore(type)` (table, pickup, appointment)
- **Booking page** (`app/(main)/booking/page.tsx`), under Order type:
  - **visit types:** a "Store address" card with the address, city, PIN and the map link if set (`profile.mapUrl`)
  - **Porter / home visit:** a **Delivery address** `Select`:
    - the saved addresses ("Home — 12 MG Road…"), defaulting to the newest, plus **Other…**
    - Other, or no saved addresses, shows a `TextField` (multiline) and a **Save this address** checkbox (new `Checkbox` in `app/_components/`)
    - validation: required
  - **on success:** if the box is ticked, save it through `useSaveAddress`. A failure there shows a note; the booking stands.
- **Addresses page** (`app/(main)/addresses/page.tsx`, user `Guard`):
  - the list with label and address, and Edit/Delete (`ConfirmModal`)
  - **+ Add address** opens a modal form (Label optional, Address required), following `StoreServices`/`ServiceFormModal`
  - `SideMenu` gets "Addresses" for users
- **`BookingDetailsModal`:**
  - "Deliver to" (Porter) or "Visit at" (home visit) shows `deliveryAddress`, for both roles
  - users also see "Store address" for visit types
- **Store side:** the Settings store-type hint adds "Add your address in Profile to offer Book table and Pickup" (or Book appointment) when the profile address is blank.

## Expo app (same behaviour)
- **API:**
  - the `Api` interface gets `getAddresses`, `createAddress`, `updateAddress` and `deleteAddress`
  - `deliveryAddress` on bookings
  - Ghoomo client: maps `dlvry_addr` and the profile columns on list rows (`locationToStore`)
  - `mock.ts`: addresses per user, seeded with one "Home" for the dummy user; the rules; Green Grocers keeps its address, and one store without an address shows the rule
  - `scripts/ghoomo-stub.mjs`: the routes and rules
  - `Api.md`
- **Helpers:** `src/lib/order-types.ts` gets the same functions.
- **Booking form** (`src/app/booking.tsx`): the store address card, or the Delivery address `Select` + Other `TextField` + a checkbox row (a new small `Checkbox` in `src/components/ui/`).
- **Addresses screen:**
  - `src/app/(app)/addresses.tsx`, a drawer item for users only (`src/app/(app)/_layout.tsx`, `side-menu.tsx`)
  - list, add/edit in a `Sheet`, delete with `ConfirmModal`
- **Details:** `booking-details-modal.tsx` gets the same rows.

## Production
Migration 009 is additive. Run it on the dev DB, then on Prisma Postgres (asked for in this request), using the phase-15 method:
- a read-only check, then one transaction
- a post-check: the new table, the column, unchanged row counts
- a second run should be a no-op

Record it in the plan. Main's live code ignores the new table and column until the merge.

## Verification
- **curl:**
  - address CRUD: own-only (404 for another user's), validation, the 20 cap, the duplicate rule
  - store lists include the address columns
  - order type `TABLE` at a store with no address → 400, and the default falls back to `PORTER`
  - `PORTER` without `delivery_address` → 400; with one → `dlvry_addr` stored; `TABLE` with an address → stored null
- **Headless Chrome** (390/1280, light/dark), Claude Web Shop with and without a profile address:
  - Pickup shows the store address card
  - Porter, with no saved addresses → the text box + Save ticked → booked; the Addresses page lists it
  - the next Porter booking defaults to it
  - Addresses page: add, edit, delete
  - no store address → only Porter (or Book home visit for a Service store)
  - the details show "Deliver to" for the store and the user
- **Expo:** the same on the web build (real backend and dummy); Android: the Porter dropdown, Other, the checkbox, and the Addresses screen. iOS untested (no Xcode).
- `tsc`, lint and `next build`; `tsc` and `expo lint`. Restore Claude Web Shop's profile and settings afterwards.
