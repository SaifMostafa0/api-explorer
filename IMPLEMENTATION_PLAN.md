# Implementation plan

Source of truth: [`PROJECT_SPEC.md`](PROJECT_SPEC.md), including its **Amendments** section.
One milestone at a time. A milestone is done only when `npm run ci` passes and `STATUS.md` is updated
with what was actually run.

**Who writes what:** milestones 2, 3 and 5 are the core of the project and are written by Saif.
AI tools review diffs, suggest test cases and handle tooling. Anything an AI wrote is marked in the PR
description.

## MVP (target: early December 2026)

### M1 — Architecture, HTTP behaviour, security decisions ✅

- Scaffold: Vite + React + TypeScript (strict, `noUncheckedIndexedAccess`), React Router, Zod,
  Vitest + RTL, ESLint, Prettier, CI workflow, Vercel config with CSP.
- Docs: `docs/architecture.md`, `docs/http-model.md`, `docs/security.md`,
  `docs/testing-strategy.md`, ADRs 0001–0002.
- Check: `npm run ci` green.

### M2 — Request domain model and request construction (Saif)

Files: `src/domain/request.ts`, `src/domain/validation.ts`, `src/http/buildRequest.ts`.

1. Types from `docs/http-model.md`: `HttpMethod`, `QueryParameter`, `HeaderEntry`,
   `RequestBodyMode`, `RequestConfiguration`.
2. `validateUrl(input)`: absolute URL, http/https only, no embedded credentials, normalised with
   `new URL()`. Returns a result object, never throws.
3. `buildRequest(config)`: URL via `URLSearchParams` (repeated keys kept in order, disabled rows
   skipped), headers (name validation, forbidden-header detection with a message), body by mode
   (JSON validated with position of the error; no body for GET/DELETE — return an error, don't drop it).
4. Private-network detection helper for the confirmation warning (ADR 0002).
5. Unit tests for every bullet in spec §14 "Test request building". Coverage gates apply here.

### M3 — Transport, response parsing, error classification, timeout, cancellation (Saif)

Files: `src/infrastructure/http/fetchClient.ts`, `timeout.ts`, `src/http/parseResponse.ts`,
`src/http/classifyError.ts`, `src/domain/response.ts`, `src/domain/errors.ts`.

1. `Transport` interface (`(req: Request, signal: AbortSignal) => Promise<Response>`) injected into
   `executeRequest` so tests never hit the network.
2. `executeRequest` returns the `RequestResult` union. Timeout and user-cancel use separate
   abort reasons so they can be told apart. Timers cleared in `finally`.
3. Body read once; JSON parsed when content type says so, text preserved on failure; falsy JSON
   values preserved; 204 and empty bodies handled; preview truncated at 1 MB with a flag.
4. A request id on every run so a stale response can never overwrite a newer one.
5. Unit tests for every bullet in spec §14 "Test response parsing" and "Test error classification".

### M4 — Request workspace UI

Method selector, URL bar, Send/Cancel, Params / Headers / Body tabs with editable rows,
inline validation messages, double-click protection, confirmation dialog for private-network
targets and for unsafe methods on the live demo. Component tests through a mocked transport.

### M5 — Response inspector (Saif)

Status bar (code, text, duration, size, non-colour status label), Body / Headers / Details tabs,
formatted vs raw JSON, truncation notice, "headers not exposed by CORS" vs "no headers",
copy with success/failure feedback. Never renders HTML. Screen-reader announcement on completion.

### MVP deploy

Vercel project `api-explorer`, direct-route check, CSP check, sample requests to CORS-friendly public
test APIs only, README with live link and a 60-second video.

## After the MVP

- M6 — saved requests and local history with secret redaction.
- Environments with `{{variable}}` substitution, cURL import/export (spec amendment 4).
- M7 — collection import/export with versioned schema.
- M8 — accessibility pass, responsive polish, failure recovery.
- M9 — Playwright E2E against intercepted requests, Lighthouse measurements (documented runs).
- M10 — case study written by Saif.
