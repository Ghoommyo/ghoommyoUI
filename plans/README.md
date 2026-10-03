
## API integration (branch `api_integration`)

This work connects the UI to the Ghoomo backend described in [`Api.md`](../Api.md). An env flag picks the backend: `EXPO_PUBLIC_USE_REAL_API=true` uses the real API; leaving it unset or setting anything else keeps the built-in dummy data. `.env.example` lists every variable.

Decisions:

- **SHOP locations only.** PLACE locations, which are booked by whole day through `/event` and `/traveller/*`, are hidden for now.
- **Hardcoded values for missing fields.** The API has nowhere to store some fields, so in API mode they get hardcoded values from `API_DEFAULTS` until the API supports them: max people per booking, store-name edits, state, map coordinates, and the user's name and mobile.
- **Verification uses a stub server** (`scripts/ghoomo-stub.mjs`) built from Api.md, because the real backend can't be run here.

- [ ] [API phase 1: Branch, flag and plan docs](api-phase-1-flag.md)
- [ ] [API phase 2: Ghoomo client foundation and stub server](api-phase-2-client.md)
- [ ] [API phase 3: Auth](api-phase-3-auth.md)
- [ ] [API phase 4: Browsing and booking](api-phase-4-booking.md)
- [ ] [API phase 5: Store dashboard](api-phase-5-store.md)
- [ ] [API phase 6: Settings and profile](api-phase-6-settings-profile.md)
- [ ] [API phase 7: Docs and wrap-up](api-phase-7-docs.md)
