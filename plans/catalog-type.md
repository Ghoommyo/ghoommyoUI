# Dark stores, order types, Product or Service stores

Branch `catalog_type` (from `store_services`). Status: done (2026-10-17).

The web app's `plans/phase-6-dark-store.md` and `plans/phase-16-catalog-type.md` (Next.js repo) brought to iOS and Android. The Ghoomo backend already serves both: `is_dark_store`, `order_type` and `catalog_type` (migrations 003 and 007, `docs/API.md`).

## Decisions (same as the web app)
- **Store type:** a store is a **Product** store (the default, and every existing store) or a **Service** store. Both use the same items; only the words change ("Products" / "Services").
- **Order types**, chosen per booking on the booking form; the first is the default:

  | Store | Choices |
  |---|---|
  | Product | Book table, Pickup, Porter |
  | Product + dark | Porter, Pickup |
  | Service | Book appointment, Book home visit |
  | Service + dark | Book home visit |

- **Dark stores** take orders: no "How many people" on the booking form, each booking counts as 1, and slots and days count **orders**.
- Older bookings without an order type show as before.

## Changes
1. **API layer** (`Api` types, Ghoomo client, mock, stub):
   - `isDarkStore` and `catalogType` settings: read, and saved from Settings
   - `orderType` on new bookings and booking rows; `bokng_cnt` and the calendar count are 1 at dark stores
   - the mock and the stub validate the order type like the server
2. **Helpers:** `src/lib/order-types.ts` (labels, choices, `showsPeople`, `countNoun`, `catalogWords`), ported from the web app.
3. **Dashboard:** the **Products/Services** button and picker title follow the store type. Dark stores read "Order Schedule", "orders" on slots, and "Max Count : N orders per hour".
4. **Booking form:**
   - a Products/Services card with a button that opens the picker ("You can select products by clicking here"); changing the picks rewrites the description's list
   - an **Order type** dropdown
   - no people field at dark stores
5. **Cards and details:**
   - the order type shows on booking cards and in the details
   - the details list the booked items with their total
6. **Store Settings:**
   - **Store type** (Product / Service) and a **Dark store** switch
   - labels follow the type ("Max of each product per booking", the Products/Services section)

## Verification
- `npx tsc --noEmit` and `npx expo lint`.
- Web build in Chrome with Playwright against the real backend (Claude Web Shop): every store type × dark combination on the dashboard, booking form and Settings.
- The same against the dummy backend.
- Android emulator: the booking form's order type and the Settings switches.

## Done notes (2026-10-17)
- **Backend:** nothing to change; the Next.js server already serves it. `Api.md` now documents `isDarkStore`, `catalogType` and `order_type`. The dummy backend and the stub apply the same rules and errors:
  - Raju Tailor and City Salon are Service stores, and Green Grocers is a dark Product store
  - the stub's Raju Tailor is a Service store
- **Real backend** (Playwright on the web build, Claude Web Shop), every combination:
  - **Service:** "Services" button, picker and card; Book appointment (default) / Book home visit; Settings say "Services", "Add service", "Max of each service per booking"
  - **Service + dark:** "Order Schedule", "4 orders per hour", only Book home visit, and no people field. A booking was stored as `HOME_VISIT`, `bokng_cnt` 1, with the calendar +1. Its card and details show "Book home visit" and the items with their total.
  - **Product + dark:** Porter (default) / Pickup, no people field
  - **Product:** "Products", Book table (default) / Pickup / Porter
  - re-picking items on the booking form rewrites the description's list
  - the store's calendar and cards count orders when dark
- **Dummy backend:** Green Grocers (Porter, no people) and City Salon (Book appointment, 2 people) bookings.
- **Stub (curl):**
  - 400s for a bad `catalogType` or `isDarkStore`, and for `TABLE` at a Service store
  - the default is `APPOINTMENT`; at a dark Service store it's `HOME_VISIT`, and `APPOINTMENT` is refused
- **Android** (Pixel_9a emulator, existing debug build; no native changes):
  - **Product store:** order types Book table / Pickup / Porter; the Products picker and description; the people check. A booking was stored as `PORTER` with 2 people.
  - **Dark Service store:** "Order Schedule", "orders" on slots, only Book home visit, no people field
- **Not checked on Android:** the store's Settings screen (checked on the web build; it reuses the existing `Switch` and `Select`).
- **Not verified on iOS** (no Xcode here).
- Older bookings keep the description text they were made with (e.g. `Services:`) if the store type changes later; the details heading follows the current type.
