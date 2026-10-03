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

_Fill in when the phase lands._
