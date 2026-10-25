# Picture uploads (items, store photo, user photo)

Branch `image_uploads` (from `open_days`). Status: done (2026-10-25). The server side is the Next.js repo's phase 23 (`plans/phase-23-image-uploads.md` there, same branch name).

## Goal
Stores upload pictures of their products/services and a store photo; users upload a profile photo, from iOS, Android and the web. **Stores can upload only after the app admin turns it on for them** (admin console → Stores → Picture uploads); it's off by default and the store can't change it.

## Decisions
- **Storage: Cloudinary's free plan** (the user wanted no payment details). The server proxies uploads (`POST /uploads`), so it checks the token, the admin switch and the file type, and the API secret stays on the server.
- **Upload, then save.** Picking a photo uploads it right away and puts the URL in the form; the form's Save stores it (item `imageUrl`, store profile `photoUrl` → `locProfileUrl`, user profile `photoUrl`). Remove clears it the same way.
- **Shrunk on the device:** ≤1280 px JPEG at 0.8 quality (`src/lib/pick-image.ts`), so uploads stay well under the server's 2 MB limit and the free storage lasts.
- **Uploads off:** the photo buttons are visible but disabled, with "Picture uploads aren't turned on for your store yet. Contact support to enable them." Pasting an image link for an item still works, as before. User photos aren't gated.
- **Where photos show:** Home store cards (16:9 cover, only when the store has a photo), the dashboard store header (next to the limits line), and the side menu avatar (store photo for stores, user photo for users), with initials as the fallback.
- **User profile is saved on the server now.** `PUT /traveller/profile` has existed since the server's migration 001, but the app kept name/mobile edits for the session only. Saving the photo goes through that PUT, so name and mobile are saved too, and the session-only copy is gone.

## Steps
1. `npx expo install expo-image-picker expo-image-manipulator`; picker plugin in `app.json` (photo and camera permission text, microphone off).
2. API layer: `uploadImage` in the `Api` interface, the Ghoomo client (multipart POST outside the JSON helper), `mock.ts` and the stub; `uploadsEnabled`, `StoreProfile.photoUrl`, `UserProfile.photoUrl` in types and mappers.
3. UI: `ImageField`, `Avatar` `uri`, `StorePhoto`; the item form, store profile, user profile; Home, dashboard, side menu.
4. Docs: `Api.md` §5.4b, `CLAUDE.md`.

## Verification
- `npx tsc --noEmit`, `npx expo lint`.
- Web build in Chrome with Playwright against the local Next.js server, flag on; and the dummy backend, flag off.
- Android emulator (development build) against the local server.

## Done notes (2026-10-25)
- **Web, flag on** (local Next.js server with migration 012, pictures on disk):
  - a new store: **Choose photo** in Add product and **Choose store photo** in Profile are disabled, with the hint
  - after the admin turns uploads on: an item photo uploads (the link field fills in), saves, shows in the Products list and is served; the store photo saves and appears on its Home card, in the dashboard header and in the store's side menu
  - a user's profile photo saves and shows in the side menu; Remove + Save clears it and the server deletes the file
  - no page errors. Right after an upload the preview briefly shows the placeholder while the new picture loads (expo-image's transition)
- **Web, flag off:** Raju Tailor's store photo shows on its Home card; Asha's photo shows in the side menu.
- **Stub:** uploads, `uploads_on`, store photo in the list, user profile photo and file cleanup checked with curl.
- **Android emulator** (development build, Pixel 9a API 35, local Next.js server at `10.0.2.2:3000`):
  - a 3200×2400 gallery photo uploads as a 1280×960 JPEG (47 KB), shows in the Add product preview and the Products list; the store photo saves and shows in the side menu avatar
  - **SDK 57's global `fetch` is `expo/fetch`,** which rejects React Native's `{ uri, name, type }` FormData parts ("Unsupported FormDataPart implementation"). So on iOS/Android `pickImage` returns an expo-file-system `File` (it implements `Blob` and has `bytes()`), and `PickedImage.file` is a `Blob` everywhere. `expo-file-system` is now a direct dependency
  - **Android uses the legacy picker (`legacy: true`, GET_CONTENT).** Emulator images without Google services have no system photo picker ("No Activity found … PICK_IMAGES"), and after that failed launch expo-image-picker loses the next pick, so retrying doesn't work. The file picker works everywhere, needs no permission and shows the same photos
  - camera not tried (the emulator's camera is virtual); iOS not verified here (no Xcode)
