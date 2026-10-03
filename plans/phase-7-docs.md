# Phase 7: Docs

Update `CLAUDE.md` with the new architecture:

- how the mock or real API is chosen (`EXPO_PUBLIC_API_URL`);
- how the session and route guards work;
- which screens depend on the role;
- the platform-split files (`*.web.ts(x)`);
- the mock's seeded accounts;
- a pointer to `plans/`.

Mark every phase as done in `plans/README.md`.

## Done

- `CLAUDE.md` rewritten to cover:
  - the backend switch and the mock's seeded accounts;
  - sessions, query keys and invalidation;
  - route guards and screens chosen by role;
  - cross-platform rules and the domain/time-string conventions.
- Final regression: all five Playwright suites passed (45 steps: auth, user dashboard and booking, store dashboard, menu and events, settings and profile), with no console errors.
