// Turns what the transport read into a typed snapshot. Pure: works on plain data, not on a
// Response object, so every case is a one-line test.

import type { HeaderExposure, ResponseBody, ResponseSnapshot } from '../domain/response'

/** Everything executeRequest collected from the Response, before interpretation. */
export interface RawResponse {
  status: number
  statusText: string
  headers: [string, string][]
  headerExposure: HeaderExposure
  finalUrl: string | null
  startedAt: string
  durationMs: number
  sizeBytes: number | null
  /** The decoded body, or its first MAX_PREVIEW_BYTES when `truncated`. */
  text: string
  truncated: boolean
}

export interface ParsedResponse {
  snapshot: ResponseSnapshot
  /** Set when the content type says JSON but the body didn't parse. */
  jsonError: string | null
}

/** application/json, or any structured-syntax `+json` type such as application/problem+json. */
export function isJsonContentType(contentType: string | null): boolean {
  if (contentType === null) return false
  const mediaType = contentType.split(';', 1)[0]?.trim().toLowerCase() ?? ''
  return mediaType === 'application/json' || /^[a-z]+\/[^\s/]+\+json$/.test(mediaType)
}

export function parseResponse(raw: RawResponse): ParsedResponse {
  const contentType = raw.headers.find(([name]) => name.toLowerCase() === 'content-type')?.[1] ?? null
  const base = {
    status: raw.status,
    statusText: raw.statusText,
    headers: raw.headers,
    headerExposure: raw.headerExposure,
    finalUrl: raw.finalUrl,
    startedAt: raw.startedAt,
    durationMs: raw.durationMs,
    sizeBytes: raw.sizeBytes,
    contentType,
    truncated: raw.truncated,
  }
  const done = (body: ResponseBody, parse: ResponseSnapshot['parse'], jsonError: string | null = null) => ({
    snapshot: { ...base, body, parse },
    jsonError,
  })

  // 204, 304, or a 200 with nothing in it. Empty is not a parse error, whatever the content type.
  if (raw.text === '') return done({ kind: 'empty' }, 'ok')

  if (!isJsonContentType(contentType)) return done({ kind: 'text', text: raw.text }, 'not-json')

  // Half a JSON document is never valid JSON. Don't report it as malformed: it was cut by us.
  if (raw.truncated) return done({ kind: 'text', text: raw.text }, 'truncated')

  try {
    // `unknown`, not `any`: remote data is untrusted, and the inspector must narrow it first.
    // Falsy values (false, 0, null, "") are kept as they are; nothing here checks truthiness.
    const value: unknown = JSON.parse(raw.text)
    return done({ kind: 'json', value, text: raw.text }, 'ok')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return done({ kind: 'text', text: raw.text }, 'json-error', message)
  }
}
