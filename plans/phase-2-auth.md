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

_Fill in when the phase lands._
