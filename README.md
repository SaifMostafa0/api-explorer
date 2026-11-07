# API Explorer

A browser-based tool for composing HTTP requests and inspecting the responses, built to show
request construction, async lifecycles, cancellation, error classification and safe handling of
untrusted data.

> **Status:** early. Milestone 1 (architecture and decisions) is done; the request builder is
> next. See [STATUS.md](STATUS.md).

## Why no proxy?

Requests go straight from your browser, so the target API has to allow cross-origin requests
(CORS). A proxy would get around that but would also make the app an open relay. See
[ADR 0001](docs/decisions/0001-no-proxy.md).

## Run it

```bash
npm ci
npm run dev        # http://localhost:5173
npm run ci         # format, lint, typecheck, tests with coverage, build
```

Requires Node 20.19+.

## Docs

- [Spec](PROJECT_SPEC.md) · [Plan](IMPLEMENTATION_PLAN.md) · [Status](STATUS.md)
- [Architecture](docs/architecture.md) · [HTTP model](docs/http-model.md) ·
  [Security](docs/security.md) · [Testing](docs/testing-strategy.md)

## Stack

React 19 · TypeScript (strict) · Vite · React Router · Zod · Vitest · Testing Library · Playwright (later)
