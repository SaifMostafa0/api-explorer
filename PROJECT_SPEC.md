# API Explorer — End-to-End Engineering Specification

## 1. Project Mission

Build API Explorer, a browser-based tool for composing HTTP requests, sending them to permitted API endpoints, and inspecting responses.

The application should feel like a small, reliable developer tool rather than a mock API form.

It must demonstrate:

- HTTP methods, headers, URL parameters, and request bodies.
- Asynchronous request lifecycles.
- Response parsing and formatting.
- Request cancellation and timeouts.
- Error classification and recovery.
- Typed application architecture.
- Safe handling of user-supplied data.
- Automated testing of success and failure cases.
- Performance, accessibility, and deployment practices.

The project is for educational and portfolio purposes. It must not claim to replace professional API testing tools.

## 2. AI Coding-Agent Instructions

Act as a senior software engineer responsible for architecture, implementation, testing, security, and documentation.

Before coding:

- Inspect the repository and runtime.
- Create PROJECT_SPEC.md, IMPLEMENTATION_PLAN.md, docs/architecture.md, docs/http-model.md, docs/security.md, and docs/testing-strategy.md.
- Define the supported request and response types.
- Identify browser limitations and document them before implementation.
- Build incrementally with verifiable milestones.

Rules:

- Do not claim requests succeed without observing actual results.
- Never fake response timing, HTTP status, or server behavior.
- Never silently retry unsafe requests.
- Never silently remove headers or body content from a user's request without telling them.
- Never log authorization headers, cookies, or sensitive request bodies.
- Never persist secrets by default.
- Never implement a server-side arbitrary URL proxy.
- Never treat a CORS failure as proof that a server is down.
- Never render response content as executable HTML.
- Never implement features that send requests to internal network services.
- Explain any browser or hosting limitation in the UI and documentation.
- Run tests and type checks at every milestone.
- Report measured results honestly.

## 3. Product Requirements

Primary user journey

- Open the application.
- Select an HTTP method.
- Enter a URL.
- Add query parameters.
- Configure headers.
- Configure an optional request body.
- Send the request.
- Inspect status, headers, duration, and response body.
- Copy useful response information.
- Save a request configuration.
- Reload the page and retrieve the saved configuration.
- Recover from malformed input, CORS failures, timeouts, and server errors.

Main layout

Use a three-region desktop layout:

- Request workspace.
- Response inspector.
- Optional saved-request/history sidebar.

On smaller screens, use a responsive stacked layout or tabs. Avoid requiring horizontal scrolling to access essential controls.

Main routes

- / — request workspace.
- /collections — saved request collections.
- /history — local request history.
- /settings — preferences and local data management.
- Unknown paths — useful 404 page.

## 4. Technology Stack

Use:

- React with TypeScript.
- Vite.
- React Router.
- Native Fetch API and AbortController.
- Zod for validation of persisted data and imported configurations.
- Vitest.
- React Testing Library and user-event.
- Playwright.
- ESLint and Prettier.
- Lucide React or a consistent icon library.
- CSS Modules or a consistent CSS architecture.

Prefer native browser APIs for HTTP behavior. Avoid adding an HTTP library unless it provides a demonstrated benefit.

Use stable, compatible dependency versions and commit the lockfile.

## 5. HTTP Request Domain Model

Define explicit types.

HttpMethod

Support:

- GET
- POST
- PUT
- PATCH
- DELETE

Additional methods may be introduced only after their browser behavior and body semantics are documented.

RequestConfiguration

Include:

- id
- name
- method
- url
- query parameters
- headers
- body mode
- body content
- createdAt
- updatedAt

QueryParameter

Include:

- id
- key
- value
- enabled

HeaderEntry

Include:

- id
- name
- value
- enabled

Represent header and query parameter rows as editable data structures, not a single manually parsed string.

RequestBodyMode

Support:

- none
- JSON
- plain text
- URL-encoded form data

Multipart form data is a later enhancement. If implemented, let the browser generate the multipart Content-Type boundary. Do not manually set a conflicting boundary.

ResponseSnapshot

Include:

- status
- statusText
- response headers
- final URL where available
- start time
- duration
- response size when reliably measurable
- parsed body or text preview
- content type
- parse state

