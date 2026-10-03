# Phase 2: Auth

## Goal

Signup and login for both account types (user and store). The JWT is stored and attached to every API call.

## Screens

**Signup** (`(auth)/signup.tsx`)

- Fields: email, password, confirm password, and a Type select (User / Store).
- A link: "Already a member? Click to login".
- Client-side validation: email format, password length, and passwords must match.
- On success, show a banner and `router.replace('/login')`. On failure, show the API message in a banner.

**Login** (`(auth)/login.tsx`)

- Fields: email, password and Type.
- A link: "Not a member? Click to signup".
- On success, `signIn(session)` stores the token and the app goes to `/dashboard`. On failure, show the message.

## Notes

- The `(auth)` group is guarded by `!session`. A signed-in user who opens `/login` is sent to the dashboard.
- Mock accounts are seeded so the flows can be tried right away (see `src/api/mock.ts`).

## Acceptance

- Signup, then login, then the dashboard works for both roles.
- Bad credentials show an error.
- The token survives an app reload on native and a page refresh on web.

## Done

- Shared layout and validation live in `src/features/auth/auth-form.tsx`. Passwords must be at least 8 characters.
- After signup, the app goes to `/login?registered=1`, which shows the "Account created" banner.
- Logging in with the wrong account type gives a clear error: "This account is registered as a user."
- Fixed a `Select` bug: `flexBasis: 0` collapsed its height in column layouts. Row layouts now pass `style` instead.
- `Select` infers its value type from `options` only (via `NoInfer`), so `useState<Role>` setters type-check.
- Verified in Chrome via Playwright at a 390×844 viewport: validation, wrong password, wrong role, user login, session kept across reloads, signing up a store, then logging in as it. No console errors.
