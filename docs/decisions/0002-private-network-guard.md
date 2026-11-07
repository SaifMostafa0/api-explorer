# ADR 0002: Private-network guard is a warning, not a boundary

Status: accepted, 7 Nov 2026 (amends spec §7)

**Context.** The spec says never send requests to localhost, private networks or metadata
endpoints. In a browser-only app the request comes from the user's own browser, which can already
reach those addresses, and DNS can point any public name at a private IP, so client-side
blocking can't be enforced. Hitting `localhost` is also a core developer use case.

**Decision.** Detect `localhost`, `127.0.0.0/8`, `::1`, `10/8`, `172.16/12`, `192.168/16`,
`169.254/16` (incl. `169.254.169.254`) and `.local` hostnames, and ask for confirmation before
sending. The app itself never sends to those addresses (no samples, prefetches or tests).

**Consequences.** Honest wording in `docs/security.md`: this protects against mistakes, not
attackers. Browsers' own Private Network Access rules may still block some of these requests.
