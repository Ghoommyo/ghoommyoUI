# Ghoomo API Reference

Reference for building a UI against the Ghoomo backend (the `/apis/*` routes of the `ghoomo` Next.js app). All requests, responses and status codes below were verified against a running server.

**Domain in one paragraph:** A _location_ is either a `SHOP` (bookable in hourly time slots, e.g. a tailor) or a `PLACE` (bookable by whole day, e.g. a monument). _Customers_ (users) browse locations and book: a SHOP booking is an **appointment**, a PLACE booking is an **event**. Location owners log in separately, configure their profile and settings, and accept or reject appointments. A per-location, per-month **calendar** row stores booking counts and powers the availability UI.

---

## 1. Basics

| Item           | Value                                                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base URL       | `https://ghoommyo-eight.vercel.app/apis` (deployed; production data). Local server: `http://localhost:3000/apis`. Note `/apis`, not `/api`              |
| Body format    | JSON. Send `Content-Type: application/json` on POST/PUT                                                                                                   |
| CORS           | Any origin is allowed (`Access-Control-Allow-Origin: *`). Preflight `OPTIONS` returns 204                                                                 |
| Auth header    | `Authorization: Bearer <jwt>`. The sign-in responses return the token **already prefixed** with `Bearer `, so send the `token` string exactly as received |
| Token lifetime | Set by the server's `JWT_EXPIRES_IN` (currently 1 day). An expired or invalid token returns 401; send the user back to sign-in                            |
| Sign-out       | Stateless. Delete the token on the client. `GET /signout` exists but does nothing server-side                                                             |

### Two kinds of token (important)

