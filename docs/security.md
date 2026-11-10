# Security

Threat model in one line: responses, stored data and imports are untrusted; the user's secrets
must not leak into storage, logs, history or exports; the app must not become a tool for reaching
networks the user's browser couldn't reach anyway.

| Risk                            | Decision                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open proxy / SSRF               | No server, no proxy (ADR 0001). The only network actor is the user's browser.                                                                                                                                                                                                                   |
| Script execution from responses | Bodies rendered as text nodes or a JSON tree built from data. No `dangerouslySetInnerHTML`, no iframes, no `eval`. CSP: `script-src 'self'`, `frame-src 'none'`, `object-src 'none'`.                                                                                                           |
| Unsupported schemes             | Only `http:`/`https:`; `javascript:`, `data:`, `file:` rejected before sending.                                                                                                                                                                                                                 |
| Credentials in URL              | `https://user:pass@host` rejected with an explanation.                                                                                                                                                                                                                                          |
| Secret persistence              | `Authorization`, `Proxy-Authorization`, `Cookie`, `Set-Cookie`, `X-API-Key` values and query params `token`, `access_token`, `api_key`, `apikey`, `password`, `secret` are redacted from history and exports. Saved configurations ask before keeping them. Request bodies never go to history. |
| Private network targets         | Warn and confirm on the hosted demo (ADR 0002). Not a security boundary.                                                                                                                                                                                                                        |
| Cookies                         | `credentials: 'omit'` on every request.                                                                                                                                                                                                                                                         |
| Telemetry                       | None.                                                                                                                                                                                                                                                                                           |
| Stored / imported data          | Parsed as `unknown`, validated with Zod, size and record limits on import.                                                                                                                                                                                                                      |

CSP `connect-src` allows any `https:` API plus `http://localhost` and `127.0.0.1` on any port,
because browsers let an https page call loopback servers and testing a local API is a core use case
(ADR 0002). `[::1]` can't be listed: CSP host-sources don't accept IPv6 literals (Chromium ignores
the source and logs an error), so IPv6 loopback APIs are blocked on the demo; use `localhost`
instead. Other `http:` targets are blocked twice: by the browser (mixed content) and by the CSP.

Anything in the frontend bundle is public. There are no secrets in env vars.
