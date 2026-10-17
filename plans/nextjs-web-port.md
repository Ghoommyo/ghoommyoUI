# Ghoomyo web screens: port spec for Next.js

This spec describes every web screen of the Ghoomyo Expo app so they can be rebuilt in this Next.js project with the same behaviour, copy and look. It was written from the Expo app's source; this project can't see that code, so everything needed is here.

**How to use it:** put this file in the project (e.g. `plans/ghoomyo-web-screens.md`), copy the two reference screenshots (`user_dash.png`, `store_dash.png`) next to it under `references/`, and ask Claude to "do Phase 0" of this spec, then each phase in turn. Tick phases off at the bottom and write non-obvious decisions into each phase's **Done** notes.

---

## 1. Product

Ghoomyo is a scheduling and booking app. **Users** pick a store, see how many visitors each time slot already has, and book a slot. **Stores** see a month calendar of visitor counts, search bookings by day, and accept or reject them. Guests (signed out) can browse slot counts but must log in to book.

Two roles: `user` and `store`. For store accounts, the account id **is** the store id.

## 2. Phase 0: survey this project first (no code yet)

Before building anything, inspect this Next.js project and write the answers into the **Phase 0 Done** notes:

1. Router: App Router (`app/`) or Pages Router? Next.js version? Where do routes live?
2. Styling: Tailwind, CSS Modules, a component library (shadcn/ui, MUI…)? Is dark mode set up, and how (class, media query)?
3. **API client:** where it lives, how it authenticates (header, cookie), how errors are surfaced, and how the token/session is stored.
4. Data fetching: TanStack Query, SWR, server actions, plain fetch? Reuse what exists; add TanStack Query only if nothing is there.
5. Existing auth/session handling, layout shell, and reusable components (button, input, select, dialog, tabs).
6. Map every operation in §5 to an existing client function. Make a table: operation → function → notes. **List anything missing and stop to ask** before inventing endpoints.

Rules for every phase:
- Reuse this project's existing components, styling approach and conventions. The look below is the target; how it's built should match this project.
- Don't add dependencies when the project already has an equivalent.
- Every interactive screen is a client component (`'use client'`). Anything that reads `new Date()` or `localStorage` must render after mount to avoid hydration mismatches (render a placeholder on the server).
- Run the project's lint, typecheck and build at the end of each phase, and check the screens in a browser in light and dark mode at phone (≈390px) and desktop widths.

## 3. Domain model

Copy these types (adapt names only if this project already has equivalents):

```ts
export type Role = 'user' | 'store';
export type LimitUnit = 'day' | 'hour' | 'halfHour';
export type BookingStatus = 'pending' | 'accepted' | 'rejected';

/** `YYYY-MM-DD`, local time. */
export type DateKey = string;
/** `YYYY-MM-DDTHH:mm`, local time. */
export type SlotStart = string;

export interface Session {
  token: string;
  role: Role;
  /** For stores this is also the store id. */
  accountId: string;
  /** Users: their email. Stores: their login (location) code. */
  email: string;
  /** Display name: the user's name or the store's name. */
  name?: string;
  /** Store login code; owner endpoints are addressed by it. */
  locCode?: string;
}

/** Users sign in with their email; stores with their email or store name. */
export type Credentials =
  | { role: 'user'; email: string; password: string }
  | { role: 'store'; /** Email, or store name in any case/spacing. */ login: string; password: string };

export type SignupInput =
  /** `username` is a display name and may be shared by several users. */
  | { role: 'user'; username: string; email: string; password: string }
  /** `locationName` is unique per store once normalized (see `storeKey`). */
  | { role: 'store'; locationName: string; email: string; password: string };

export interface StoreSettings {
  name: string;
  /** Visitors allowed per `limitUnit`. */
  maxPerSlot: number;
  maxPerBooking: number;
  limitUnit: LimitUnit;
  autoApprove: boolean;
  openAt: string;  // HH:mm
  closeAt: string; // HH:mm
}

export interface StoreProfile {
  address: string;
  pin: string;
  city: string;
  state: string;
  country: string;
  bio: string;
  lat?: number;
  lng?: number;
  /** Navigation link set by the store. */
  mapUrl?: string;
}

export interface Store extends StoreSettings {
  id: string;
  profile: StoreProfile;
}

export interface UserProfile { name: string; mobile: string; }

export interface Booking {
  id: string;
  storeId: string;
  storeName: string;
  userId: string;
  slotStart: SlotStart;
  name: string;
  mobile: string;
  people: number;
  description: string;
  status: BookingStatus;
  createdAt: string;
}

export interface NewBooking {
  storeId: string; slotStart: SlotStart; name: string; mobile: string; people: number; description: string;
}

export interface Slot { start: SlotStart; /** Visitors booked into this slot. */ count: number; }
export interface DaySummary { date: DateKey; count: number; }
```

