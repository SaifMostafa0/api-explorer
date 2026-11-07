# Testing strategy

| Layer     | Tool                      | What                                                                          | When         |
| --------- | ------------------------- | ----------------------------------------------------------------------------- | ------------ |
| Unit      | Vitest                    | `domain/`, `http/`, `infrastructure/` — every case listed in spec §14         | M2–M3 onward |
| Component | Vitest + RTL + user-event | Workspace and inspector through a fake `Transport`                            | M4–M5        |
| E2E       | Playwright                | Flows in spec §14 with `page.route()` interception; no real third-party calls | M9           |

- Coverage gates (in `vite.config.ts`): 80 % statements, 75 % branches for `src/domain`,
  `src/http`, `src/infrastructure`. UI glue isn't gated.
- Fakes: a `fakeTransport` factory that returns a scripted `Response`, rejects with `TypeError`,
  or never resolves (for timeout and cancel tests with fake timers).
- No fixture contains a real token. Use `test-token-not-real`.
- `npm run ci` runs format check, lint, typecheck, unit tests with coverage and the build, the same
  as CI. Results go in `STATUS.md` only after they were actually run.
