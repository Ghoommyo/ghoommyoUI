# Unseen notifications on load, and service types

Branch `notifications_service_types` (from `catalog_type`). The Next.js repo's `plans/phase-17-notifications-service-types.md` is the shared plan (copied below); the backend and web parts are done there.

## Context
- **Prompt 8:**
  - **Today:** notifications load only when the bell is clicked, and are marked read as soon as the panel shows them.
  - **Wanted, Facebook-style:**
    - fetch on every page load or reload, with a red unread count on the bell
    - split the panel into **New** (unseen) and **Earlier** (seen)
    - mark items seen only when the panel is **closed** or the item is **clicked**
    - on reopen, newer items appear in a different shade
- **Prompt 9:**
  - **Settings:** a Service store picks its **type of service** from a dropdown of 34 trades. **Other** lets it type its own, which is added to the shared list for every store.
  - **Where customers see the type:** the services picker title, the booking form's Services card, and the dashboard's store dropdown. It also shows above the Services list in the store's Settings.
- **Scope (agreed):** web + API + Expo app.

## Branches
- **Next repo:** `notifications_service_types`, from `improved_screens`.
- **Expo repo:** `notifications_service_types`, from `catalog_type`.
- Both are pushed. Plans are copied into each repo's `plans/` (`phase-17-notifications-service-types.md` / `notifications-service-types.md`), with README rows. Each major step gets its own commit.

## Backend (Next repo)
- **Migration `db/migrations/008_service_types.sql`** (additive, `IF NOT EXISTS`; also in `db/schema.sql`; run on the dev DB):
  - `ghoomo.svc_type_tbl`:
    - `svc_type_id` uuid pk (same id default as `002_services.sql`)
    - `type_name` varchar(60) not null, with a unique index on `lower(type_name)`
    - `is_default` int (1 for the seeded trades), `sort_ord` int, `cret_on`, `cret_by`
    - seeded with the 34 trades in the given order (`ON CONFLICT DO NOTHING`)
  - `shop_setting_tbl.svc_type varchar(60)` null
- **`GET /apis/service-types`** (public: add it to `authFreeGetPrefixes` in `app/constants/apiConstants.tsx`): `{ serviceTypes: string[] }`. The defaults come first in their order, then custom types A–Z.
- **Settings PUT** (`app/apis/location/[locationCode]/settings/route.tsx`):
  - accepts `serviceType`: a string of 1–60 characters (trimmed), or `null` to clear; anything else → 400
  - a name not yet in the list (case-insensitive) is inserted first, and its stored spelling is used
  - SQL goes in `QUERIES_FIRED`, following the `catalogType` pattern (`updateLocationSettingsData`)
- **Store lists** (`GET_LOCATIONS_WITH_SETTINGS` / `GET_SHOPS_WITH_SETTINGS`) and the settings rows return `svc_type`.
- **Notifications:** no API change. `GET /apis/notifications` already returns `read_on`, and `POST /apis/notifications/read` takes ids.
- **`docs/API.md`:** the new route, the `serviceType`/`svc_type` setting and its 400, and the service-types table.

## Web
**Prompt 8:**
- **Fetching** (`app/service/queries.ts` `useNotifications`):
  - always enabled when signed in, so it fetches on page load, and refetches whenever the panel opens
  - `staleTime 0`, no refetch on focus, no polling
