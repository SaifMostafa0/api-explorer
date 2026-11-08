# Status

_Last updated: 8 Nov 2026_

**Current milestone:** M2 done on branch `m2-request-model` (not merged yet). Next: M3 (transport,
response parsing, error classification, timeout, cancellation).

## M2 results (run 8 Nov 2026, Node 24.21, Windows)

- Format check, ESLint, `tsc -b` and production build passed.
- Vitest: 113 new unit tests passing across `src/domain/validation.ts`, `src/domain/redaction.ts`,
  `src/http/privateNetwork.ts` and `src/http/buildRequest.ts`. Coverage for the gated modules:
  98.8% statements, 93.1% branches (gates: 80 / 75).
- **`npm run ci` did not pass end to end on this machine.** The M1 test "navigates between sections
  from the main nav" fails on Node 24 on `main` as well: React Router builds a `Request` with
  jsdom's `AbortSignal`, which Node 24's undici rejects. The CI workflow pins Node 22, where M1
  passed. Not yet re-run on Node 22.

What M2 covers: request types (`src/domain/request.ts`), URL / header / JSON validators, secret
redaction rules, private-network detection (ADR 0002, plus `0.0.0.0/8`, IPv6 unique-local,
link-local and IPv4-mapped addresses) and `buildRequest`, which collects every error in one pass
and returns warnings for forbidden headers, combined duplicate headers and private-network targets.

## M1 results (run 7 Nov 2026, Node 22, Linux)

`npm run ci`: format check, ESLint, `tsc -b`, Vitest (3 smoke tests passing: workspace route,
404 page, nav) and production build all passed.

Not done yet: GitHub repo, CI run on GitHub, Vercel deploy, any request/response UI.