**Dates and slot times are always local-time strings** (`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm`), never `Date` objects or ISO strings with a timezone, so plain string comparison orders them. Convert to/from the API's format only inside the API adapter.

## 4. Pure helpers (copy verbatim)

`lib/date.ts`:

```ts
import type { DateKey, SlotStart } from '<types>';

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'] as const;
export const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function makeDateKey(year: number, month: number, day: number): DateKey {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}
export function todayKey(): DateKey { return toDateKey(new Date()); }
/** Parses `YYYY-MM-DD` into its parts (month is 0-based). */
export function parseDateKey(key: DateKey) {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month: month - 1, day };
}
export function addDays(key: DateKey, days: number): DateKey {
  const { year, month, day } = parseDateKey(key);
  return toDateKey(new Date(year, month, day + days));
}
/** `HH:mm` → minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
/** Minutes since midnight → `HH:mm`. */
export function fromMinutes(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}
/** `HH:mm` → `9:00 AM`. */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${suffix}`;
}
/** `YYYY-MM-DD` → `October 3`. */
export function formatDayLong(key: DateKey): string {
  const { month, day } = parseDateKey(key);
  return `${MONTHS[month]} ${day}`;
}
/** `YYYY-MM-DDTHH:mm` → `Oct 3, 9:00 AM`. */
export function formatSlotStart(start: SlotStart): string {
  const { month, day } = parseDateKey(start.slice(0, 10));
  return `${MONTHS[month].slice(0, 3)} ${day}, ${formatTime(start.slice(11, 16))}`;
}
/** `HH:mm` options every `step` minutes within [from, to] (minutes; 1440 = `24:00`). */
export function timeOptions(from: number, to: number, step = 30) {
  const options: { label: string; value: string }[] = [];
  for (let m = from; m <= to; m += step) {
    options.push({ label: m === 1440 ? '12:00 AM (midnight)' : formatTime(fromMinutes(m)), value: fromMinutes(m) });
  }
  return options;
}
```

`lib/slots.ts`:

```ts
import { fromMinutes, makeDateKey, toMinutes } from './date';
import type { Booking, DateKey, LimitUnit, SlotStart, StoreSettings } from '<types>';

export type SlotState = 'ok' | 'full' | 'over';

const STEP_MINUTES: Record<Exclude<LimitUnit, 'day'>, number> = { hour: 60, halfHour: 30 };

export const LIMIT_UNIT_LABEL: Record<LimitUnit, string> = { day: 'day', hour: 'hour', halfHour: 'half hour' };

/** Slot starts from `openAt` up to (not including) `closeAt`. `day` yields one slot at opening time. */
export function buildSlotStarts(date: DateKey, openAt: string, closeAt: string, unit: LimitUnit): SlotStart[] {
  const open = toMinutes(openAt);
  if (unit === 'day') return [`${date}T${openAt}`];
  const step = STEP_MINUTES[unit];
  const starts: SlotStart[] = [];
  for (let m = open; m < toMinutes(closeAt); m += step) starts.push(`${date}T${fromMinutes(m)}`);
  return starts;
}

export function slotState(count: number, max: number): SlotState {
  if (count > max) return 'over';
  if (count >= max) return 'full';
  return 'ok';
}

