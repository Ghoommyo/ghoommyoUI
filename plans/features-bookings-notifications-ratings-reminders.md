# Bookings, notifications, ratings and reminders (prompts 4–6)

Branch `booking_features` (from `api_integration`). Status: done (2026-10-15). iOS is not yet verified (see below).

The Ghoomo backend already supports everything here except reminder settings: notifications, booking edits, ratings, paged reviews, required descriptions and auto-approve status. See `Api.md` in the backend repo (`docs/API.md`), sections 5.6–5.6a. The web app (Next.js, branch `improved_screens`) already ships the same features, so its behaviour is the reference.

## Decisions (agreed with the owner, 2026-10-15)
- **Notifications:** fetched when the bell is tapped and on **Refresh** in the panel; no polling.
  - Users see accepted/rejected.
  - Stores see new requests ("— auto-approved" when automatic), customer edits and ratings, and can accept or reject pending requests from the panel.
- **Booking edit (user):** pending/accepted bookings dated today or later. Number of people (not at dark stores), mobile, and a message appended below a `=====` line. The store is notified.
- **Booking details:** tapping a booking row opens a details modal for both roles. Stores can accept/reject there; users can edit and rate.
- **Store dashboard:** shows **today's** bookings in Open/Accepted/Rejected/All by default. Search switches to the chosen days, and Clear returns to today.
- **Ratings:**
  - any **accepted** booking can be rated (1–5 stars, optional text, Cancel/Submit), and re-rating edits it
  - the store dropdown (the custom `Select`) shows `★ 4.3 (12)` per store, and tapping it opens the reviews screen
  - reviews load 10 at a time and more as you scroll (`FlatList` `onEndReached`)
  - stores get **Reviews** in the side menu
- **Refresh** buttons on the user's and the store's events lists.
- **Reminders (iOS and Android only; nothing on web):**
  - **Setting:** Off, 1 hour before, or a custom number of hours, set by users and stores in Settings and applied to all **accepted** bookings.
  - **Storage:** saved **on the device** (it drives the alarms) **and on the server** (append-only audit history, `GET/PUT /apis/reminder-settings`). On a new device the server copy seeds the local one.
  - **Delivery:** `expo-notifications` local notifications at a `DATE` trigger (exact alarms on Android, `SCHEDULE_EXACT_ALARM`; UNUserNotificationCenter on iOS), with a custom alarm sound on a high-importance Android "Reminders" channel and **Snooze (5 min)** / **Close** action buttons.
  - **Limit:** this is an alarm-style notification, not a full-screen ringing alarm. Looping full-screen alarms would need custom native code.
- **iOS:** written for, but verified only on Android and web here (Xcode isn't installed). Test iOS with Xcode or an EAS development build.
- **Compatibility fixes with the current backend:**
  - the booking description is now **required** (the server rejects empty ones)
  - a new booking takes its **status from the server** (auto-approve returns ACCEPTED)

## Phases
1. **API layer:** domain types, `Api` interface, Ghoomo client, mock and stub for:
   - notifications (list, mark read)
   - `updateBooking` and `rateBooking`
   - `getReviews` (paged) and store rating summaries
   - the bookings each role needs reminders for
   - reminder settings
   - plus the two compatibility fixes
2. **Booking details:** details modal, clickable event cards, edit modal, today's bookings for stores, Refresh buttons.
3. **Notifications:** bell in `AppHeader` and a notifications panel.
4. **Ratings:** rate modal, reviews screen with lazy loading, ratings in the store `Select`, Reviews in the store's menu.
5. **Reminders:**
   - backend endpoint first (Next.js repo, migration 006)
   - then `expo-notifications` with config plugin, sound and permissions
   - Settings section, scheduler and Snooze/Close handling
   - a development build on the Android emulator
6. **Docs:** `CLAUDE.md` (new endpoints, reminders, dev-build requirement) and done notes.

Every phase: `npx expo lint` and `npx tsc --noEmit` pass, then a commit. Flows are checked on the web build with Playwright against the real backend (`EXPO_PUBLIC_USE_REAL_API=true`); reminders are checked on the `Pixel_9a` emulator.

## Done notes (2026-10-15)
- **Backend:**
  - reminder settings were added to the Next.js repo (`improved_screens`): migration `006_reminder_settings.sql` and `GET/PUT /apis/reminder-settings` (append-only audit trail)
  - everything else was already there
  - the stub (`scripts/ghoomo-stub.mjs`) and the mock implement all the new endpoints
- **Web checks** (Playwright against the real backend, `EXPO_PUBLIC_USE_REAL_API=true`):
  - details and edit (with `=====`), today's store bookings, Refresh
  - notifications: no fetch until the bell, one per open and per Refresh; the store accepts from the panel, and the user sees "accepted"
  - rating, and the store picker's ratings opening reviews (10, then 28 after scrolling with 2 more requests, then the end message)
  - the store's Reviews menu item; reminders hidden on web
- **Bugs found and fixed while testing:**
  - a whole-card pressable made `<button>` inside `<button>` on web; the action buttons are now siblings
  - the Expo dev server started with `CI=1` doesn't watch files (restart it, or start it without `CI=1`)
- **Android** (development build on the `Pixel_9a` emulator, Android 15):
  - **Setting:** saved on the device and on the server (`platform: android`); the POST_NOTIFICATIONS prompt appears on save
  - **Scheduling:** an exact `RTC_WAKEUP` alarm (`exactAllowReason=permission`), fired on time
  - **Delivery:** importance 5 on the `booking-reminders` channel with sound `raw/reminder`; text "Your visit to Claude Web Shop is at … (in 1 hour)."
  - **Buttons:** **Snooze** (5-minute exact re-alarm, current one dismissed) and **Close** work with the app running **and with its process killed**
  - **Restart:** reminders are rescheduled on app start after a force-stop
- **Killed-app actions needed three fixes:**
  1. an `expo-task-manager` notification task (`registerTaskAsync`)
  2. defining it in a custom entry `index.ts` (`package.json` `main`), because headless runs never load the root layout
  3. reading the task payload's `content.dataString` (a JSON string), since `content.data` is absent there
- **Testing notes:**
  - the emulator clock ran ~30 s behind the Mac's
  - exact alarms on Android 14+ need "Alarms & reminders" allowed: granted with `appops` in testing; users can toggle it, and without it Android fires inexactly
- **Limits:**
  - an alarm-style notification, not a full-screen looping alarm
  - iOS is written, but untested here (no Xcode): test killed-app Snooze/Close on iOS especially, since the background task is Android-only. On iOS a cold-start tap is handled by `getLastNotificationResponseAsync`
  - at most 50 reminders are scheduled at a time
