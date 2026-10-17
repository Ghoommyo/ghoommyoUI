# API phase 6: Settings and profile

## Goal

Store settings and profiles are saved through the Ghoomo API.

## Changes

- **Settings:** `GET` then `PUT /location/{locCode}/settings` with `{maxLimit, limitUnit, isAutoApprove, openAt, closeAt}`.
- **Profile:** `GET` then `PUT /location/{locCode}/profile`. The app's fields map as follows:

  | App field | API field |
  | --- | --- |
  | bio | `locInfo` |
  | address | `locAddress` |
  | city | `locCity` |
  | country | `locCountry` |
  | pin | `locPinCode` |

  `loc_nav`, when it's set, becomes the map link.
- **Fields the API can't store** (hardcoded until it can):
  - store name edits are not sent;
  - state is `''`;
  - there are no coordinates, so the map shows the address card and link with no pin;
  - the user's name and mobile are kept in memory for the session.

## Acceptance

- Against the stub, saved settings show up on the user dashboard, and profile edits survive a reload of the data.

## Done

- **How saves work:** settings and profile updates each GET first, which creates the row if needed (PUT returns 404 without it), then PUT, then reload the owner's store.
- **Read-only fields in API mode:** fields the server can't store yet are shown read-only, with the note "Can't be changed yet — the server doesn't support it." That covers store name and max per booking (Settings) and state (Profile). Saving would otherwise have dropped those edits without any warning.
- **New "Map link" profile field:** Ghoomo `locNavigation` / `loc_nav`, which the dummy backend also stores. It must start with `http(s)://`. `MapFallback` uses it for "Open in Maps".
- **`TextField` additions:** a `hint` prop, and a dimmed style when `editable={false}`.
- **Known API behaviour:** profile PUT ignores empty strings, so a field can't be cleared once it's set.
- **Verified against a fresh stub** (Playwright, all 5 steps, no console errors):
  - the read-only fields and their notes show up;
  - settings save, sending `{maxLimit:2, limitUnit:"HALF_HOUR", isAutoApprove:1, …}`;
  - an invalid map link is rejected, then the profile saves with `locNavigation`, and the address card links to it;
  - the user dashboard then shows "2 per half hour" with 26 slots;
  - a corrupted stored token gets a 401, signs the user out and clears the stored session.
