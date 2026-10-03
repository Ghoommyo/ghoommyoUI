# API phase 3: Auth

## Goal

Make signup and login work in both modes, using the Ghoomo auth model.

## Changes

- `Credentials` becomes a role-tagged union:
  - user: email and password;
  - store login: location code and password;
  - store signup: location name, email and password.
- `signup` returns `{ loginCode? }`.
- `Session` gains `locCode` and `name`. It's built from the JWT claims:
  - user tokens give `userId` and `userName`;
  - store tokens give `userId` (the location id), `locCode` and `locName`.
- The login form shows **Location code** instead of Email when Type is Store.
- Store signup asks for **Location name** (type `SHOP`). On success the login screen shows the generated code.
- Mock: the Raju Tailor account logs in with `raju_tailor`, and mock store signup derives the code the same way the server does.

## Acceptance

- In both modes: users and stores can sign up and sign in, and wrong credentials show the server's message.

## Done

- **Login and signup forms:** Type moves to the top of both, because it decides which fields appear.
  - Switching Type on login clears the identifier and the previous error, so an email isn't carried into "Location code".
  - Store signup shows the code you'll log in with while you type the name.
  - After signup, the login screen opens with the right Type and the code already filled in.
- **Mock:** error messages now match the server's ("User not found", "Invalid credentials", "User name already exists", "Location already exists"). The Raju Tailor account logs in as `raju_tailor`.
- **Ghoomo login:** the `Session` comes from the JWT claims, and stores get `locCode` and `name`. A PLACE owner who signs in is turned away with a message, since only shops are supported for now.
- **Side menu:** shows `Store · <code>` for stores, and uses `session.name` when the profile isn't loaded yet.
- **Verified:** one Playwright script run in both modes (`e2e-auth-modes.mjs`) passed all 6 steps each time, with no console errors:
  - wrong password;
  - an unknown store code;
  - store login by code;
  - customer signup, then login;
  - duplicate signup;
  - store signup, the code shown and prefilled, then login.

  The stub's log confirmed the request sequence: CORS preflight, then the documented status codes.
