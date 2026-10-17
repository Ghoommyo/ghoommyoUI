# Signup and login identity rules

## Goal

Set how accounts are identified when people sign up and log in. The dummy backend enforces every rule below now. The Ghoomo API doesn't support them yet; it will be updated by the backend team (see [API work needed](#api-work-needed)). Until then, API mode keeps working with the fallbacks listed under [Changes](#changes).

## Rules

| Rule | Behaviour |
| --- | --- |
| Store signup | Takes both a **store name** and an **email** |
| Store name characters | Letters, digits and single spaces only. Repeated spaces are collapsed first. Anything else gets "Use letters, numbers and spaces only." |
| Stored store key | The name lowercased, with spaces turned into `_`: `Raju Tailor` → `raju_tailor` (`toLocationCode`) |
| Store name is unique | Names are compared by their key, so `Raju Tailor` and `raju  tailor` clash. Error: "Store name already taken" |
| Store email is unique | It's a login identifier, so no two stores can share it. Error: "Email already registered" |
| User signup | Takes a **username**, which can be the same as another user's, plus an email |
| Username | 2–40 characters. Used as the display name (side menu, booking pre-fill) |
| User login | Email and password |
| Store login | One field, **Email or store name**. A value with `@` is matched as an email; anything else is matched by its key, so `Raju Tailor`, `raju tailor` and `raju_tailor` all work |

## Changes

- **`src/types/domain.ts`:**
  - Store credentials become `{ role: 'store', login, password }`.
  - User signup gains `username`.
- **`src/features/auth/auth-form.tsx`:** adds `normalizeStoreName`, `validateStoreName` and `validateUsername`.
- **Signup screen:**
  - Users enter a username, then email and passwords.
  - Stores enter a store name, with a live "Saved as `raju_tailor`" hint, then email and passwords.
- **Login screen:**
  - With Type set to Store, the field reads "Email or store name".
  - After store signup, the login screen opens with the store name already filled in.
- **`src/api/mock.ts`:** enforces every rule above.
- **`src/api/ghoomo/client.ts`** (API-mode fallback until the API is fixed):
  - **Store login by name:** sends `location_code` set to the key.
  - **Store login by email:** shows "Logging in with email isn't supported by the server yet. Use your store name."
  - **Store signup:** sends the normalized name, so the server derives the same key.
  - **Username:** not sent, because the API has no field for it. It's remembered by email for the current app session and used as the display name after login.

## API work needed

1. `POST /signup` should accept and store `username` (duplicates allowed) and return it in the user token.
2. `POST /location/signin` should accept either the email or the store name (normalized to the key) as the identifier.
3. `POST /location/signup` should:
   - reject names with special characters;
   - reject duplicate store emails;
   - compare names by their normalized key.

## Acceptance

- **Dummy backend:**
  - user signup with a username shows that name in the side menu and in the booking pre-fill;
  - store signup rejects special characters, duplicate names (whatever the case or spacing) and duplicate emails;
  - stores can log in with their email, their store name or their key.
- **Flag on:**
  - store login by name works;
  - store login by email shows the "not supported yet" message;
  - user signup and login work.

## Done

- **Shared rules:** the store-name rules live in `src/lib/store-name.ts` (`normalizeStoreName`, `validateStoreName`, `storeKey`). The signup form and the dummy backend both use them, so the client and the "server" always agree. `storeKey` replaces the old `toLocationCode` helper.
- **Store keys:** a key is still accepted as a store name, since `storeKey('raju_tailor')` returns `raju_tailor`. So the old code-based logins keep working.
- **Email uniqueness:** for users the email stays unique, because it's how they log in; only usernames may repeat. Stores' emails are unique among stores.
- **Store session:** a store session now carries the account's real email in the dummy backend. Ghoomo location tokens have no email, so in API mode it still holds the key.
- **Verified with Playwright:**
  - **Dummy backend** (8 new steps, no console errors):
    - store login by email, by `Raju Tailor`, by `  raju   TAILOR ` and by `raju_tailor`;
    - `Raju@Tailor!` is rejected on blur;
    - `raju   TAILOR` gets "Store name already taken";
    - a duplicate store email is rejected;
    - a new store signs up, finds its name already filled in on the login screen, and logs in by name and then by email;
    - username is required, and a duplicate username is accepted;
    - the booking form pre-fills the username.
  - **Regression:** with the flag off, all five suites (43 steps) pass. With the flag on, against a fresh stub:
    - store login by email shows the "not supported yet" message, and login by name works;
    - the four API suites (23 steps) pass, including username signup.
