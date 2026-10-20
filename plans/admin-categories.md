# Store categories, product types, inactive accounts (admin console is web only)

Branch `admin_console` (from `delivery_addresses`). The Next.js repo's `plans/phase-20-admin-categories.md` is the shared plan (copied below); the backend, the web app and the admin console are done there. This app gets the store-side and customer-side parts.

## Context
Two requests:
1. **Store categories (Product stores):**
   - In Settings, a Product store picks a **category** from a predefined list (Food, Beverages, … 45 entries).
   - **Other** lets it type its own, which joins the list.
   - Customers see the category when they pick the store and on the booking form, as service stores already show their type of service.
2. **Admin console (web only):** a separate login for the person who runs the whole app.
   - **Dashboard:** graphs.
   - **Stores and Users:** search, then turn an account active/inactive and see its orders.
   - **Store settings:** manage the option lists.
   - **Admin settings:** change the username, password and trust key.
   - **Logout.**

The mobile apps get the store-side and customer-side parts: categories, product types, and the "inactive" notices. They don't get the admin console.

## Decisions (agreed 2026-10-20)
- **Three admin-managed lists:**
  - **Store categories:** the 45 items, for Product stores.
  - **Product types:** a new list the admin builds. A store can tag each of its products with one, and customers see it next to the product.
  - **Service types:** the existing trades list.
  - "Other" (categories and service types) adds the store's own entry to the shared list. **Removing** an entry hides it from the dropdowns; stores that already use it keep their value.
- **First admin:** a **default account** created by the migration. Username `admin`, password `Admin@12345`, trust key `ghoomo-trust` (bcrypt-hashed in the migration). A banner nags until they're changed in Admin settings.
- **Inactive user:** can still log in and see everything, but **can't submit new or edited bookings** (403 with a clear message). An "account inactive" banner shows.
- **Inactive store:**
  - hidden from every customer list, and can't receive bookings
  - its owner can still log in and work as usual (including accepting or rejecting existing bookings), with an "inactive" banner
  - nothing is deleted
- **Dashboard graphs:**
  - users and stores over time (sign-ups per day for the last 30 days, plus totals)
  - bookings per day by status
  - breakdowns: stores by category, Product vs Service, active vs inactive
  - drawn with small SVG charts (no new library)