Do not pretend the browser exposes response headers that are blocked by CORS. Display only the information actually available.

RequestResult

Use a discriminated union for meaningful outcomes:

- success
- HTTP error response
- network or CORS failure
- timeout
- cancelled
- invalid request
- response parsing failure

An HTTP 404 or 500 is still an HTTP response, not the same thing as a failed network request.

## 6. Request Construction and Validation

URL validation

- Require a valid absolute URL.
- Permit HTTP and HTTPS only.
- Reject javascript:, data:, file:, and other unsupported schemes.
- Reject embedded username/password credentials.
- Normalize URLs using the native URL API.
- Display validation errors before sending.
- Do not silently reinterpret malformed input.
- Do not send a request when the URL is invalid.

Query parameters

- Support adding, editing, deleting, and enabling/disabling entries.
- Preserve repeated parameter names.
- Correctly encode spaces and special characters.
- Do not manually concatenate unescaped query strings.
- Preserve URL parameters unless the user explicitly changes them.
- Explain how duplicate keys are represented.

Headers

- Support adding, editing, deleting, and enabling/disabling custom headers.
- Validate header names and values.
- Explain browser-controlled or forbidden headers.
- Detect common mistakes such as malformed names.
- Do not claim a forbidden header was sent.
- Show an appropriate message when the browser controls a header.
- Never silently overwrite duplicate header entries without documented semantics.

Request bodies

- Support none, JSON, plain text, and URL-encoded forms.
- Validate JSON before sending.
- Display a useful parse error with the line or position when available.
- Set Content-Type appropriately when the application manages the body format.
- Do not attach bodies to GET or DELETE requests in the MVP.
- Do not silently change the selected method or discard the body.
- Allow the user to correct an invalid body without losing other request fields.

CORS behavior

- Explain that cross-origin browser requests require appropriate server CORS permissions.
- Explain that some requests trigger browser preflight checks.
- Do not implement a proxy to evade CORS.
- Do not tell the user to disable browser security.
- When a request fails without an accessible HTTP response, show a generic network/CORS diagnosis and relevant troubleshooting steps.
- Do not infer the exact cause of an opaque browser network failure.

## 7. Request Execution Lifecycle

Use Fetch and AbortController.

For each execution:

- Validate the request.
- Build the URL and supported headers.
- Validate and serialize the body if required.
- Record the start time.
- Create an AbortController.
- Start the timeout mechanism.
- Send the request.
- Record response status and available headers.
- Read the response body once.
- Parse JSON when appropriate; preserve text when parsing fails.
- Record duration.
- Update the response view.
- Clear timers and release resources in all outcomes.

Timeout and cancellation

- Use a configurable timeout with a documented default.
- Provide a cancel action while a request is running.
- Distinguish timeout from user cancellation.
- Clear timeout resources in a finally block.
- Prevent a previous response from overwriting a newer request's result.
- Prevent duplicate execution caused by accidental double-clicks.
- Handle component unmounting and stale results safely.

Request safety

- Do not automatically retry POST, PUT, PATCH, or DELETE.
- A repeat action must be explicitly triggered by the user.
- Warn when sending a request to an endpoint with potentially destructive semantics.
- Use only documented, permitted test endpoints for the live demo.
- Do not issue requests to private networks, cloud metadata endpoints, localhost, or internal company endpoints.
- Do not claim that browser-side validation alone can secure a server-side proxy. No such proxy should exist in this project.

## 8. Response Inspector

Display:

- HTTP status code and status text.
- Duration.
- Content type.
- Available response headers.
- Response body.
- Body size when measurable.
- Parse state and useful error messages.

Response body behavior

- Pretty-print valid JSON.
- Allow switching between formatted and raw text.
- Preserve valid falsy JSON values such as false, 0, and null.
- Handle empty responses, including 204 No Content.
- Handle non-JSON text and malformed JSON.
- Truncate very large responses in the UI and clearly indicate truncation.
- Do not claim the displayed preview is the complete response if content was truncated.
- Never execute HTML, scripts, SVG, or other response content.
- Render response bodies as text or structured JSON.
- Do not embed arbitrary response HTML in an iframe.
- Offer copy-to-clipboard with success/failure feedback.
- Provide useful behavior when clipboard access is denied.

