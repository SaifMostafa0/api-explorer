// Secret redaction for anything that leaves the live editor: history, exports, logs (spec §9,
// docs/security.md). One list, used everywhere, so the rules can't drift apart.

import type { RequestConfiguration } from './request'

export const REDACTED = '[REDACTED]'

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
])
const SENSITIVE_QUERY_KEYS = ['token', 'access_token', 'api_key', 'apikey', 'password', 'secret']

export function isSensitiveHeaderName(name: string): boolean {
  return SENSITIVE_HEADERS.has(name.trim().toLowerCase())
}

export function isSensitiveQueryKey(key: string): boolean {
  return SENSITIVE_QUERY_KEYS.includes(key.trim().toLowerCase())
}

// Works on the raw string, not through `new URL()`, so it also covers URLs that failed
// validation and keeps the rest of the URL byte for byte.
const SENSITIVE_IN_URL = new RegExp(`([?&](?:${SENSITIVE_QUERY_KEYS.join('|')})=)[^&#]*`, 'gi')

export function redactUrl(url: string): string {
  return url.replace(SENSITIVE_IN_URL, `$1${REDACTED}`)
}

/**
 * A copy with secret values replaced. The request body is cleared entirely: we can't know what
 * is secret inside arbitrary JSON, and the spec says bodies never go to history.
 */
export function redactConfiguration(config: RequestConfiguration): RequestConfiguration {
  const redactRow = <T extends { value: string }>(row: T, sensitive: boolean): T =>
    sensitive && row.value !== '' ? { ...row, value: REDACTED } : row

  return {
    ...config,
    url: redactUrl(config.url),
    query: config.query.map((row) => redactRow(row, isSensitiveQueryKey(row.key))),
    headers: config.headers.map((row) => redactRow(row, isSensitiveHeaderName(row.name))),
    formFields: config.formFields.map((row) => redactRow(row, isSensitiveQueryKey(row.key))),
    body: '',
  }
}
