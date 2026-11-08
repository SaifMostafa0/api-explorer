# HTTP model

The types below are the contract for M2 and M3. They are written here first so the
implementation can be checked against them.

```ts
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface QueryParameter {
  id: string
  key: string
  value: string
  enabled: boolean
}
interface HeaderEntry {
  id: string
  name: string
  value: string
  enabled: boolean
}

type RequestBodyMode = 'none' | 'json' | 'text' | 'urlencoded'

interface RequestConfiguration {
  id: string
  name: string
  method: HttpMethod
  url: string
  query: QueryParameter[]
  headers: HeaderEntry[]
  bodyMode: RequestBodyMode
  body: string // raw editor text; urlencoded uses `formFields` instead
  formFields: QueryParameter[]
  createdAt: string // ISO
  updatedAt: string
}

interface ResponseSnapshot {
  status: number
  statusText: string
  headers: [string, string][] // visible headers only
  headerExposure: 'all' | 'cors-filtered' // cors-filtered: the server may have sent more
  finalUrl: string | null
  startedAt: string
  durationMs: number // performance.now() delta, measured, never estimated
  sizeBytes: number | null // decoded body bytes, counted while streaming
  contentType: string | null
  body: { kind: 'empty' } | { kind: 'json'; value: unknown; text: string } | { kind: 'text'; text: string }
  truncated: boolean
  parse: 'ok' | 'not-json' | 'json-error' | 'truncated' // a truncated JSON preview is not parsed
}

type RequestResult =
  | { kind: 'success'; response: ResponseSnapshot }
  | { kind: 'http-error'; response: ResponseSnapshot } // 4xx/5xx: a real response
  | { kind: 'network-failure'; durationMs: number } // no response; could be CORS, DNS, offline
  | { kind: 'timeout'; timeoutMs: number }
  | { kind: 'cancelled' }
  | { kind: 'invalid'; errors: FieldError[] } // nothing was sent
  | { kind: 'parse-failure'; response: ResponseSnapshot; message: string }
```

## Rules the code must follow

| Area     | Rule                                                                                                                                                                                                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL      | `new URL(input)`; protocol must be `http:` or `https:`; reject `username`/`password`.                                                                                                                                                                                       |
| Query    | Built with `URLSearchParams.append` so repeated keys keep their order; disabled rows skipped. Params already in the typed URL are kept unless the user edits them.                                                                                                          |
| Headers  | Names must match the RFC 9110 token grammar. Forbidden request headers (`Host`, `Cookie`, `Origin`, `Content-Length`, `Sec-*`, `Proxy-*`, …) are flagged before sending with "the browser controls this header". Duplicate names are combined with `, ` and the UI says so. |
| Body     | `GET`/`DELETE` with a body → `invalid` result, body kept in the editor. JSON validated with `JSON.parse`; error shows position. `Content-Type` set by mode unless the user set one.                                                                                         |
| Timeout  | Default 30 s, configurable 1–120 s. Separate abort reasons for timeout vs cancel.                                                                                                                                                                                           |
| Response | Body read once, as a stream: the first 1 MB is kept (`truncated: true` beyond that), the rest is counted but not stored. JSON parsed when content type is `application/json` or `+json`.                                                                                    |
| Errors   | A `TypeError` from `fetch` with no response is `network-failure`. The UI lists possible causes (CORS, offline, DNS, mixed content) and never claims which one it was.                                                                                                       |

## Browser limitations shown in the UI

- **CORS**: the target server must allow this origin. Non-simple requests (custom headers, JSON
  body, PUT/PATCH/DELETE) trigger a preflight `OPTIONS` the app can't see.
- **Exposed response headers**: without `Access-Control-Expose-Headers` only CORS-safelisted
  headers are readable.
- **Mixed content**: the HTTPS demo can't call `http://` URLs; the app says so before sending.
- **Cookies**: requests are sent with `credentials: 'omit'`.

## Changes in M3

- `headers: … | null` became a visible list plus `headerExposure`. Under CORS the browser shows
  some headers and hides the rest, and JavaScript can't tell "none sent" from "hidden", so `null`
  could not be filled in honestly. The inspector says "the server may have sent more headers"
  for `cors-filtered`.
- `parse: 'truncated'`: half a JSON document is incomplete, not malformed.
- The body is streamed instead of read with `response.text()`, so a very large response can't
  fill memory and `sizeBytes` is the real decoded size.
- Status ≥ 400 is always `http-error`, even if its JSON body is broken; the snapshot's `parse`
  field still records that.