- **`NotificationsButton`** (`app/_components/Notifications.tsx`): a red unread-count badge on the bell (`9+` cap), and an aria-label "Notifications, 3 new".
- **`NotificationsPanel`:**
  - sections **New** (unread, tinted with `bg-primary/10` and a dot) and **Earlier**
  - remove the "mark read once shown" effect
  - **mark read:**
    - on close: every unread item that was shown
    - on item click: that item, before opening `BookingDetailsModal`
  - after marking, update the query cache (`setQueryData` → `read: true`) so the badge clears without another fetch
  - Refresh keeps the split (the server's `read_on` decides it)

**Prompt 9:**
- **Domain and adapter:**
  - `StoreSettings.serviceType: string | null`, mapped from `svc_type` in `ghoomoApi.ts`; `updateStoreSettings` sends `serviceType`
  - `getServiceTypes()` and a `useServiceTypes()` hook
- **`StoreSettingsForm`:** when the Store type is Service:
  - a **Type of service** `Select` (the list plus **Other…**)
  - Other shows a `TextField` **Your type of service** (required, up to 60 characters)
  - Product stores keep their saved value but don't show the field
- **One display helper** `serviceTypeLabel(store)` (in `app/util/orderTypes.ts`) returns the type for Service stores with one set, otherwise null. It's used in:
  - `ServicesModal` title: "Claude Web Shop services · Plumber"
  - the booking page's Services card: a "Plumber" line under the heading
  - `UserDashboard` store options: "Name · Plumber"
  - `StoreServices` header in Settings: "Type of service: Plumber"
- Invalidate `useServiceTypes` after saving settings, so a new Other entry appears.

## Expo app (same behaviour)
- **API layer:**
  - `getServiceTypes`; the `serviceType` setting (`svc_type`) in types, mappers and the Ghoomo client
  - `mock.ts`: the seeded list and Other inserts; City Salon gets type "Barber" (added through Other)
  - `scripts/ghoomo-stub.mjs`: the route and validation
  - `Api.md`
- **Notifications** (`src/features/notifications/notifications-panel.tsx`, bell in `src/components/app-header.tsx`, `useNotifications` in `src/hooks/queries.ts`): fetch on app start and when the panel opens; a count badge on the bell; New/Earlier sections with a tint; mark read on close and on item press; the same cache update.
- **Settings** (`src/features/settings/store-settings-form.tsx`): Type of service `Select` plus Other `TextField`, shown when Service.
- **Display:**
  - `ServicesModal` title
  - `src/app/booking.tsx` card
  - `user-dashboard.tsx` store options
  - `store-services.tsx` header

## Verification
- **curl:**
  - `GET /apis/service-types` without a token: the 34 items in order
  - a settings PUT with "Plumber" → saved
  - "Drone pilot" → added to the list once; "drone PILOT" → no duplicate, saved as "Drone pilot"
  - a 61-character string, or a number → 400
  - `null` clears it
  - store lists include `svc_type`
- **Headless Chrome (390/1280, light/dark):**
  - a store receives new requests → a reload shows the bell badge without a click
  - opening shows them under New, tinted; Earlier holds older ones
  - clicking one marks only that one read (via a network check)
  - closing marks the rest, and the badge clears; reopen → all under Earlier; a new booking → reload → it's back under New
  - Settings: Service → Type of service → Plumber → save → shown in Settings, picker title, booking card and store dropdown
  - Other "Drone pilot" → saved, and it appears in another store's dropdown
- **Expo:** the same flows on the web build (real backend and dummy), plus Android: the badge after launch, New/Earlier, and Settings type with Other. iOS is untested (no Xcode).
- `tsc`, lint and `next build` (web); `tsc` and `expo lint` (app). Commit and push both branches.
- **Production:** migrations 007 and 008 must run on Prisma Postgres before merging. I'll ask before running them.

## Done notes (2026-10-17, app)
- **Notifications:**
  - **Fetching:** loaded once at app start; the bell shows the unseen count (`9+` cap) without a tap. Opening the panel fetches again (one request).
  - **Sections:** New (tinted, bold) and Earlier.
  - **Marking seen:** tapping an item marks only that one; closing marks the rest, whether with ✕ or Android back. The badge then clears without a refetch.
  - **Reopening:** everything sits under Earlier.
- **Type of service:**
  - **Settings:** a Type of service dropdown for Service stores, plus Other with its own field. An Other name that matches an existing type in any case ("drone PILOT") is saved under the listed spelling, so no duplicate is added.
  - **Shown in:** the store dropdown ("Claude Web Shop · Plumber"), the picker title, the booking form's Services card, and the Settings services header.
- **Backends:** the dummy backend lists the 34 trades plus "Barber" (City Salon's type), and the stub serves `GET /service-types` with the server's rules.
- **Verified:**
  - Playwright on the web build: the real backend (store and user) and the dummy backend
  - Android (Pixel_9a): the badge after login, New/Earlier, and back marking items seen on the server; the type in the store dropdown and the picker title
- **Not checked:** the store's Settings screen on Android, and iOS (no Xcode).
