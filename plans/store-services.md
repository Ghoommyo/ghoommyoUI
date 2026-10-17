# Store services (add-ons picked before booking)

Branch `store_services` (from `booking_features`). Status: done (2026-10-15).

The web app's prompt for services, brought to iOS and Android. The Ghoomo backend already supports it (Next.js repo, `improved_screens`: migration `002_services.sql`, `docs/API.md` §5.4a, the `services` field on `POST /appointment`, and the `maxServiceQty` setting). The web app's `plans/phase-5-services.md` is the reference for behaviour.

## Decisions (same as the web app)
- **Images:** the store enters an image URL. If it's empty or fails to load, a placeholder image is shown (`assets/images/service-placeholder.svg`, the web app's).
- **Limits:** each service may be booked up to `service.maxQty ?? settings.maxServiceQty` times per booking. Both default to 1. There is no cap on the total across services.
- **Rename:** the dashboard's **Book** button becomes **Submit request**. Guests still see "Login to book". The booking form keeps **Confirm**.
- **Storage:** the booking description gets a numbered list of the services with prices, which the user can edit. The services are also sent as structured data (`services: [{svc_id, qty}]`), so editing the text doesn't change what was booked.
- **Prices:** INR, `Intl.NumberFormat('en-IN')`.

## Changes
1. **API layer** (`Api` interface, Ghoomo client, mock, stub):
   - `getStoreServices` (public), and owner `createService` / `updateService` / `deleteService`
   - the `maxServiceQty` setting (`max_svc_qty`)
   - `services` on new bookings and on booking rows
2. **Helpers:** `src/lib/services.ts` (`formatPrice`, URL encoding of picks, `resolvePicks`, `servicesDescription`), ported from the web app.
3. **Dashboard:** a **Services** button beside the store picker opens `ServicesModal` (numbered rows with image, name, description, price and a −/+ stepper; the list scrolls and **Save** stays fixed at the bottom). **Submit request** passes the picks to the booking form.
4. **Booking form:** the description is prefilled with the numbered services, prices and total; the services are sent with the booking.
5. **Settings (stores):** **Max of each service per booking**, and a **Services** section to add, edit and delete services.

## Verification
- `npx tsc --noEmit` and `npx expo lint`.
- Web build in Chrome with Playwright, with the flag off (dummy backend) and on (real backend).

## Done notes (2026-10-15)
- **Backend:** nothing to change; the Next.js server already serves everything. The dummy backend (`mock.ts`) and the stub (`scripts/ghoomo-stub.mjs`) now implement the same routes and validation, with seeded services for Raju Tailor (default limit 2; Hemming and Express delivery limited to 1).
- **Real backend checks** (Playwright on the web build, `EXPO_PUBLIC_USE_REAL_API=true`, Claude Web Shop):
  - the user flow: Services disabled until a store is picked; + stops at each limit; Save stays on screen; `Services (3)`; **Submit request**; the description prefilled with `1. Haircut × 2 — ₹400 … Total: ₹520`, then edited; booking confirmed
  - the appointment row has the structured `services` snapshot and the edited description
  - Settings: add (empty and bad-image errors), edit (clearing the limit falls back to the default), delete with confirmation; the test service was removed again
- **Dummy backend checks:** the same two flows with `user@ghoomyo.app` and Raju Tailor.
- **Android** (Pixel_9a emulator, existing debug build; no native changes): the modal, the SVG placeholder image (`expo-image`), ₹ formatting on Hermes, and `Services (3)` on the dashboard.
- **Not verified on iOS** (no Xcode here).
- **Picks are dashboard state.** They're cleared when the store changes, on Reset, and after a booking (the returning `booked` param). Unlike the web app they aren't kept in the URL, so a guest who goes to log in may need to pick them again.
- The service rows in Settings put Edit/Delete under the text; side by side they squeezed the name and limit at phone width.
