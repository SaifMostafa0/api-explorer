# Status

_Last updated: 8 Nov 2026_

**Current milestone:** M2 done and merged into `main`. Next: M3 (transport,
response parsing, error classification, timeout, cancellation).

## M2 results (run 8 Nov 2026, Windows)

- **Node 22.23.4 (the version CI pins): `npm run ci` passed end to end.** Format check, ESLint,
  `tsc -b`, Vitest (116 tests: 113 new M2 unit tests plus the 3 M1 smoke tests) and production
  build. Coverage for the gated modules: 98.8% statements, 93.1% branches (gates: 80 / 75).
- Node 24.21 initially failed the M1 nav test (jsdom's `AbortSignal` rejected by Node 24's
  `Request`). Fixed the same day, see below.

## Test-environment fix (run 8 Nov 2026, Windows)

- `src/test/jsdom-environment.ts`: jsdom environment that keeps Node's native
  `AbortController`/`AbortSignal`; `src/test/environment.test.ts` guards it.
- `.gitattributes` forces LF so Prettier passes on Windows checkouts.
- `npm run ci` passed end to end on **Node 24.21.0 and Node 22.23.4**: 118 tests, same coverage.

What M2 covers: request types (`src/domain/request.ts`), URL / header / JSON validators, secret
redaction rules, private-network detection (ADR 0002, plus `0.0.0.0/8`, IPv6 unique-local,
link-local and IPv4-mapped addresses) and `buildRequest`, which collects every error in one pass
and returns warnings for forbidden headers, combined duplicate headers and private-network targets.

## M1 results (run 7 Nov 2026, Node 22, Linux)

`npm run ci`: format check, ESLint, `tsc -b`, Vitest (3 smoke tests passing: workspace route,
404 page, nav) and production build all passed.

Not done yet: GitHub repo, CI run on GitHub, Vercel deploy, any request/response UI.
