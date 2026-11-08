# Status

_Last updated: 8 Nov 2026_

**Current milestone:** M2 done and merged into `main`. Next: M3 (transport,
response parsing, error classification, timeout, cancellation).

## M2 results (run 8 Nov 2026, Windows)

- **Node 22.23.4 (the version CI pins): `npm run ci` passed end to end.** Format check, ESLint,
  `tsc -b`, Vitest (116 tests: 113 new M2 unit tests plus the 3 M1 smoke tests) and production
  build. Coverage for the gated modules: 98.8% statements, 93.1% branches (gates: 80 / 75).
- **Node 24.21 (local default): one M1 test fails**, "navigates between sections from the main
  nav", on `main` too. React Router builds a `Request` with jsdom's `AbortSignal`, which Node 24's
  undici rejects. Run the gates on Node 22 until that is fixed.

What M2 covers: request types (`src/domain/request.ts`), URL / header / JSON validators, secret
redaction rules, private-network detection (ADR 0002, plus `0.0.0.0/8`, IPv6 unique-local,
link-local and IPv4-mapped addresses) and `buildRequest`, which collects every error in one pass
and returns warnings for forbidden headers, combined duplicate headers and private-network targets.

## M1 results (run 7 Nov 2026, Node 22, Linux)

`npm run ci`: format check, ESLint, `tsc -b`, Vitest (3 smoke tests passing: workspace route,
404 page, nav) and production build all passed.

Not done yet: GitHub repo, CI run on GitHub, Vercel deploy, any request/response UI.