| Token                                 | Obtained from           | JWT payload                                                                  | Used for                                                       |
| ------------------------------------- | ----------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **User token** (customer)             | `POST /signin`          | `userId`, `userName` (the email), `userType`, `userAccess`                   | Browsing shops, booking, the customer's own trips              |
| **Location token** (shop/place owner) | `POST /location/signin` | `userId` (= the location's id), `locName`, `locType`, `locAccess`, `locCode` | The owner dashboard: profile, settings, appointment management |

Endpoints marked **Location** reject user tokens with 403, and vice versa where noted. Decode the JWT payload (base64) on the client if you need `userId` / `locCode` without an extra call, or call `GET /traveller` for user tokens.

### Error format

Errors are JSON with **either** an `error` or a `message` key, so read both:

```json
{ "error": "Missing required fields" }
{ "message": "Authentication token is missing or invalid" }
```

| Status | Meaning                                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------- |
| 400    | Missing or invalid input                                                                                                |
| 401    | No token, bad token or expired token (from the middleware: `{"message": "Authentication token is missing or invalid"}`) |
| 403    | Wrong token kind, or the token doesn't own the resource                                                                 |
| 404    | Not found, or nothing was updated                                                                                       |
| 409    | Duplicate on signup                                                                                                     |
| 500    | Server or database error                                                                                                |

### Shell setup for the curl examples

```bash
BASE=https://ghoommyo-eight.vercel.app/apis   # or http://localhost:3000/apis for a local server
# After signing in, store the token exactly as returned (it already includes "Bearer "):
USER_TOKEN="Bearer eyJ..."   # from POST /signin
LOC_TOKEN="Bearer eyJ..."    # from POST /location/signin
```

---

## 2. Endpoint index

| #   | Method | Path                           | Auth                 | Purpose                                              |
| --- | ------ | ------------------------------ | -------------------- | ---------------------------------------------------- |
| 1   | POST   | `/signup`                      | none                 | Register a customer                                  |
| 2   | POST   | `/signin`                      | none                 | Customer login → user token                          |
| 3   | GET    | `/signout`                     | none                 | No-op                                                |
| 4   | GET    | `/traveller`                   | User                 | Decoded current-user info                            |
| 5   | POST   | `/location/signup`             | none                 | Register a shop or place                             |
| 6   | POST   | `/location/signin`             | none                 | Owner login → location token                         |
| 7   | GET    | `/location`                    | none                 | All active locations (SHOP + PLACE) with settings    |
| 8   | GET    | `/shop`                        | any token            | All active SHOP locations with settings              |
| 9   | GET    | `/location/{locCode}`          | Location (own)       | The owner's location record                          |
| 10  | GET    | `/location/{locCode}/profile`  | Location (own)       | Get profile (auto-created on first call)             |
| 11  | PUT    | `/location/{locCode}/profile`  | Location (own)       | Update profile                                       |
| 12  | GET    | `/location/{locCode}/settings` | Location (own)       | Get booking settings (defaults auto-created)         |
| 13  | PUT    | `/location/{locCode}/settings` | Location (own)       | Update booking settings                              |
| 14  | GET    | `/calendar/{calendarId}`       | none                 | Booking counts for one location and month            |
| 15  | POST   | `/calendar`                    | any token            | Add a booking's counts into the calendar             |
| 16  | POST   | `/appointment`                 | any token (customer) | Book a SHOP appointment                              |
| 17  | PUT    | `/appointment`                 | Location             | Accept or reject an appointment                      |
| 18  | POST   | `/events/pending-appointment`  | Location             | PENDING appointments on given dates                  |
| 19  | POST   | `/events/accepted-appointment` | Location             | ACCEPTED appointments on given dates                 |
| 20  | POST   | `/events/rejected-appointment` | Location             | REJECTED appointments on given dates                 |
| 21  | POST   | `/events/all-appointment`      | Location             | All appointments on given dates                      |
| 22  | GET    | `/events/coming-events`        | any token            | Appointments from tomorrow on (scoped to the caller) |
| 23  | GET    | `/events/inprogress-events`    | any token            | Today's appointments (scoped to the caller)          |
| 24  | GET    | `/events/completed-events`     | any token            | Past appointments (scoped to the caller)             |
| 25  | POST   | `/event`                       | any token            | Book a PLACE visit (event)                           |
| 26  | GET    | `/traveller/upcoming`          | User                 | Customer's PLACE events starting after today         |
| 27  | GET    | `/traveller/progress`          | User                 | Customer's PLACE events in progress today            |
| 28  | GET    | `/traveller/completed`         | User                 | Customer's past PLACE events                         |
| 29  | GET    | `/services/{locationId}`       | none                 | A location's active services (§5.4a)                 |
| 30  | GET, POST | `/location/{locCode}/services` | Location (own)    | List / add services                                  |
| 31  | PUT, DELETE | `/location/{locCode}/services/{serviceId}` | Location (own) | Replace / soft-delete a service          |
| 32  | GET    | `/service-types`               | none                 | Types of service a SERVICE location can pick (§5.4a) |
| 33  | GET, POST | `/traveller/addresses`      | User                 | Saved delivery addresses: list / add (§5.1)          |
| 34  | PUT, DELETE | `/traveller/addresses/{addressId}` | User      | Edit / remove a saved address                        |
| 37  | DELETE | `/account`                     | User or Location     | Delete the signed-in account (§5.1)                  |
| 35  | GET    | `/store-categories`            | none                 | Categories a PRODUCT location can pick (§5.4a)       |
| 36  | GET    | `/product-types`               | none                 | Types a location can give its products (§5.4a)       |

The admin console's routes (`/admin/*`, admin token only) are web only and aren't used by this app; see the server's `docs/API.md` §5.8.

**Do not use:** `GET /shop/{shopCode}`, `GET|PUT /shop/profile`, `GET|PUT /shop/settings`. These are broken legacy copies of the `/location/{locCode}/*` routes and respond 403 to location tokens. Use rows 9–13 instead.

---

## 3. Key flows

### A. Customer books a SHOP time slot

1. `POST /signin` → store `token`.
2. `GET /shop` → list shops. Each item has `user_id` (the **location id**, used as `loc_id` everywhere), `loc_name`, `open_at`, `close_at`, `max_limit`, `unit`.
3. `GET /calendar/{month}{year}_{user_id}_SHOP` → existing bookings per day and time slot, used to show availability (404 means nothing is booked that month).
4. `POST /appointment` with `loc_id = user_id`, `apntmnt_period: "HOUR"` → returns `appointmentId`.
5. `POST /calendar` with `type: "SHOP"`, `plan_id = appointmentId`, and one `details` entry `{calendar_id, days: [dayOfMonth], time: "H:M"}`.
6. The customer sees their bookings via `GET /events/coming-events` (and `inprogress` / `completed`).

### B. Customer books a PLACE visit

1. `GET /location` → filter `loc_type === "PLACE"`.
2. `GET /calendar/{month}{year}_{user_id}` (**no** `_SHOP` suffix for places) → visitor counts per day.
3. `POST /event` with the selected dates and members → returns `eventId`.
4. `POST /calendar` with `type: "PLACE"`, `plan_id = eventId`, and one `details` entry **per month** `{calendar_id, days: [...]}`.
5. The customer sees trips via `GET /traveller/upcoming`, `/progress` and `/completed` (matched by member email = the signed-in `userName`).

### C. Shop owner dashboard

1. `POST /location/signin` with `location_code` → store `token`. Decode it, or call `GET /location/{locCode}`, to get the location id.
2. `GET /location/{locCode}/settings` and `/profile`. The first call creates default rows.
3. `POST /events/pending-appointment` with `selected_dates` → list to act on.
4. `PUT /appointment` with `status: "ACCEPTED"` or `"REJECTED"`.
5. Refresh with the accepted, rejected and all lists.

### Calendar ID format and data shape

`calendarId = {monthName}{yyyy}_{locationId}[_SHOP]`

- `monthName` is the lowercase full English month: `january` … `december`.
- `locationId` is the location's `user_id` (UUID).
- SHOP calendars end in `_SHOP`; PLACE calendars have no suffix.
- Example: `october2026_58cbfdb3-2d96-46d5-a7f5-9bc6b5f0e2f4_SHOP`

`day_details` (keys are day-of-month strings):

```jsonc
// SHOP: day → "H:M" time slot → counts
{ "4": { "15:30": { "count": 2, "evnt_list": ["<appointmentId>"] } } }
// PLACE: day → counts
{ "4": { "count": 3, "evnt_list": ["<eventId>"] } }
```

---

## 4. Enums

| Name                          | Values                                                                    |
| ----------------------------- | ------------------------------------------------------------------------- |
| `loc_type` / `location_type`  | `SHOP`, `PLACE`                                                           |
| Appointment `status`          | `PENDING` (set on create), `ACCEPTED`, `REJECTED`                         |
| `apntmnt_period`              | `HOUR` (+1h), `DAY` (+24h), `WEEK` (+7d); anything else makes end = start |
| Settings `unit` / `limitUnit` | free text; the app uses `DAY` (default) and `HOUR`                        |
| Appointment `order_type`      | product locations: `TABLE` (book a table), `PICKUP`, `PORTER` (dark: no `TABLE`); service locations: `APPOINTMENT`, `HOME_VISIT` (dark: `HOME_VISIT` only) |
| Settings `catalog_type` / `catalogType` | `PRODUCT` (default), `SERVICE`                                  |
| `userType` (customers)        | `CUSTOMER` (assigned on signup)                                           |
| `userAccess` / `loc_access`   | `LIMITED` (assigned on signup)                                            |

---

## 5. Endpoint details

### 5.1 Customer auth

#### POST /signup

Register a customer. `user_name` is used as the login and as the email that PLACE events match on, so send an email address.

```bash
curl -X POST "$BASE/signup" -H "Content-Type: application/json" \
  -d '{"user_name":"asha@example.com","password":"Secret@123","confirmPassword":"Secret@123"}'
```

| Field           | Type   | Req | Notes                 |
| --------------- | ------ | --- | --------------------- |
| user_name       | string | ✔   | email recommended     |
| password        | string | ✔   |                       |
| confirmPassword | string | ✔   | must equal `password` |

- 201 `{"message":"Sign-up successful"}`
- 400 `{"message":"Invalid sign-up data"}` (missing fields or the passwords don't match)
- 409 `{"error":"User name already exists"}`

#### POST /signin

```bash
curl -X POST "$BASE/signin" -H "Content-Type: application/json" \
  -d '{"user_name":"asha@example.com","password":"Secret@123"}'
```

- 200 `{"message":"Sign-in successful","token":"Bearer eyJhbGciOi..."}`
- 400 `{"message":"Invalid sign-in data"}` · 401 `{"error":"Invalid credentials"}` · 404 `{"error":"User not found"}`

#### GET /signout

```bash
curl "$BASE/signout"
```

- 200 `{"message":"Sign-out successful"}`. This is a no-op, so clear the token client-side.

#### GET /traveller

Returns the decoded user token. Useful for getting `userId` and `userName`.

```bash
curl "$BASE/traveller" -H "Authorization: $USER_TOKEN"
```

- 200 `{"user":{"userId":"92177fd2-...","userName":"asha@example.com","userType":"CUSTOMER","userAccess":"LIMITED","iat":1791025490,"exp":1791111890}}`

#### DELETE /account

Deletes the signed-in customer's or location's account. Body `{"password":"…"}`, which must match.

- **Customer:** can't sign in any more (the email can sign up again); name, mobile, saved addresses, reminder settings and notifications are removed; their bookings stay for the stores as "Deleted user" without mobile or delivery address, and upcoming pending/accepted ones become `REJECTED` ("Account deleted").
- **Location:** hidden and can't sign in; items deactivated, profile address/bio cleared; upcoming pending/accepted bookings become `REJECTED` ("Store closed its account") and each customer is notified.
- 200 `{"message":"Account deleted"}` · 400 `{"error":"password is required"}` · 401 · 403 `{"error":"Password is wrong"}` · 404 (already deleted)

#### GET /traveller/addresses · POST /traveller/addresses

The customer's saved delivery addresses, for Porter and home-visit bookings. User token only (403 for a location token).

```bash
curl "$BASE/traveller/addresses" -H "Authorization: $USER_TOKEN"
curl -X POST "$BASE/traveller/addresses" -H "Authorization: $USER_TOKEN" -H "Content-Type: application/json" \
  -d '{"label":"Home","address":"12 MG Road, Indore 452001"}'
```

| Field (POST/PUT) | Type   | Req | Notes                                                    |
| ---------------- | ------ | --- | -------------------------------------------------------- |
| address          | string | ✔   | 1–500 characters (trimmed)                               |
| label            | string |     | up to 40 characters, e.g. `Home`; empty or missing = none |

- GET 200 `{"addresses":[{"id":"c390f88b-...","label":"Home","address":"12 MG Road, Indore 452001"}]}`, newest first (`label` is `""` when unset)
- POST 201 `{"address":{...}}`; the same address text again returns the saved one (200) instead of a copy
- 400 `{"error":"address is required (at most 500 characters)"}` / `{"error":"label must be at most 40 characters"}` / `{"error":"You can save up to 20 addresses. Delete one to add another."}`

#### PUT /traveller/addresses/{addressId} · DELETE …

PUT replaces the label and address; DELETE removes it (soft delete; bookings keep their address).

- PUT 200 `{"address":{...}}` · DELETE 200 `{"message":"Address deleted"}` · 404 `{"error":"Address not found"}` (unknown, deleted, or another customer's)

---

### 5.2 Location (owner) auth

#### POST /location/signup

`loc_code` (the login id) is derived from `location_name`: lowercased, with spaces replaced by `_`. For example, `"Raju Tailor"` becomes `raju_tailor`. Show it to the user after signup.

```bash
curl -X POST "$BASE/location/signup" -H "Content-Type: application/json" \
  -d '{"location_name":"Raju Tailor","location_type":"SHOP","email":"raju@example.com","password":"Secret@123","confirmPassword":"Secret@123"}'
```

| Field                      | Type              | Req | Notes              |
| -------------------------- | ----------------- | --- | ------------------ |
| location_name              | string            | ✔   | becomes `loc_code` |
| location_type              | `SHOP` \| `PLACE` | ✔   |                    |
| email                      | string            | ✔   |                    |
| password / confirmPassword | string            | ✔   | must match         |

- 201 `{"message":"Location Sign-up successful"}`
- 400 `{"message":"Invalid Location sign-up data"}` · 409 `{"error":"Location already exists"}`

#### POST /location/signin

```bash
curl -X POST "$BASE/location/signin" -H "Content-Type: application/json" \
  -d '{"location_code":"raju_tailor","password":"Secret@123"}'
```

- 200 `{"message":"Sign-in successful","token":"Bearer eyJ..."}`. The JWT payload has `userId`, `locName`, `locType`, `locAccess` and `locCode`.
- 400 · 401 `{"error":"Invalid credentials"}` · 404 `{"error":"User not found"}`

---

### 5.3 Browsing locations

#### GET /location

Public. Returns all active locations (SHOP and PLACE) joined with their settings. Settings fields are `null` if the owner has never opened their settings.

```bash
curl "$BASE/location"
```

200:

```json
{
  "locationList": [
    {
      "user_id": "1854f23b-67d0-4b7b-8a09-f4c06003c1f8",
      "loc_name": "Raju Tailor",
      "loc_type": "SHOP",
      "loc_access": "LIMITED",
      "loc_code": "raju_tailor",
      "active": 1,
      "created_on": "2026-05-05T00:41:17.064+05:30",
      "created_by": "raju_tailor",
      "updated_on": "2026-05-05T00:41:17.064+05:30",
      "updated_by": "raju_tailor",
      "max_limit": "30",
      "unit": "DAY",
      "is_auto_approval": 1,
      "open_at": "09:00",
      "close_at": "21:00",
      "max_svc_qty": 1,
      "is_dark_store": 0,
      "catalog_type": "PRODUCT",
      "svc_type": null,
      "store_cat": "Bakery",
      "loc_address": "12 MG Road",
      "loc_city": "Indore",
      "loc_pin_code": "452001",
      "loc_country": "India",
      "loc_nav": null
    }
  ]
}
```

- `user_id` is the **location id**. Pass it as `loc_id` when booking.
- Locations the admin made inactive aren't listed (and can't take bookings).
- `loc_address`, `loc_city`, `loc_pin_code`, `loc_country` and `loc_nav` (map link) come from the location's profile, so customers can be shown where to go; `null` when not filled in. A location without `loc_address` can't take store visits (see the appointment's `order_type`).
- `max_limit` comes back as a string, so parse it.
- 404 `{"error":"Locations not found"}` when the table is empty.

#### GET /shop

Same shape as `/location`, filtered to `loc_type = SHOP`. Requires any valid token.

```bash
curl "$BASE/shop" -H "Authorization: $USER_TOKEN"
```

---

### 5.4 Owner: location, profile, settings

For all of these, `{locCode}` in the URL must equal the token's `locCode`. Otherwise the response is 403 `{"error":"Forbidden: Access to this location is denied"}`, and a missing token gives 401.

#### GET /location/{locCode}

```bash
curl "$BASE/location/raju_tailor" -H "Authorization: $LOC_TOKEN"
```

200 `{"locationList":[{ "user_id","loc_name","loc_type","loc_access","loc_code","active","created_on","created_by","updated_on","updated_by","email" }]}`

#### GET /location/{locCode}/profile

Creates an empty profile on the first call.

```bash
curl "$BASE/location/raju_tailor/profile" -H "Authorization: $LOC_TOKEN"
```

200:

```json
{
  "locationList": [
    {
      "loc_profile_id": "2c2b...",
      "loc_id": "58cb...",
      "loc_type": "SHOP",
      "loc_code": "raju_tailor",
      "loc_name": "Raju Tailor",
      "loc_info": null,
      "loc_nav": null,
      "loc_city": null,
      "loc_country": null,
      "loc_pin_code": null,
      "loc_profile_url": null,
      "loc_address": null,
      "created_on": "...",
      "created_by": "Raju Tailor",
      "updated_on": null,
      "updated_by": null,
      "active": 1
    }
  ]
}
```

#### PUT /location/{locCode}/profile

All fields are optional. Only the fields you send are changed, and empty strings are ignored. Call GET first so that the profile exists (otherwise 404).

```bash
curl -X PUT "$BASE/location/raju_tailor/profile" -H "Authorization: $LOC_TOKEN" -H "Content-Type: application/json" \
  -d '{"locInfo":"Bespoke tailoring","locCity":"Agra","locCountry":"India","locPinCode":"282001","locAddress":"12 MG Road","locNavigation":"https://maps.example/xyz","locProfileUrl":"https://img.example/p.jpg","locType":"SHOP"}'
```

| Body field    | DB column       |
| ------------- | --------------- |
| locType       | loc_type        |
| locInfo       | loc_info        |
| locNavigation | loc_nav         |
| locCity       | loc_city        |
| locCountry    | loc_country     |
| locPinCode    | loc_pin_code    |
| locProfileUrl | loc_profile_url |
| locAddress    | loc_address     |

- 200 `{"profile":{ ...same fields as GET... }}` · 404 `{"error":"Location profile not found"}`

#### GET /location/{locCode}/settings

Creates the default settings on the first call: `max_limit 100`, `unit DAY`, `is_auto_approval 1`, `open_at 09:00`, `close_at 21:00`.

```bash
curl "$BASE/location/raju_tailor/settings" -H "Authorization: $LOC_TOKEN"
```

200:

```json
{
  "locationList": [
    {
      "stng_id": "4885...",
      "loc_id": "58cb...",
      "max_limit": "100",
      "unit": "DAY",
      "is_auto_approval": 1,
      "open_at": "09:00",
      "close_at": "21:00",
      "created_on": "...",
      "created_by": "Raju Tailor",
      "updated_on": "...",
      "updated_by": "Raju Tailor",
      "active": 1
    }
  ]
}
```

#### PUT /location/{locCode}/settings

All fields are optional. Omitted fields keep their current values, while `0` and `false` are applied. Call GET first so that the settings exist (otherwise 404).

```bash
curl -X PUT "$BASE/location/raju_tailor/settings" -H "Authorization: $LOC_TOKEN" -H "Content-Type: application/json" \
  -d '{"maxLimit":5,"limitUnit":"HOUR","isAutoApprove":0,"openAt":"10:00","closeAt":"18:00","maxServiceQty":2,"isDarkStore":0,"catalogType":"SERVICE"}'
```

| Field            | Type      | Notes                                              |
| ---------------- | --------- | -------------------------------------------------- |
| maxLimit         | number    | max bookings per `limitUnit`                       |
| limitUnit        | string    | `DAY` / `HOUR`                                     |
| isAutoApprove    | 0 \| 1    |                                                    |
| openAt / closeAt | `"HH:MM"` | 24-hour; the booking UI limits slots to this range |
| maxServiceQty    | integer ≥ 1 | default quantity of each service per booking, for services without their own `maxQty` (column `max_svc_qty`, default 1; also on `GET /location` rows) |
| isDarkStore      | 0 \| 1    | dark store: no dine-in, bookings are orders (column `is_dark_store`, default 0). Appointments then can't use `order_type: "TABLE"` and always count as 1 (`bokng_cnt = 1`) |
| catalogType      | `PRODUCT` \| `SERVICE` | what the location sells (column `catalog_type`, default `PRODUCT`). Decides what its items are called (Products / Services) and which `order_type`s bookings may use (see §5.6) |
| serviceType      | string (1–60) \| null | the location's type of service, e.g. `"Plumber"` (column `svc_type`, default `null`; also on `GET /location` rows). Spaces are trimmed. A name not in `GET /service-types` (any case) is **added to that list** for every location; an existing one is saved with its listed spelling (`"plumber"` → `"Plumber"`). `null` clears it. Apps show it for `SERVICE` locations only |
| storeCategory    | string (1–60) \| null | the category of a `PRODUCT` location, e.g. `"Bakery"` (column `store_cat`; also on `GET /location` rows). Same rules as `serviceType`, against `GET /store-categories` |

- 200 `{"settings":{ ...same fields as GET... }}`
- 400 `{"error":"maxServiceQty must be a whole number of at least 1"}` / `{"error":"isDarkStore must be 0 or 1"}` / `{"error":"catalogType must be PRODUCT or SERVICE"}` / `{"error":"serviceType must be 1 to 60 characters, or null"}` / `{"error":"storeCategory must be 1 to 60 characters, or null"}`
- `GET` rows also carry `store_inactive`: 1 when the admin made the location inactive (it still works for its owner, but customers can't see or book it).
- 404 `{"error":"Location settings not found, call GET first to create defaults"}`

### 5.4a Services (add-ons)

A location's priced services that a customer can add to an appointment (backend migration `002_services.sql`).

**Service object**

```json
{"id":"c4753b3f-...","name":"Haircut","description":"Classic cut and wash","price":200,
 "imageUrl":"https://img.example/cut.jpg","maxQty":null,"effectiveMaxQty":2,"productType":null}
```

- `maxQty` is the service's own per-booking limit, or `null` to use the location's `maxServiceQty` setting.
- `effectiveMaxQty` is the limit that applies: `maxQty ?? maxServiceQty ?? 1`.
- `description` and `imageUrl` are `""` when unset. Lists are ordered by creation time; number the items in that order.

#### GET /services/{locationId}

Public. The location's active services: 200 `{"services":[ ...service objects... ]}` (an empty array when there are none).

#### GET /location/{locCode}/services · POST /location/{locCode}/services

Owner list (same shape as the public one) and create. `{locCode}` must equal the token's `locCode` (403 otherwise; a user token also gets 403).

```bash
curl -X POST "$BASE/location/raju_tailor/services" -H "Authorization: $LOC_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Haircut","description":"Classic cut and wash","price":200,"imageUrl":"https://img.example/cut.jpg","maxQty":null}'
```

| Field       | Type                 | Req | Notes                                         |
| ----------- | -------------------- | --- | --------------------------------------------- |
| name        | string               | ✔   |                                               |
| price       | number ≥ 0           | ✔   | rounded to 2 decimals                         |
| description | string               |     |                                               |
| imageUrl    | string               |     | empty, or starts with `http://` / `https://`  |
| maxQty      | integer ≥ 1 \| null  |     | null/omitted = location default               |

- 201 `{"service":{ ...service object... }}`
- 400 `{"error":"name is required"}` / `{"error":"price must be a number of at least 0"}` / `{"error":"maxQty must be empty or a whole number of at least 1"}` / `{"error":"imageUrl must start with http:// or https://"}`

#### PUT /location/{locCode}/services/{serviceId} · DELETE …

PUT takes the same body as POST and replaces all fields. DELETE is a soft delete; appointments keep their snapshot.

- PUT 200 `{"service":{...}}` · DELETE 200 `{"message":"Service deleted"}` · 404 `{"error":"Service not found"}` (unknown, already deleted, or another location's)

#### GET /service-types

Public. The types of service a `SERVICE` location can pick in its settings: 34 standard trades in a fixed order, then the ones locations added themselves (A–Z).

- 200 `{"serviceTypes":["Electrician","Wireman","Lineman","Plumber", … ,"Cleaning Supervisor","Drone pilot"]}` (types the admin removed aren't listed)

#### GET /store-categories · GET /product-types

Public. `{"storeCategories":["Food","Beverages","Grocery", …]}` (44 standard categories, then ones locations added) and `{"productTypes":[…]}` (managed by the admin). A service's `productType` (POST/PUT) must be one of the product types (any case) or `null` → otherwise 400 `{"error":"productType must be one of the product types"}`.

---

### 5.5 Calendar (availability)

#### GET /calendar/{calendarId}

Public. See section 3 for the ID format.

```bash
curl "$BASE/calendar/october2026_58cbfdb3-2d96-46d5-a7f5-9bc6b5f0e2f4_SHOP"
```

200:

```json
{
  "calendarDetails": {
    "clndr_id": "october2026_58cb..._SHOP",
    "day_details": {
      "4": { "15:30": { "count": 2, "evnt_list": ["60834c7e-..."] } }
    },
    "type": "SHOP",
    "active": 1,
    "created_on": "...",
    "created_by": "system",
    "updated_on": "...",
    "updated_by": "system"
  }
}
```

404 `{"error":"Calendar details not found"}` means no bookings exist yet that month. Treat it as empty, not as an error.

#### POST /calendar

Adds a booking's head-count to the calendar, creating or merging the month rows. Call it **after** a successful `POST /appointment` or `POST /event`.

```bash
# SHOP: one time slot
curl -X POST "$BASE/calendar" -H "Authorization: $USER_TOKEN" -H "Content-Type: application/json" \
  -d '{"plan_id":"<appointmentId>","count_of_ppl":2,"type":"SHOP",
       "details":[{"calendar_id":"october2026_<locId>_SHOP","days":[4],"time":"15:30"}]}'

# PLACE: one entry per month, several days each
curl -X POST "$BASE/calendar" -H "Authorization: $USER_TOKEN" -H "Content-Type: application/json" \
  -d '{"plan_id":"<eventId>","count_of_ppl":3,"type":"PLACE",
       "details":[{"calendar_id":"october2026_<locId>","days":[4,5]},{"calendar_id":"november2026_<locId>","days":[1]}]}'
```

| Field                 | Type              | Req       | Notes                                                                                        |
| --------------------- | ----------------- | --------- | -------------------------------------------------------------------------------------------- |
| plan_id               | string            | ✔         | appointmentId or eventId                                                                     |
| count_of_ppl          | number            | ✔         | added to the counts                                                                          |
| type                  | `SHOP` \| `PLACE` | ✔         |                                                                                              |
| details[].calendar_id | string            | ✔         | see the format above                                                                         |
| details[].days        | number[]          | ✔         | days of the month                                                                            |
| details[].time        | `"H:M"`           | SHOP only | slot key, e.g. `"15:30"` or `"9:0"` (the app uses `getHours():getMinutes()` without padding) |

- 201 `{"message":"Calendar details added successfully"}`
- 400 `{"error":"plan_id, type and a non-empty details array are required"}` · 401 without a token

---

### 5.6 Appointments (SHOP bookings)

#### POST /appointment

The customer books a slot. `user_id` is taken from the token. Status starts as `PENDING`.

```bash
curl -X POST "$BASE/appointment" -H "Authorization: $USER_TOKEN" -H "Content-Type: application/json" \
  -d '{"loc_id":"58cbfdb3-2d96-46d5-a7f5-9bc6b5f0e2f4","loc_name":"Raju Tailor",
       "apntmnt_time":"2026-10-04T10:00:00.000Z","apntmnt_period":"HOUR",
       "cret_on":"2026-10-03T11:04:54Z","cret_by":"Asha",
       "bokng_name":"Asha","bokng_mobile":"9999999999","bokng_cnt":2,"bokng_desc":"Blouse fitting"}'
```

| Field          | Type                  | Req | Notes                     |
| -------------- | --------------------- | --- | ------------------------- |
| loc_id         | string (uuid)         | ✔   | the location's `user_id`  |
| loc_name       | string                | ✔   |                           |
| apntmnt_time   | ISO datetime          | ✔   | slot start                |
| apntmnt_period | `HOUR`\|`DAY`\|`WEEK` | ✔   | sets `end_time`           |
| cret_on        | ISO datetime          |     | client timestamp          |
| cret_by        | string                |     | display name              |
| bokng_name     | string                |     | stored as `user_name`     |
| bokng_mobile   | string                |     | stored as `mobile_number` |
| bokng_cnt      | number                |     | number of people; ignored (stored as 1) at dark stores and for `HOME_VISIT` |
| order_type     | see below             |     | optional; defaults to the first allowed value. Send `count_of_ppl: 1` to `POST /calendar` for dark-store bookings and home visits |
| delivery_address | string              | for `PORTER`, `HOME_VISIT` | where the store goes, 1–500 characters; stored as `dlvry_addr`. Ignored (stored `null`) for the other types |
| bokng_desc     | string                | ✔   | note for the store; must not be empty or only spaces |
| services       | array of `{svc_id, qty}` | | add-ons (§5.4a); each one of the location's active services, listed once, with `1 ≤ qty ≤ effectiveMaxQty`. Saved as a snapshot of name and price |

Allowed `order_type` by location:

| Location | Allowed | Default |
|---|---|---|
| `PRODUCT` | `TABLE`, `PICKUP`, `PORTER` | `TABLE` |
| `PRODUCT`, dark store | `PORTER`, `PICKUP` | `PORTER` |
| `SERVICE` | `APPOINTMENT`, `HOME_VISIT` | `APPOINTMENT` |
| `SERVICE`, dark store | `HOME_VISIT` | `HOME_VISIT` |

`TABLE`, `PICKUP` and `APPOINTMENT` mean the customer goes to the store, so they're only allowed when the location's profile has an address (`loc_address` not blank). Without one, product locations take `PORTER` only and service locations `HOME_VISIT` only.

- 201 `{"message":"Appointment added successfully","appointmentId":"60834c7e-ca6b-4b13-a724-c27df35feec8","status":"ACCEPTED","orderType":"TABLE"}`
- 400 `{"error":"Missing required fields"}` / `{"error":"bokng_desc is required"}` / `{"error":"Invalid apntmnt_time"}` / `{"error":"qty for Haircut must be between 1 and 2"}` / `{"error":"services contains a service this location doesn't offer"}` / `{"error":"This store takes APPOINTMENT or HOME_VISIT bookings"}` (any type the location doesn't allow) / `{"error":"delivery_address is required for PORTER and HOME_VISIT bookings (at most 500 characters)"}` · 401 · 403 `{"error":"Your account is inactive, so you can't submit requests. Contact support."}` / `{"error":"This store isn't taking bookings right now"}` (inactive customer or location; the customer's `GET /traveller/profile` has `"inactive": true`)

**Appointment object** (returned by the list endpoints and the PUT):

```json
{
  "apntmnt_id": "60834c7e-...",
  "loc_id": "58cb...",
  "loc_name": "Raju Tailor",
  "apntmnt_time": "2026-10-04T10:00:00.000Z",
  "apntmnt_period": "HOUR",
  "user_id": "92177fd2-...",
  "user_name": "Asha",
  "mobile_number": "9999999999",
  "bokng_desc": "Blouse fitting",
  "bokng_cnt": "2",
  "start_time": "2026-10-04T10:00:00.000Z",
  "end_time": "2026-10-04T11:00:00.000Z",
  "cret_on": "...",
  "cret_by": "Asha",
  "updt_on": "...",
  "updt_by": "Asha",
  "status": "PENDING",
  "status_updt_by": null,
  "status_updt_on": null,
  "updt_reason": null,
  "services": [{ "svc_id": "c4753b3f-...", "name": "Haircut", "price": 200, "qty": 2 }],
  "order_type": "TABLE",
  "dlvry_addr": null
}
```

`bokng_cnt` comes back as a string. `services` is the snapshot of booked add-ons (name and price at booking time), or `null`. `order_type` is `null` for bookings made before order types existed. `dlvry_addr` is the delivery address of `PORTER` and `HOME_VISIT` bookings, otherwise `null`.

#### PUT /appointment

The owner changes an appointment's status. Only works on appointments at the token's own location.

```bash
curl -X PUT "$BASE/appointment" -H "Authorization: $LOC_TOKEN" -H "Content-Type: application/json" \
  -d '{"apntmnt_id":"60834c7e-ca6b-4b13-a724-c27df35feec8","status":"REJECTED","updt_reason":"Fully booked"}'
```

| Field       | Type                              | Req |
| ----------- | --------------------------------- | --- |
| apntmnt_id  | string                            | ✔   |
| status      | `ACCEPTED`\|`REJECTED`\|`PENDING` | ✔   |
| updt_reason | string                            |     |

- 200 `{"message":"Appointment status updated successfully","appointment":{ ...appointment object... }}`
- 400 (missing fields, or `{"error":"status must be one of ACCEPTED, REJECTED, PENDING"}`)
- 403 `{"error":"Forbidden: location login required"}` (a user token was sent)
- 404 (the appointment doesn't exist or belongs to a different location)

#### POST /events/pending-appointment · /accepted-appointment · /rejected-appointment · /all-appointment

Owner lists: appointments at the token's location whose `start_time`–`end_time` range covers **any** of `selected_dates`.

```bash
curl -X POST "$BASE/events/pending-appointment" -H "Authorization: $LOC_TOKEN" -H "Content-Type: application/json" \
  -d '{"selected_dates":["2026-10-04","2026-10-05"]}'
```

| Endpoint                       | Response key            |
| ------------------------------ | ----------------------- |
| `/events/pending-appointment`  | `open_appointments`     |
| `/events/accepted-appointment` | `accepted_appointments` |
| `/events/rejected-appointment` | `rejected_appointments` |
| `/events/all-appointment`      | `all_appointments`      |

- 200 `{"open_appointments":[ ...appointment objects... ]}` (an empty array when there are none)
- 400 `{"error":"selected_dates must be an array of dates"}` · 403 for a user token

#### GET /events/coming-events · /inprogress-events · /completed-events

Appointments for the caller, grouped by time. With a **location token** they cover appointments at that location; with a **user token**, appointments that user booked.

| Endpoint                    | Range (by `start_time` date) | Order      |
| --------------------------- | ---------------------------- | ---------- |
| `/events/coming-events`     | tomorrow onward              | ascending  |
| `/events/inprogress-events` | today                        | ascending  |
| `/events/completed-events`  | before today                 | descending |

```bash
curl "$BASE/events/coming-events" -H "Authorization: $USER_TOKEN"
```

- 200 `{"success":true,"data":[ ...appointment objects... ]}`
- 500 `{"success":false,"message":"Failed to fetch ... appointments"}`

---

### 5.7 Events (PLACE bookings)

#### POST /event

The customer books a visit to a PLACE for one or more dates with a group of members. `created_by` and `updated_by` are overwritten with the signed-in user's `userName`.

```bash
curl -X POST "$BASE/event" -H "Authorization: $USER_TOKEN" -H "Content-Type: application/json" \
  -d '{"evnt_name":"Family trip","evnt_desc":"","group_id":"grp-1",
       "loc_id":"ec86950e-5881-48d4-85c5-b7966a892449","loc_name":"Taj Mahal",
       "members":[{"member_id":1,"member_name":"Asha","member_email":"asha@example.com"}],
       "dates_list":"2026-10-04T00:00:00.000Z,2026-10-05T00:00:00.000Z",
       "created_on":"2026-10-03T11:04:59Z","created_by":"SYSTEM",
       "updated_on":"2026-10-03T11:04:59Z","updated_by":"SYSTEM","active":1}'
```

| Field                   | Type                                               | Req | Notes                                                                                                     |
| ----------------------- | -------------------------------------------------- | --- | --------------------------------------------------------------------------------------------------------- |
| evnt_name               | string                                             | ✔   |                                                                                                           |
| evnt_desc               | string                                             |     |                                                                                                           |
| group_id                | string                                             |     |                                                                                                           |
| loc_id / loc_name       | string                                             | ✔   | the PLACE's `user_id` and name                                                                            |
| members                 | array of `{member_id?, member_name, member_email}` | ✔   | `member_email` must equal a customer's `user_name` for the event to show up in their `/traveller/*` lists |
| dates_list              | string                                             | ✔   | **comma-separated** ISO dates; the server derives `strt_dt` and `end_dt` from the earliest and latest     |
| created_on / updated_on | ISO datetime                                       |     |                                                                                                           |
| active                  | 1                                                  | ✔   | send `1`                                                                                                  |

- 201 `{"message":"Event added successfully","eventId":"aad63cc1-..."}`

#### GET /traveller/upcoming · /progress · /completed

The signed-in customer's PLACE events, matched on `members[].member_email = userName`.

| Endpoint               | Condition                          | Response key       |
| ---------------------- | ---------------------------------- | ------------------ |
| `/traveller/upcoming`  | `strt_dt` after today              | `upcomingEvents`   |
| `/traveller/progress`  | today is within `strt_dt`–`end_dt` | `inProgressEvents` |
| `/traveller/completed` | `end_dt` before today              | `completedEvents`  |

```bash
curl "$BASE/traveller/upcoming" -H "Authorization: $USER_TOKEN"
```

200:

```json
{
  "upcomingEvents": [
    {
      "evnt_id": "aad63cc1-...",
      "evnt_name": "Family trip",
      "evnt_desc": "",
      "group_id": "grp-1",
      "loc_id": "ec86...",
      "loc_name": "Taj Mahal",
      "members": [
        { "member_name": "Asha", "member_email": "asha@example.com" }
      ],
      "dates_list": "2026-10-04T00:00:00.000Z",
      "strt_dt": "2026-10-04T00:00:00.000Z",
      "end_dt": "2026-10-04T00:00:00.000Z",
      "created_on": "...",
      "created_by": "asha@example.com",
      "updated_on": "...",
      "updated_by": "asha@example.com",
      "active": 1,
      "is_opn_event": 0
    }
  ]
}
```

---

## 6. Gotchas for UI code

- The location id is called `user_id` on location rows and `loc_id` on appointment, event and settings rows. They are the same UUID.
- Numeric DB columns `max_limit` and `bokng_cnt` come back as **strings**.
- Times are stored as ISO UTC strings. `open_at` and `close_at` are local `"HH:MM"` strings.
- `GET /calendar/{id}` returns 404 for "no bookings yet". Handle it as an empty calendar.
- Profile and settings rows are created lazily by their GET endpoints. Call GET before PUT.
- Booking is two calls (create, then `POST /calendar`). If the second call fails, the booking still exists but availability counts aren't updated.
