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

_Fill in when the phase lands._
