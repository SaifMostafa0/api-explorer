# API Explorer

A browser-based tool for composing HTTP requests and inspecting the responses. It is built to show
careful request construction, an async lifecycle with cancellation and timeouts, honest error
classification, and safe handling of untrusted responses.

**Live demo:** https://api-explorer-swart.vercel.app · **Status:** MVP (milestones 1–5) complete, see [STATUS.md](STATUS.md)

## What it does

- **Build requests:** GET, POST, PUT, PATCH, DELETE; query params and headers as editable rows
  (enable, disable, repeat); JSON, text and URL-encoded bodies.
- **Validate before sending:** absolute http/https URLs only, no credentials in the URL, RFC 9110
  header names, JSON with line and column of the error, no bodies on GET/DELETE. Every problem
  is shown at once, inline, and focus moves to the first one.
- **Be honest about the browser:** headers the browser controls (`Host`, `Cookie`, `Origin`…) are
  flagged instead of silently dropped; mixed content is warned about before sending; CORS-hidden
  response headers are reported as hidden, not as missing.
- **Run requests safely:** Cancel at any time, 30 s timeout, a slow older response can never
  replace a newer one, double-clicks send once, nothing is retried automatically. Requests to
  localhost or private networks ask for confirmation, and so do POST/PUT/PATCH/DELETE on the demo.
- **Inspect responses:** status in words as well as colour, duration, decoded size; formatted or
  raw JSON; headers; details; copy with feedback. Bodies over 1 MB are previewed, not loaded
  whole. Responses are always shown as text: returned HTML or scripts never run.
- **Accessible:** keyboard-operable tabs and forms, labelled inputs, errors linked to their
  fields, one short screen-reader announcement per result, dark and light themes.

Pick **Try a sample** in the app for ready-made requests against
[DummyJSON](https://dummyjson.com) and [httpbin](https://httpbin.org), both of which allow
cross-origin requests.

## Why no proxy?

Requests go straight from your browser, so the target API has to allow cross-origin requests
(CORS). A proxy would get around that but would also turn the app into an open relay that can
reach networks your browser can't. See [ADR 0001](docs/decisions/0001-no-proxy.md). When a request
fails without a response, the app lists the possible causes (CORS, offline, DNS, mixed content,
TLS) instead of guessing, because the browser doesn't reveal which one it was.

## How it's built

```text
UI (React)            WorkspacePage, ResponseInspector — no fetch calls
  │
Hook                  useRequestRunner → RequestSession (run ids, double-click guard, dispose)
  │
Pure logic            buildRequest · parseResponse · classifyResponse/Failure · validators
  │
Infrastructure        executeRequest (injected Transport, timeout, streamed body read)
```

The request and result types are written down first in [docs/http-model.md](docs/http-model.md);
the code follows them, and every change to them is recorded there.

## Testing

`npm run ci` runs the same gates as CI: Prettier, ESLint, `tsc -b`, Vitest with coverage, and the
production build. On 8 Nov 2026 it passed on Node 22 and Node 24 with 320 tests and 99.5%
statement / 95.4% branch coverage on `src/domain`, `src/http` and `src/infrastructure` (gates:
80% / 75%). Component tests drive the real UI through a fake transport, so no test touches the
network. Details per milestone are in [STATUS.md](STATUS.md).

## Run it

```bash
npm ci
npm run dev        # http://localhost:5173
npm run ci         # format, lint, typecheck, tests with coverage, build
```

Requires Node 20.19 or newer.

## Known limits

- Only APIs that allow cross-origin requests work from the hosted demo (see above).
- Cookies are never sent (`credentials: 'omit'`).
- Saved requests, history, environments and cURL import/export come after the MVP.
- Not yet measured: Lighthouse scores, screen-reader testing, end-to-end tests (milestones 8–9).

## Docs

- [Spec](PROJECT_SPEC.md) · [Plan](IMPLEMENTATION_PLAN.md) · [Status](STATUS.md)
- [Architecture](docs/architecture.md) · [HTTP model](docs/http-model.md) ·
  [Security](docs/security.md) · [Testing](docs/testing-strategy.md)

## Stack

React 19 · TypeScript (strict) · Vite · React Router · Vitest · Testing Library