Response tabs

Implement:

- Body
- Headers
- Details

The Body tab must support JSON formatting when applicable. The Headers tab must distinguish unavailable information from an empty response header set. The Details tab should summarize timing, status, URL, and parsing information.

## 9. Saved Requests and History

Collections

Allow users to:

- Save a request configuration.
- Name and rename it.
- Update it.
- Duplicate it.
- Delete it.
- Organize requests into named collections if time permits.

History

Record:

- Request method.
- Sanitized URL.
- Timestamp.
- Result category.
- HTTP status when available.
- Duration when measurable.

History must not retain authorization headers, cookies, or request bodies by default.

Persistence

- Keep preferences, saved request configurations, and history separate.
- Use a storage abstraction.
- Validate stored and imported JSON.
- Handle malformed or outdated storage.
- Support clearing history.
- Clearly identify that saved configurations and history are local to the current browser.
- Do not synchronize data between devices.

Secret handling

- Do not persist credentials or secret headers.
- Treat header names such as Authorization, Proxy-Authorization, Cookie, and Set-Cookie as sensitive.
- Redact sensitive query parameters such as token, access_token, api_key, and password from history.
- Do not store request body contents in history.
- Show a warning before including sensitive values in a saved configuration.
- Provide a safe, redacted preview before exporting collections.
- Never transmit telemetry containing request contents.

## 10. Import and Export

Support JSON export/import for request collections.

Requirements:

- Define and version the export schema.
- Validate every imported record.
- Reject unsupported schema versions.
- Limit file size and record count.
- Reject malformed or unexpected object structures.
- Generate new IDs when resolving imported ID collisions.
- Make merge versus replace behavior explicit.
- Show a summary before applying imported changes.
- Redact known secret headers and query parameters by default.
- Never execute imported content.
- Do not silently ignore invalid records.

Provide unit tests for malformed JSON, invalid records, oversized files, collisions, and secret redaction.

## 11. Architecture and File Structure

