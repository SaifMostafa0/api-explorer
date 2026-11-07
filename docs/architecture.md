# Architecture

API Explorer is a static single-page app. There is **no backend and no proxy**: every request is
sent by the user's own browser with `fetch`, so browser rules (CORS, forbidden headers, mixed
content) apply and are explained in the UI rather than worked around (see ADR 0001).

## Layers

```text
UI (features/*, components/*)          React components; no fetch calls
  │ calls hooks
Hooks (features/*/hooks)               request lifecycle state, stale-result guard
  │ calls
Domain + HTTP logic (domain/, http/)   pure functions: validate, build, parse, classify
  │ uses
Infrastructure (infrastructure/*)      fetchClient (injected Transport), timeout, storage adapter
```

Rules:

- UI components never call `fetch`; they go through a hook that calls `executeRequest`.
- `domain/` and `http/` do not import React and are tested without a DOM.
- The transport is injected, so tests use deterministic fakes and never reach the network.
- Untrusted data (responses, stored JSON, imports) is typed `unknown` and validated with Zod
  before use.
- Secrets never reach logs, error messages or history.

## Request lifecycle

```text
idle ──send──▶ validating ──invalid──▶ invalid (field errors shown, nothing sent)
                    │ valid
                    ▼
                 running ──cancel──▶ cancelled
                    │  └──timer────▶ timeout
                    ├──no response─▶ network/CORS failure
                    ▼
               response ──parse ok──▶ success | http-error (status ≥ 400)
                          └─parse fail─▶ parse-failure (raw text kept)
```

Each send gets an incrementing run id. A result is applied only if its run id is still the
latest, so a slow earlier response can never replace a newer one.

## File structure

```text
src/
  app/                App.tsx, router.tsx, NotFoundPage.tsx
  components/         layout/, ui/, feedback/
  features/
    request-workspace/  components/, hooks/, pages/
    response-inspector/ components/, hooks/
    history/            components/, services/, pages/
    settings/           components/, services/, pages/
  domain/             request.ts, response.ts, errors.ts, validation.ts
  http/               buildRequest.ts, classifyError.ts, parseResponse.ts
  infrastructure/
    http/             fetchClient.ts, timeout.ts
    storage/          storageAdapter.ts, localRepository.ts, migrations.ts
  styles/             global.css (tokens, focus, reduced motion)
  test/               setup.ts, fixtures/, factories/
docs/                 architecture, http-model, security, testing-strategy, decisions/
e2e/                  Playwright specs (M9)
```

Folders appear as their milestone lands; empty placeholders are not committed.
