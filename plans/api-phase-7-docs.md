# API phase 7: Docs and wrap-up

## Changes

- Update `CLAUDE.md` with:
  - the backend flag;
  - how to use the stub server;
  - where the Ghoomo mapping layer lives;
  - the list of API gaps.
- Tick every API phase in `plans/README.md`.
- Push `api_integration`. Merge it into `main` only when asked.

## Acceptance

- With the flag off, the five Playwright suites pass.
- With the flag on, the API flows pass against the stub.

## Done

- `CLAUDE.md` updated:
  - the backend flag and seeded logins for each backend;
  - how to use the stub;
  - where the Ghoomo mapping layer lives and how the API shapes the app;
  - the API gaps.
- **Final regression:**
  - **Flag off:** five suites, all 43 steps pass. The old store logins in the suites now use the location code.
  - **Flag on,** with a fresh stub before each suite: four suites, all 23 steps pass.
  - No console errors in either run.
  - `expo export` still builds the iOS and Android bundles.
- The branch is pushed. It hasn't been merged into `main`.