## Backend (Next repo)
- **Migration `db/migrations/010_admin_categories.sql`** (additive; also in `db/schema.sql`; run on dev; production only with the owner's OK):
  - **`ghoomo.option_tbl`:**
    - `opt_id uuid`, `opt_list` (`STORE_CATEGORY` | `PRODUCT_TYPE`), `opt_code`, `opt_name`
    - `is_default`, `sort_ord`, `active`, `cret_on`, `cret_by`
    - unique on `(opt_list, lower(opt_name))`
    - the 45 categories are seeded with readable names ("Meat & seafood") and the given codes (`MEAT_SEAFOOD`). `OTHER` isn't stored: it's the "Other…" choice.
  - `svc_type_tbl.active` (default 1), so the admin can remove service types
  - `shop_setting_tbl.store_cat varchar(60)`
  - `loc_svc_tbl.prod_type varchar(60)`
  - `auth_tbl.suspended`, `loc_auth_tbl.suspended` (int, default 0). Kept separate from `active`, which sign-in already filters on.
  - **`ghoomo.admin_tbl`:**
    - `admin_id`, `admin_user` unique, `enc_password`, `enc_trust_key`
    - `uses_default int`, `cret_on`, `updt_on`
    - seeded with the default admin
- **Admin auth:**
  - **Admin JWT:** a third token kind with `adminId`, `adminUser` and `kind: "ADMIN"`.
  - **Route helpers** (`app/util/routeUtil.tsx`):
    - `requireUser` / `requireLocation` / `requireAuth` **reject admin tokens** (today `requireUser` only checks "not a location token")
    - new `requireAdmin`
  - **Routes:**
    - `POST /apis/admin/signin` `{ username, password, trustKey }`: all three must match; one generic "Invalid credentials" error otherwise. Auth-free.
    - `GET /apis/admin/me`
    - `PUT /apis/admin/credentials` `{ currentPassword, username?, password?, trustKey? }`
- **Admin routes** (admin token only):
  - `GET /apis/admin/stats` → totals and 30-day series (users, stores, bookings by status), plus breakdowns
  - **Stores:**
    - `GET /apis/admin/stores?q=` searches name, code and email; returns the details (settings, profile, booking counts, `suspended`)
    - `PUT /apis/admin/stores/{id}/status` `{ inactive }`
    - `GET /apis/admin/stores/{id}/bookings`
  - **Users:** `GET /apis/admin/users?q=` (email, name, mobile), `PUT /apis/admin/users/{id}/status`, `GET /apis/admin/users/{id}/bookings`
  - **Option lists:** `GET/POST /apis/admin/options/{list}` and `DELETE /apis/admin/options/{list}/{id}`, where `list` is `store-categories` | `product-types` | `service-types`
- **Public lists:** `GET /apis/store-categories` and `GET /apis/product-types`; `/apis/service-types` now leaves out removed entries.
- **Store and booking rules:**
  - **Settings PUT:**
    - takes `storeCategory`, with the same rules as `serviceType`: 1–60 characters or null; a new name joins the list, and a matching one keeps its listed spelling
    - the settings GET returns `store_cat` and `store_inactive`
  - **Services POST/PUT:** take `productType`, which must be an active product type or null. `effectiveMaxQty`… is unchanged.
  - **Store lists:** leave out suspended stores and include `store_cat`.
  - **Bookings at a suspended store:** `POST /apis/appointment` → 403 "This store isn't taking bookings right now".
  - **Suspended users:** booking `POST` and the edit `PUT` → 403 "Your account is inactive, so you can't submit requests. Contact support."
  - `GET /apis/traveller/profile` returns `inactive`.
- **`docs/API.md`:** all of the above, including a new "Admin" section.

## Web
- **Customers and stores:**
  - `StoreSettings.storeCategory` and `inactive`; `StoreService.productType`; `UserProfile.inactive`
  - `useStoreCategories` / `useProductTypes`
  - **Store Settings:** a **Category** dropdown (the list + Other… → text field) when Product, like Type of service
  - **Product form:** a **Product type** dropdown, shown only when the list isn't empty
  - **Display:**
    - `storeTypeLabel(store)` (service type for Service stores, category for Product stores) replaces `serviceTypeLabel` in the store dropdown, picker title, booking card and Settings header
    - product types show beside products in the picker and in Settings
  - **Banners:**
    - inactive store: on the dashboard and Settings, "Your store is inactive: customers can't see or book it."
    - inactive user: on the dashboard and booking form; Submit request and Confirm are disabled with an explanation
- **Admin console** (`app/admin/…`, its own layout and `AdminGuard`, outside the `(main)` group):
  - **Session:** a separate cookie (`admin_token`) and a small fetch helper, so it never mixes with user/store sessions
  - **`/admin/login`:** Username, Password, Trust key
  - **`/admin`, the dashboard:**
    - total cards: users, stores, bookings, inactive accounts
    - SVG charts: sign-ups per day (users, stores) and bookings per day stacked by status
    - bars: stores by category, Product vs Service
  - **`/admin/stores`:**
    - search → result cards (name, code, email, type, category, address, created date, booking counts)
    - **Active** switch, with a confirmation when turning a store off
    - **Orders** opens the store's bookings (table/list with status, customer, slot, type)
  - **`/admin/users`:** the same for users (email, name, mobile, created date), with an Active switch and their orders
  - **`/admin/store-settings`:** three sections (Store categories, Product types, Service types), each a list with **Remove** and an **Add** field
  - **`/admin/settings`:** change username, password and trust key (requires the current password)
  - **Menu:** Dashboard, Stores, Users, Store settings, Admin settings, Logout
  - a "default credentials" warning banner until they're changed

## Expo app
- **API layer:**
  - `storeCategory` / `inactive` settings, `productType` on items, `getStoreCategories` / `getProductTypes`, `UserProfile.inactive`
  - the Ghoomo client, mock (seeded categories and a couple of product types) and stub
  - `Api.md`
- **Store Settings:** the Category dropdown + Other; the product form gets Product type.
- **Display:** `storeTypeLabel` in the store dropdown, picker title, booking card and Settings header; product type beside products in the picker.
- **Banners:**
  - an inactive store sees its banner on the dashboard and Settings
  - an inactive user sees a banner, and booking is blocked with the server's message
- **No admin console in the app** (web only, as asked).

## Commits
Plan → migration + admin auth → admin API → category/product-type/suspension API + docs → web customer/store changes → admin console pages → Expo API layer → Expo UI → notes. Push both branches.

## Verification
- **curl:**
  - **Admin sign-in:** all three values right → token; any one wrong → 401 with the same message.
  - **Token separation:** an admin token can't call user or store routes, and user/store tokens can't call admin routes.
  - **Admin actions:** stats shape; store/user search; suspend → the store disappears from `/apis/location` and bookings get 403, while its owner can still sign in and see `store_inactive`; suspend a user → booking POST/PUT get 403 and the profile says `inactive`; the option lists (add, remove, public lists follow); credential change (the old password stops working).
- **Headless Chrome:**
  - the admin login, dashboard charts, Stores (search, toggle, orders), Users, Store settings and Admin settings, at 390/1280 and light/dark
  - the store's Category with Other; product type on a product; the category in the store dropdown and on the booking form
  - the inactive banners for store and user
- **Expo:** the web build (real backend and dummy) and Android: Category in Settings, product type, the category shown to customers, the inactive banners.
- `tsc`, lint and `next build`; `tsc` and `expo lint`.
- **Production:** migration 010 only after the owner says so. It creates the default admin login, so change it right after merging.