/** How many visitors a store can take in a whole day. */
export function dayCapacity(store: StoreSettings): number {
  return store.maxPerSlot * buildSlotStarts('2000-01-01', store.openAt, store.closeAt, store.limitUnit).length;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Calendar cells for a month, padded with `null` so day 1 lands on its weekday (Sunday first). */
export function monthGrid(year: number, month: number): (DateKey | null)[] {
  const lead = new Date(year, month, 1).getDay();
  const cells: (DateKey | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth(year, month); d++) cells.push(makeDateKey(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Splits bookings into upcoming (from tomorrow), today, and past. */
export function bucketEvents(bookings: Booking[], today: DateKey) {
  const coming: Booking[] = [], inProgress: Booking[] = [], completed: Booking[] = [];
  for (const b of bookings) {
    const day = b.slotStart.slice(0, 10);
    if (day > today) coming.push(b);
    else if (day === today) inProgress.push(b);
    else completed.push(b);
  }
  const asc = (a: Booking, b: Booking) => a.slotStart.localeCompare(b.slotStart);
  coming.sort(asc);
  inProgress.sort(asc);
  completed.sort((a, b) => asc(b, a));
  return { coming, inProgress, completed };
}
```

`lib/store-name.ts`:

```ts
const STORE_NAME_PATTERN = /^[A-Za-z0-9]+( [A-Za-z0-9]+)*$/;

/** Trims and collapses repeated spaces, so `Raju  Tailor ` and `Raju Tailor` are the same store. */
export function normalizeStoreName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}
/** Letters, digits and single spaces only. Returns an error message, or undefined when valid. */
export function validateStoreName(name: string): string | undefined {
  const normalized = normalizeStoreName(name);
  if (!normalized) return 'Store name is required.';
  if (!STORE_NAME_PATTERN.test(normalized)) return 'Use letters, numbers and spaces only.';
  if (normalized.length > 60) return 'Keep the store name under 60 characters.';
}
/** The unique key a store is saved under: lowercased, spaces → `_` (`Raju Tailor` → `raju_tailor`). */
export function storeKey(name: string): string {
  return normalizeStoreName(name).toLowerCase().replace(/ /g, '_');
}
```

Form validators (put with the auth forms):

```ts
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;
export const MOBILE_PATTERN = /^\+?\d{10,15}$/; // test after stripping spaces and dashes

export function validateEmail(email: string) {
  if (!email.trim()) return 'Email is required.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.';
}
export function validateUsername(username: string) {
  const length = username.trim().length;
  if (!length) return 'Username is required.';
  if (length < 2 || length > 40) return 'Username must be 2–40 characters.';
}
```

## 5. Data operations the screens need

Map each to this project's existing API client in Phase 0. Signatures are the Expo app's; adapt to the existing client's shapes in a thin adapter so screens use the domain types above.

| Operation | Used by | Notes |
|---|---|---|
| `signup(input: SignupInput) → { loginCode? }` | Signup | Store names must be unique; show the server's error text on conflict. |
| `login(credentials) → Session` | Login | Stores may log in with email **or** store name. If the API can't do store-email login, show its error message. |
| `listStores() → Store[]` | User dashboard store picker | Only bookable stores (SHOP locations; hide PLACE). |
| `getStore(storeId) → Store` | Booking, store dashboard, settings, profile, side menu | |
| `getStoreSlots(storeId, date) → Slot[]` | User dashboard grid | One entry per slot from `buildSlotStarts`, with the visitor count. |
| `getStoreMonthSummary(storeId, year, month0) → DaySummary[]` | Store calendar | Visitors per day for that month. |
| `getStoreBookings(storeId, dates[]) → Booking[]` | Store bookings list | For the searched days. |
| `createBooking(NewBooking) → Booking` | Booking form | Returned `status` is `accepted` if the store auto-approves, else `pending`. |
| `setBookingStatus(bookingId, status) → Booking` | Store accept/reject | |
| `getMyBookings() → Booking[]` | User events tabs | |
| `updateStoreSettings(storeId, StoreSettings) → Store` | Store settings | |
| `updateStoreProfile(storeId, StoreProfile) → Store` | Store profile | |
| `getUserProfile() → UserProfile` / `updateUserProfile(p)` | User profile, booking prefill, side menu name | |

**Fields the backend may not store** (in the Expo app, with the Ghoomo API these were fixed defaults): store-name edits, `maxPerBooking` (default 5), `state`, map coordinates, the user's name and mobile. If this project's API can't save one, show that field read-only with the hint *"Can't be changed yet — the server doesn't support it."*

**Caching / refetch rules** (TanStack Query keys shown; mirror them in whatever this project uses):
- Keys: `['stores']`, `['stores', id]`, `['stores', id, 'slots', date]`, `['stores', id, 'month', y, m]`, `['stores', id, 'bookings', dates]`, `['me', accountId, 'bookings']`, `['me', accountId, 'profile']`. Account-scoped data includes the account id so switching accounts never shows stale data.
- New booking → invalidate `['stores', storeId]` (refreshes slots, month summary, store bookings) and the user's bookings.
- Accept/reject → invalidate `['stores', storeId]` and `['me']`.
- Save store settings/profile → invalidate `['stores']`. Save user profile → write the result into the profile cache.
- Don't retry 4xx errors; retry others up to twice. **Any 401 signs the user out.**

## 6. Session

- Store the `Session` (and an `introSeen` flag) the way this project already stores auth; otherwise `localStorage` keys `ghoomyo.session` and `ghoomyo.introSeen`.
- Expose `useSession()` → `{ session, isLoading, hasSeenIntro, signIn(session), signOut(), markIntroSeen() }`. Render nothing route-dependent until `isLoading` is false.

## 7. Look and feel

### Colors (light / dark)

Shared in both modes:

| Token | Value | Use |
|---|---|---|
| primary | `#3B6FF5` | primary buttons, active tab/menu, avatar, selected outline |
| onPrimary | `#FFFFFF` | text on coloured fills |
| success | `#5CB85C` | Book/Confirm/Save/Search/Accept, "accepted", calendar pill ok |
| danger | `#E5533D` | Reset/Reject/Logout, errors, "rejected", calendar pill over |
| warning | `#F5A623` | "pending", calendar pill full |
| accent | `#E8891A` | calendar arrows, today glow |
| purple | `#5B3FE0` | date pill on Visitor Schedule card |
| eventCard | `#4A9FF5` | booking rows |
| card / cardText / cardTextSecondary | `#FFFFFF` / `#15181E` / `#5F6470` | the white Visitor Schedule card (white in both modes) |
| slot / slotBorder | `#F1FAF2` / `#D5ECD8` | slot ok |
| slotFull / slotFullBorder | `#FFF1D2` / `#F5C76A` | slot full |
| slotOver / slotOverBorder | `#FDE1DD` / `#EE9184` | slot over capacity |
| overlay | `rgba(0,0,0,0.5)` | modal backdrop |

Per mode:

| Token | Light | Dark |
|---|---|---|
| text | `#111318` | `#FFFFFF` |
| textSecondary | `#5F6470` | `#A9AEB8` |
| background | `#F4F5F7` | `#1F232B` |
| backgroundElement (inputs, cards, menu) | `#FFFFFF` | `#2A2F38` |
| backgroundSelected (secondary button, selected rows) | `#E4E7EC` | `#363C47` |
| border | `#D9DCE1` | `#3A404B` |

Follow the system colour scheme. The dark palette matches the reference screenshots.

### Spacing, type, layout

- Spacing scale: 2, 4, 8, 16, 24, 32, 64 px.
- Text: default 16/24 weight 500; small 14/20 weight 500; smallBold 14/20 weight 700; subtitle 32/44 weight 700 (page titles).
- Page: content column `max-width: 800px`, centred, padding 16px, bottom padding 64px, 16px vertical gap between blocks, scrolls normally.
- Radii: inputs/buttons 8px; cards 16px; Visitor Schedule card 24px.

## 8. Shared UI kit

Build these once (or map them onto existing components that can be styled to match):

- **Brand** — wordmark `GHOOMYO`, weight 900, letter-spacing 4px; sizes 48 (intro), 40 (auth), 34 (header).
- **AppHeader** — row: Brand (34) left, a primary button `≡ Menu` right (aria-label "Open menu") that opens the side menu. Optional page title below in subtitle style.
- **SideMenu** — a left drawer over the page (overlay, closes on backdrop click/Escape/route change). Spec in §10.10.
- **Button** — variants `primary` (primary bg), `success`, `danger`, `secondary` (backgroundSelected bg, text colour). Sizes `md` (min-height 44, 8×24 padding, 16px text) and `sm` (min-height 32, 4×16, 14px bold). `loading` shows a spinner and disables; pressed/disabled → opacity .6; `fullWidth` stretches.
- **TextField** — bold 14px label above; input 16px, min-height 44, border 1px border-colour (danger when errored), backgroundElement bg; multiline min-height 96. Below: error text (danger) or, if none, hint text (textSecondary). Read-only → opacity .6.
- **Select** — label above, field looks like TextField with a `▾` and placeholder in textSecondary. Option `onCard` = white field with `#C9CDD4` border and dark text, for use inside the white card. A styled native `<select>` is fine; a custom listbox (centred dialog, max-width 400, max-height 70%, 52px rows, ✓ on selected, scrolled to the current value) matches the app more closely. Values can be numbers or strings.
- **Banner** — inline message `{ type: 'success' | 'error'; text }`: border 1px + left border 4px in success/danger, backgroundElement bg, text in that colour, 14px. `role="alert"`, polite live region. Renders nothing for null.
- **ConfirmModal** — centred dialog (max-width 400, radius 16, padding 24) over overlay; bold title, secondary-colour message, right-aligned `[cancelLabel (secondary)] [confirmLabel (primary, or danger if destructive)]`. Backdrop click and Escape cancel. Use `<dialog>` or the project's dialog. Never `window.confirm`.
- **SegmentedTabs** — full-width underlined tab bar, bottom border 2px border-colour; each tab grows equally, 16px text; active tab bold primary text with a 3px primary underline; inactive textSecondary. Scrolls horizontally if it overflows. `role="tablist"`/`"tab"`.
- **Avatar** — circle (56px) primary bg, initials in white bold (size × .38): first letters of the first two parts of the name split on whitespace, `@ . _ -`; `?` if empty.
- **StatusChip** — rounded 8px, coloured bg (accepted success, pending warning, rejected danger), white bold 13px: `✓ Accepted`, `◦ Pending`, `✕ Rejected`.
- **EventCard** — blue (`eventCard`) row, radius 16, padding 16, wraps on narrow screens, white text. Three columns: (1) min-width 96: `formatSlotStart(slotStart)` small, then title bold 16; (2) flexible, left border 1px `rgba(255,255,255,.5)`, padding-left 16: description (max 3 lines, fallback `No description`), then `N person`/`N people` small; (3) right-aligned, min-width 104, stacked actions (defaults to the StatusChip).
- **Spinner** for loading states.

## 9. Routes and guards

| Path | Access | Renders |
|---|---|---|
| `/` | anyone | Intro; if intro already seen → redirect `/dashboard` |
| `/login`, `/signup` | signed out only (signed in → `/dashboard`) | auth forms |
| `/dashboard` | anyone | store → StoreDashboard; user or guest → UserDashboard |
| `/booking?storeId=&slotStart=` | role `user` only (else → `/dashboard`) | booking form (a page; an intercepting-route modal is optional) |
| `/events` | role `user` only | AppHeader title "Events" + UserEventsTabs |
| `/profile`, `/settings` | signed in | store or user variant |

`/dashboard`, `/events`, `/profile`, `/settings` share a layout with the side menu. Do guards client-side from the session (or with middleware if this project's auth uses cookies).

## 10. Screens

### 10.1 Intro `/`
- Centred hero (64px vertical padding): Brand 48, tagline *"Scheduling and booking for the places you visit."* (textSecondary, centred).
- Three cards (backgroundElement, radius 16, padding 16): bold 16px title + small textSecondary body:
  - **Book appointments** — Pick a store, choose a time slot and reserve your visit in a few taps.
  - **Skip the crowd** — See how many people are visiting each hour before you go.
  - **Stores near you** — Find nearby stores, then order or schedule with them directly.
- Full-width primary **Get started** → `markIntroSeen()` then replace to `/dashboard`.

### 10.2 Login `/login`
- Auth layout: centred Brand (40) + subtitle "Login" (32px top padding); form; footer centred "Not a member?" + link **Click to signup** → `/signup` (replace).
- Query params from signup: `registered=1`, `role`, `store`. If `registered`, show a success Banner: stores → *"Account created. Log in with your email or store name."*, users → *"Account created. Please log in."* A login error replaces it with an error Banner (server message).
- **Type** Select (User / Store), defaults to `role` param or User. Changing type clears the identifier field, errors and the login error.
- User: **Email** field (email input). Store: **Email or store name** (placeholder `you@example.com or Raju Tailor`), prefilled from `store` param.
- **Password**; Enter submits.
- Validation: user → `validateEmail`; store → *"Enter your email or store name."* if blank; password → *"Password is required."*
- Full-width primary **Login** (loading while pending). On success: `signIn(session)`, replace to `/dashboard`.

### 10.3 Signup `/signup`
- Same layout, title "Sign up", footer "Already a member?" + **Click to login**.
- **Type** Select, placeholder *"User or store"*, no default; error *"Choose an account type."*
- Store → **Store name**: hint *"Letters, numbers and spaces only. Must be unique."*, or once typed *`Must be unique. Saved as "<storeKey(name)>".`*; validates with `validateStoreName` on blur and submit; typing clears its error.
- User → **Username**: hint *"Shown on your bookings. Doesn't need to be unique."*; `validateUsername`.
- Neither field until a type is chosen.
- **Email** (`validateEmail`), **Password** (*"Password must be at least 8 characters."*), **Confirm password** (*"Passwords do not match."*; Enter submits).
- Full-width primary **Sign up**. Send `normalizeStoreName(name)` for stores, trimmed username/email. Error → error Banner with server message. Success → replace to `/login?registered=1&role=<role>` plus `&store=<locationName>` for stores.

### 10.4 User dashboard `/dashboard` (users and guests)
See `references/user_dash.png`.
1. AppHeader.
2. Row: store Select (`onCard`, no label, placeholder *"Loading stores…"* / *"Select a store"*, options = store names) and, once a store is picked, textSecondary text `Max Count : {maxPerSlot} per {LIMIT_UNIT_LABEL[limitUnit]}`. Stores load error → error Banner.
3. **Visitor Schedule card** (white `card` bg in both modes, radius 24, padding 16, 16 gap):
   - Header row: left — title *"Visitor Schedule"* (24/30, weight 800, cardText) and *"Monitor visitors by day and hour"* (small, cardTextSecondary); right — purple pill (radius 8, 8×16 padding) with white bold `formatDayLong(date)`, e.g. "October 3".
   - Row of two `onCard` Selects: **Month** (next 12 months starting this month, labels `October 2026`) and **Day** (1…daysInMonth). Changing month clamps the day to the month's length. Changing month/day/store clears the selected slot.
   - Body: no store → *"Select a store to see how many people are visiting and when."* (centred, cardTextSecondary, 24px vertical padding); loading → spinner; error → message in danger; else the **slot grid**.
   - **Slot grid**: wrapping grid, 8px gap; 1 column if `limitUnit === 'day'`, else 4 columns when the grid is ≥520px wide, otherwise 3. Each block: radius 16, padding 8, min-height 104, bg/border by `slotState(count, maxPerSlot)` (ok → slot/slotBorder, full → slotFull/slotFullBorder, over → slotOver/slotOverBorder), border 1.5px; **selected** → 3px primary border. Content (dark card text): label bold 14 (`All day` for day unit, else `formatTime(HH:mm)`), count 30/40 weight 800, then *"visitors"* small cardTextSecondary. Slots that start before now are dimmed (opacity .5) and not selectable. `aria-label`: `"9:00 AM, 2 visitors, full"`.
4. Banner: local message, else the booking confirmation from query params `booked` + `status`: *`Booking confirmed for Oct 3, 9:00 AM.`* when accepted, or *`Booking requested for Oct 3, 9:00 AM. The store will review it.`* when pending.
5. Right-aligned actions: danger **Reset** (clears store, month/day back to today, slot, message, and the `booked`/`status` params) and success **Book** (label *"Login to book"* when signed out).
   - Book: signed out → `/login`; no store → error *"Store is not selected."*; no slot → *"Time is not selected."*; else clear messages/params and go to `/booking?storeId=…&slotStart=…`.
6. If signed in as a user: **UserEventsTabs** (§10.7) below.

### 10.5 Booking `/booking`
- While store/profile load → centred spinner. Missing store or `slotStart` → error Banner (server message, or *"This booking link is incomplete."*) + **Back to dashboard**.
- Page title area: store name (smallBold textSecondary), then `formatSlotStart(slotStart)` in subtitle style. (In the app this is a modal titled "Book a visit"; use that as the page/heading title.)
- Error Banner for a failed create.
- **Name** (prefilled from profile; *"Name is required."*), **Contact (mobile)** (prefilled; tel input; strip spaces/dashes then `MOBILE_PATTERN`, *"Enter a valid mobile number."*), **How many people are coming** Select 1…maxPerBooking, placeholder `1 to {max}` (*"Choose how many people are coming."*), **Description** multiline, placeholder *"Anything the store should know"*, optional.
- Right-aligned: secondary **Cancel** → ConfirmModal *"Discard this booking?"* / *"Nothing will be saved."* / confirm **Discard** (destructive) / cancel **Keep editing** → back. Success **Confirm** (loading) → create with trimmed values, then replace to `/dashboard?booked=<slotStart>&status=<status>`.

### 10.6 Store dashboard `/dashboard` (stores)
See `references/store_dash.png`.
1. AppHeader. While the store loads → spinner below it. Store load error → error Banner.
2. Subheader (wrapping, baseline aligned, 24px column gap): store name (20px bold), textSecondary `Max Count : {dayCapacity(store)} per day`.
3. **Month calendar**:
   - Header: `October, 2026` (20px bold) left; two round 44px buttons (backgroundSelected bg, accent `‹` / `›` 28px bold) — "Previous month"/"Next month".
   - Weekday row SUN…SAT (smallBold, textSecondary, letter-spacing 1, centred).
   - 7-column grid from `monthGrid`; blanks are empty cells. Each day cell (2px margin, radius 16, 2px transparent border, 4px vertical padding): day number (26/34 weight 800) and a pill below (radius 6, full width, white 12px weight 800) showing the count or `NA` when 0/missing. Pill colour by `slotState(count, dayCapacity)`: ok success, full warning, over danger (no count → success).
   - **Today**: backgroundElement bg + glow `box-shadow: 0 0 12px 2px <accent>`. **Selected**: primary border + backgroundSelected bg. Clicking toggles selection (multi-select, persists across month changes).
4. Error Banner (*"Select one or more days first."*).
5. Row: small textSecondary text *"Tap days to select them."* or *"N day(s) selected"*; secondary **Clear** (only when something is selected; clears selection and search); success **Search** (sets the searched dates = selection sorted).
6. **Store bookings**: SegmentedTabs **Open** (pending) / **Accepted** / **Rejected** / **All**, default Open. Error Banner for a failed status change. Body: no search yet → *"Select days on the calendar and tap Search to see bookings."*; loading → spinner; error → Banner; empty → *"No bookings here for the selected days."*; else EventCards titled with the visitor's name. Actions column: on **All** show the StatusChip first; then success sm **✓ Accept** unless accepted, danger sm **✕ Reject** unless rejected. While one booking's change is pending, both its buttons are disabled and the clicked one shows a spinner.

### 10.7 Events `/events` and UserEventsTabs
- Page: AppHeader title "Events" + UserEventsTabs.
- SegmentedTabs **Coming Events** / **In-Progress Events** / **Completed Events** (default Coming), from `bucketEvents(myBookings, todayKey())`.
- Loading spinner; error Banner; empty texts: *"No upcoming events. Book a visit from the dashboard."*, *"Nothing scheduled for today."*, *"No past events yet."*
- EventCards titled with the store name; right column is the read-only StatusChip (users never see Accept/Reject).

### 10.8 Profile `/profile`
AppHeader title "Profile". Loading → spinner; load error → error Banner.
- **Store**: location block first, then a Banner (save result), then fields **Address**, **PIN code** (numeric; empty or 4–10 digits, *"PIN code should be 4–10 digits."*), **City**, **State**, **Country**, **Map link** (URL, placeholder `https://maps.google.com/…`; empty or `^https?://\S+$`, *"Enter a link starting with https://"*), **Bio** (multiline). Right-aligned success **Save** → trims all strings, success *"Profile saved."* or error Banner.
  - Location block (card, backgroundElement, radius 16, padding 16): bold "Location", then the joined address `address, city, state, pin, country` (blanks skipped) or *"No address yet"*, then link **Open in Maps ↗** (new tab) to `mapUrl`, else Google Maps search for `lat,lng` if present, else the address: `https://www.google.com/maps/search/?api=1&query=<encoded>`. (Native shows a map; web shows only this card. An embedded map is optional.)
- **User**: Banner, **Name** (required, *"Name is required."*), **Mobile** (optional; if set, strip spaces/dashes and `MOBILE_PATTERN`, *"Enter a valid mobile number."*), right-aligned **Save** → *"Profile saved."*

### 10.9 Settings `/settings`
AppHeader title "Settings".
- **Store** (form state seeded from the store; Banner at top):
  - **Store name** (required, *"Store name is required."*)
  - Row: **Max limit per unit** (number; *"Enter a whole number of at least 1."*) + **Limit unit** Select (Day / Hour / Half hour)
  - **Max limit per booking** (same validation)
  - Row: **Open at** Select (`timeOptions(0, 1410)`) + **Close at** Select (`timeOptions(30, 1440)`; *"Closing time must be after opening time."* unless close > open)
  - Bordered row (radius 8, padding 16): bold "Auto approve" + small *"Accept new bookings without reviewing them."*, toggle switch on the right (success when on).
  - Right-aligned: secondary **Cancel** (resets to the saved store, clears errors and message), success **Save** (loading) → *"Settings saved."* or error Banner. Editing any field clears the message.
- **User**: one card row (backgroundElement, radius 16, padding 16): bold "App version" left, textSecondary version right (from `package.json`).

### 10.10 Side menu
- Panel (backgroundElement), opens from the left over the page.
- Profile block (24px padding, bottom border): Avatar + display name (bold 16, one line) + secondary line (one line):
  - Store: name = store name (fallback session name/email); line `Store · {locCode ?? email}`.
  - User: name = profile name || session name || email; line = email.
  - Guest: "Guest" / "Not signed in".
- Items (8px padding, 4px gap; each radius 8, 16px padding, 16px text): signed in → **Dashboard**, **Events** (users only), **Profile**, **Settings**, then **Logout** in danger colour; guest → **Dashboard**, **Login**, **Sign up**. Active route: backgroundSelected bg, bold primary text. Clicking closes the menu and navigates.
- Logout → ConfirmModal *"Log out?"* / *"You'll need to log in again to book or manage appointments."* / **Logout** (destructive) → close menu, `signOut()`, replace to `/login`.

## 11. Phases

Each phase: build, run lint + typecheck + build, check in a browser (light/dark, phone/desktop), then commit.

- [ ] **Phase 0 — Survey** (§2). Done notes: router, styling, API mapping table, gaps.
- [ ] **Phase 1 — Foundation**: types (§3), helpers (§4), API adapter over the existing client (§5), session (§6), tokens (§7), UI kit (§8), app layout with AppHeader + SideMenu (§10.10), route guards (§9).
- [ ] **Phase 2 — Intro and auth**: §10.1–10.3.
- [ ] **Phase 3 — User dashboard and booking**: §10.4, §10.5.
- [ ] **Phase 4 — Store dashboard**: §10.6.
- [ ] **Phase 5 — Events**: §10.7.
- [ ] **Phase 6 — Profile and settings**: §10.8, §10.9.

## 12. End-to-end check

1. Fresh browser: `/` shows the intro → Get started → dashboard as guest; slot counts visible after picking a store; Book says "Login to book" and goes to login.
2. Sign up as a store with `Raju  Tailor!` → error; `My Shop` → hint shows `my_shop`; success lands on login with the banner and prefilled store name.
3. Log in as a user → pick store, month, day, a future slot → Book → booking form prefilled from profile → Confirm → dashboard banner; slot count went up; booking appears under Coming/In-Progress Events.
4. Past slots are dimmed and unclickable; Reset clears everything.
5. Log in as the store → calendar shows counts with the right pill colours and today glow; select days → Search → Open tab shows the booking → Accept → moves to Accepted; All shows chips.
6. Store settings: close before open is rejected; Save shows "Settings saved." and the dashboard's Max Count updates. Profile: bad PIN / map link rejected; Open in Maps link is correct.
7. Logout from the menu asks for confirmation and lands on login. An expired token (401) signs out.
