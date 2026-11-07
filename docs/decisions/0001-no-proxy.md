# ADR 0001: No server-side proxy

Status: accepted, 7 Nov 2026

**Context.** Many real APIs don't send CORS headers, so a browser-only tool can't read their
responses. A proxy would fix that but turns the app into an open relay that can reach anything the
host can reach (SSRF), and it needs abuse limits and hosting.

**Decision.** No proxy, ever. The app explains CORS on every opaque failure. The live demo ships
samples only for public endpoints that allow cross-origin reads.

**Consequences.** Some APIs won't work in the hosted demo; that is documented in the README and the
UI. It keeps the project a static site with no server to secure.
