// What came back, and what kind of outcome it was. Contract: docs/http-model.md.

import type { FieldError } from './validation'

export type ResponseBody =
  { kind: 'empty' } | { kind: 'json'; value: unknown; text: string } | { kind: 'text'; text: string }

/**
 * - `ok`: empty body, or JSON that parsed.
 * - `not-json`: the content type isn't JSON, so the body is kept as text.
 * - `json-error`: the content type says JSON but the text isn't valid JSON.
 * - `truncated`: JSON content type, but only a preview was kept, so it wasn't parsed.
 */
export type ParseState = 'ok' | 'not-json' | 'json-error' | 'truncated'

/**
 * `all`: same-origin, every header is visible.
 * `cors-filtered`: cross-origin. Only CORS-safelisted headers and those listed in
 * Access-Control-Expose-Headers are visible; the server may have sent more.
 */
export type HeaderExposure = 'all' | 'cors-filtered'

export interface ResponseSnapshot {
  status: number
  statusText: string
  /** Visible headers only, as the browser reports them (lower-case names). */
  headers: [string, string][]
  headerExposure: HeaderExposure
  /** URL after redirects, when the browser reports one. */
  finalUrl: string | null
  startedAt: string
  /** Measured with performance.now(), from send until the body was read. Never estimated. */
  durationMs: number
  /** Decoded body size in bytes (after the browser undid any gzip/br), or null if unknown. */
  sizeBytes: number | null
  contentType: string | null
  body: ResponseBody
  /** True when only the first MAX_PREVIEW_BYTES were kept. The body is then a preview. */
  truncated: boolean
  parse: ParseState
}

export type RequestResult =
  | { kind: 'success'; response: ResponseSnapshot }
  /** 4xx/5xx: a real response from the server, not a failure to reach it. */
  | { kind: 'http-error'; response: ResponseSnapshot }
  /** No response at all. Could be CORS, offline, DNS, mixed content: we can't tell which. */
  | { kind: 'network-failure'; durationMs: number }
  | { kind: 'timeout'; timeoutMs: number }
  | { kind: 'cancelled' }
  /** Nothing was sent. */
  | { kind: 'invalid'; errors: FieldError[] }
  /** 2xx/3xx with a JSON content type whose body isn't valid JSON. Raw text is kept. */
  | { kind: 'parse-failure'; response: ResponseSnapshot; message: string }
