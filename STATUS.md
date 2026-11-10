# Status

_Last updated: 10 Nov 2026_

**Current milestone:** MVP deployed. Left for the MVP: the 60-second video in the README (Saif).

## MVP deploy (run 10 Nov 2026)

- Repo: https://github.com/SaifMostafa0/api-explorer (public). Vercel project `api-explorer`
  builds `main` on push. Live: **https://api-explorer-swart.vercel.app**
- Production build of `4856ef0` was READY on Vercel (Vite preset). The project's Node setting is
  26.x, while local CI runs 22 and 24.
- Checked with curl: `/`, `/settings` and an unknown path all return the app shell (200); a
  missing `/assets/*.js` returns a real 404; the CSP, `X-Content-Type-Options`,
  `Referrer-Policy` and `Permissions-Policy` headers are all sent. No Vercel login wall on the
  production URL.
- Checked in the in-app browser (Chromium; pane hidden, so no screenshots): `/settings` loaded
  directly renders Settings; the "GET a product (JSON)" sample returned 200 in 621 ms with no
  CORS or CSP block.
- Found and fixed: Chromium rejected `http://[::1]:*` in `connect-src` (CSP host-sources can't be
  IPv6 literals) and logged an error on every page load. Removed it; the deploy-config test now
  fails if a `[` appears in the CSP. `npm run ci` passed on Windows (Node 24.21.0): 320 tests,
  same coverage.
- GitHub Actions still fails on the account billing lock, not on the code.
- Not checked yet: the console after this fix is deployed, a screen reader, Lighthouse, the copy
  button's success path in a normal browser.

## Deploy prep (run 8 Nov 2026, Windows)

- Sample requests (`Try a sample`): DummyJSON and httpbin only. Checked with an `Origin`
  header: both reachable from this network and both send `Access-Control-Allow-Origin`.
  jsonplaceholder was unreachable (timeout) and postman-echo sends no CORS header, so neither is
  used.
- CSP `connect-src` now allows `http://localhost`, `127.0.0.1` and `[::1]` on any port; before,
  `https:` alone blocked local APIs on the hosted demo. Guarded by `src/test/deployConfig.test.ts`.
- Fixed: request tab names read "Params3" to screen readers (the space was inside the count's
  span). Now "Params 3".
- `npm run ci` passed on Node 24.21.0 and Node 22.23.4: 320 tests, same coverage as M5.

## M5 results (run 8 Nov 2026, Windows)

- `npm run ci` passed end to end on **Node 24.21.0 and Node 22.23.4**: 299 tests (51 new: 29
  inspector component tests, 22 formatting unit tests). Gated coverage unchanged: 99.5%
  statements, 95.4% branches (the inspector is UI and isn't gated).
- New: `src/features/response-inspector/` (status bar, Body / Headers / Details tabs, copy button,
  formatting helpers). Replaces the M4 `ResultSummary`.
- Manually checked in the in-app browser (Chromium, `npm run dev`):
  - `GET https://httpbin.org/json`: 200, "Success", 433 ms, 429 B; formatted and raw JSON;
    Headers tab shows 2 headers (content-length, content-type) with the CORS-filtered notice;
    Details shows the HTTP/2 "no status text" note.
  - `GET https://httpbin.org/status/404` in light mode at 375 px: "404" badge with "Client
    error", empty body message, no horizontal scroll.
  - Copy: the in-app browser denies clipboard access even for real clicks, so the failure message
    was confirmed but the **success path was not**. Text selection on failure could not be
    checked because the browser pane was hidden (background page). Both still need a check in a
    normal browser.
- Not checked yet: a screen reader, Lighthouse, the production build in a browser.

## M4 results (run 8 Nov 2026, Windows)

- `npm run ci` passed end to end on **Node 24.21.0 and Node 22.23.4**: 248 tests (52 new: 25
  component tests through a fake transport, plus reducer, send-check and mixed-content unit
  tests). Gated coverage: 99.5% statements, 95.4% branches. UI files aren't coverage-gated.
- Manually checked in the in-app browser (Chromium, `npm run dev`), dark mode:
  - Real GET to `https://httpbin.org/get?existing=a%20b` with a `postId` table param: 200, both
    params echoed, `Cache-Control: no-cache` sent.
  - `jsonplaceholder.typicode.com` is unreachable from this network (curl times out too); the app
    showed the network-failure view with causes, no invented status.
  - `localhost:3000/health` shows "Add a scheme…", focus moves to the URL; with `http://` the
    private-network dialog opens with focus on "Don't send"; Escape closes it without sending.
  - 375 px wide: no horizontal scroll, URL and row values wrap onto their own lines.
- Not checked yet: light mode by eye, a screen reader, Lighthouse, the production build in a
  browser (where unsafe-method confirmation is on).
- The response area is a basic status line plus text preview; M5 replaces the preview with the
  inspector (Body / Headers / Details tabs).

## M3 results (run 8 Nov 2026, Windows)

- `npm run ci` passed end to end on **Node 24.21.0 and Node 22.23.4**: 196 tests (83 new),
  no unhandled errors. Gated coverage: 98.8% statements, 93.9% branches (gates: 80 / 75).
- New: `domain/response.ts`, `domain/errors.ts`, `http/parseResponse.ts`, `http/classifyError.ts`,
  `infrastructure/http/{timeout,fetchClient,requestSession}.ts`, test factories in
  `src/test/factories/`.
- Covered: every spec §14 "response parsing" and "error classification" bullet, timeout during
  body download, no timers left after any outcome, double-click guard, stale-run protection and
  dispose-on-unmount.
- Contract changes recorded in `docs/http-model.md` ("Changes in M3"): `headerExposure` instead
  of `headers: null`, `parse: 'truncated'`, streamed body read.
- Not tested against a real network or browser yet: transports are fakes. Real CORS and
  mixed-content behaviour is checked in M9 (Playwright) and on the deploy.

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