The target tree is laid out in [`docs/architecture.md`](docs/architecture.md#file-structure).

Architectural rules

- UI components must not execute fetch directly.
- Keep request building, response parsing, error classification, and persistence independently testable.
- Inject fetch or a transport interface into the HTTP client so tests can use deterministic mocks.
- Keep domain logic independent of React.
- Avoid circular imports.
- Avoid giant components and broad global state.
- Use unknown rather than any for untrusted data.
- Validate all imported and persisted data at runtime.
- Keep secrets out of logs and error messages.
- Document non-obvious browser limitations.

## 12. User Interface Requirements

Build a modern developer-tool interface with:

- A clear method selector.
- A URL input and prominent Send button.
- Request tabs for Params, Headers, and Body.
- Editable key/value rows.
- A response status bar.
- Body, Headers, and Details tabs.
- Copy actions with feedback.
- Saved requests and history.
- Responsive layout.
- Light/dark theme if fully supported.
- Useful loading, empty, error, and success states.

The interface must make the request lifecycle obvious. Users should always know whether a request is idle, running, cancelled, failed, or completed.

Avoid:

- Fake response data presented as a live result.
- Decorative charts without meaningful data.
- Unresponsive controls.
- Unexplained technical error messages.
- Secret values in history.
- Excessive animations.
- Rendering remote HTML.
- Hiding CORS limitations.

## 13. Accessibility Requirements

Target WCAG 2.2 AA.

Implement:

- Semantic page landmarks.
- Keyboard-accessible tabs and forms.
- Labels for every input.
- Visible focus indicators.
- Accessible method and status labels.
- Accessible validation messages.
- Screen-reader announcements for request completion and failure.
- Non-color status indicators.
- Logical focus management.
- Reduced-motion support.
- Appropriate dialog behavior.
- Sufficient contrast.
- Accessible handling of copy feedback.

The response viewer must remain usable with keyboard navigation and screen readers. Do not put the entire response into a single enormous live region.

## 14. Testing Strategy

Unit tests

Test request building:

- URL normalization.
- Query parameter encoding.
- Repeated query keys.
- Disabled parameters.
- Header validation.
- Forbidden browser-controlled headers.
- JSON serialization.
- Body/method compatibility.
- Unsupported URL schemes.
- Credentials embedded in URLs.
- Sensitive data redaction.

Test response parsing:

- JSON object.
- JSON array.
- JSON string.
- JSON number.
- JSON boolean.
- JSON null.
- Empty body.
- Malformed JSON.
- Plain text.
- 204 response.
- Large response preview.
- Unavailable headers.

Test error classification:

- HTTP error response.
- Network failure.
- Timeout.
- User cancellation.
- Invalid request.
- JSON parsing failure.
- Stale response protection.

Test persistence:

- Save, edit, duplicate, and delete.
- Invalid stored JSON.
- Schema migration.
- Secret redaction.
- Import validation.
- ID collisions.
- History clearing.

Component and integration tests

Test:

- Building a request.
- Adding/removing query parameters.
- Adding/removing headers.
- Editing the request body.
- Preventing invalid requests.
- Sending a request through a mocked transport.
- Rendering success and HTTP error responses.
- Displaying network/CORS failure without inventing an HTTP status.
- Cancelling an in-flight request.
- Showing timeout feedback.
- Copying response data.
- Saving and reopening configurations.
- Clearing history.
- Importing and exporting data.
- Keyboard behavior.
- Responsive navigation.

Use mocked responses for deterministic tests. Never depend on third-party APIs being available during the unit test suite.

End-to-end tests

Use Playwright and a controlled local mock server or intercepted browser requests.

Required scenarios:

- Load the application.
- Build and send a valid GET request.
- Send a POST request with JSON.
- Inspect response headers and formatted JSON.
- Handle an HTTP 404 response.
- Handle a simulated network failure.
- Cancel a long-running request.
- Trigger a timeout.
- Save and reopen a request.
- Reload and verify saved configuration persistence.
- Import invalid data and show a safe error.
- Export a collection and verify redaction.
- Clear request history.
- Navigate the interface with a keyboard.
- Verify the app does not execute returned HTML or scripts.

Tests must use deterministic fixtures and must not send destructive requests to real services.

Quality targets

- All required tests pass.
- No TypeScript errors.
- No ESLint errors.
- At least 80% statement coverage for request-building, parsing, error-classification, and persistence logic.
- At least 75% branch coverage for those same critical modules.
- All important request lifecycle states have automated coverage.
- No unhandled promise rejections in tested flows.
- No secrets exposed in test logs or fixtures.

## 15. Security Requirements

Follow applicable OWASP secure development guidance.

Browser request boundary

- This application must not provide a server endpoint that fetches arbitrary user-supplied URLs.
- Restrict schemes to HTTP and HTTPS.
- Reject URL credentials.
- Explain browser CORS behavior.
- Do not bypass TLS validation.
- Do not request browser permissions that are unnecessary.
- Do not add extensions or service workers to intercept unrelated browsing traffic.

Content handling

- Treat remote responses as untrusted input.
- Render body data as escaped text or safely constructed JSON views.
- Never evaluate remote scripts.
- Never use unsafe HTML rendering for response content.
- Do not execute imported collection data.

Secrets

- Do not persist secrets by default.
- Redact sensitive fields in history and exports.
- Do not include credentials in analytics or logs.
- Do not store access tokens in URLs when avoidable.
- Warn before a user sends a request with credentials.

Permissions and scope

- Use documented public test endpoints and APIs that explicitly permit the intended testing.
- Do not scan networks or probe internal services.
- Do not implement arbitrary server-side fetching.
- Document that CORS and server policy may prevent requests even when the URL is valid.

## 16. Performance and Reliability

Measure the production build.

Targets:

- Lighthouse Performance: 90 or above.
- Lighthouse Accessibility: 95 or above.
- Lighthouse Best Practices: 95 or above.
- Lighthouse SEO: 90 or above.
- Core Web Vitals targets when field data is available: LCP <= 2.5 seconds, INP <= 200 milliseconds, CLS <= 0.1 at the 75th percentile.

For lab tests, document the browser, hardware or emulation profile, network conditions, and number of runs. Do not describe one Lighthouse run as proof of field performance.

Reliability requirements:

- No leaked timeout resources.
- No stale response overwrites.
- No duplicate submissions from double-clicks.
- No unbounded response rendering.
- Graceful handling of unavailable clipboard access.
- Graceful handling of storage failures.
- Predictable request cancellation.
- Correct resource cleanup on unmount.
- No hidden automatic retries.

## 17. CI and Deployment

CI must run:

- Dependency installation from the lockfile.
- Formatting check.
- Lint.
- TypeScript check.
- Unit and integration tests.
- Coverage thresholds.
- Production build.
- Playwright end-to-end tests.

Deploy to a static host with HTTPS and appropriate SPA fallback behavior.

Do not put secrets in frontend environment variables. Anything bundled into a public frontend build must be treated as public.

Verify:

- Direct route loading.
- Reloading saved configurations.
- Production request behavior.
- CORS explanation and error handling.
- Copy actions.
- Responsive behavior.
- Correct production asset paths.

## 18. Portfolio Deliverables

Publish:

- Live demo.
- Public repository.
- README with setup and feature documentation.
- Architecture diagram.
- HTTP lifecycle diagram.
- Screenshots or short demonstration video.
- Automated test summary.
- Performance measurements.
- Security decisions and known limitations.
- A case study explaining request construction, asynchronous execution, cancellation, error classification, and secret redaction.

Include a documented example request using a permitted public test endpoint. Explain any restrictions that affect the live demo.

## 19. Definition of Done

API Explorer is complete only when:

- Request construction and validation work.
- GET, POST, PUT, PATCH, and DELETE are implemented and tested with safe fixtures.
- Query parameters, headers, and supported bodies work.
- Responses are parsed and displayed correctly.
- HTTP errors are distinguished from network failures.
- Cancellation and timeout behavior work.
- Saved requests and history follow the documented privacy rules.
- Import/export validates and redacts data appropriately.
- Critical accessibility requirements are verified.
- Required automated tests pass in CI.
- The production build succeeds.
- The deployed app loads correctly.
- No arbitrary server-side URL proxy exists.
- No known critical or high-severity defects remain.
- Documentation reflects actual behavior and measured results.

## 20. Implementation Order

Milestone 1: Repository inspection, architecture, HTTP behavior, and security decisions.

Milestone 2: Request domain model, URL validation, request construction, and unit tests.

Milestone 3: HTTP transport abstraction, response parsing, error classification, timeout, and cancellation.

Milestone 4: Request workspace and form interactions.

Milestone 5: Response inspector and safe JSON/text rendering.

Milestone 6: Saved requests, collections, local history, and secret redaction.

Milestone 7: Import/export and schema validation.

Milestone 8: Accessibility, responsive design, and failure recovery.

Milestone 9: End-to-end testing, CI, and performance measurement.

Milestone 10: Deployment, documentation, and portfolio case study.

After each milestone, report changes, test results, limitations, and the next step. Never skip verification to save time or tokens.

---

## Amendments (portfolio review, 7 Nov 2026)

These amendments take precedence over the sections above where they conflict. The reasoning is in
`docs/decisions/`.

1. **MVP scope = milestones 1–5 plus a deploy.** Milestones 6–10 follow after the MVP is live.
   Collections and import/export (sections 9–10) are post-MVP.
2. **Private-network guard is a UX guard, not a security boundary** (ADR 0002). A browser-only app
   cannot reliably stop a user's own browser from reaching localhost or a private address, and
   doing so would block a core developer use case. The hosted demo warns before sending to
   localhost, private, link-local and metadata addresses and requires an explicit confirmation.
   Sample requests and E2E fixtures never target those addresses. Section 7's "do not issue requests
   to private networks" applies to anything the app sends on its own (samples, tests, prefetches),
   never to a user's explicit, confirmed request.
3. **No proxy, so CORS limits the live demo** (ADR 0001). The demo ships sample requests only for
   public endpoints that send permissive CORS headers. The UI explains CORS on every opaque failure.
4. **Added after the MVP:** environments with `{{variable}}` substitution (secret values never
   persisted by default) and cURL import/export (import never executes anything; export redacts
   sensitive headers unless the user opts in).
