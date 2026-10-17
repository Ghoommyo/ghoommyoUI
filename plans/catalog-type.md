# Dark stores, order types, Product or Service stores

Branch `catalog_type` (from `store_services`).

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
