// Turns what the user typed into exactly what will be sent, or into a list of every problem.
// Pure: no fetch, no DOM, no clock. The transport (M3) turns a BuiltRequest into a real Request.

import {
  METHODS_WITHOUT_BODY,
  type BuiltRequest,
  type HeaderEntry,
  type QueryParameter,
  type RequestConfiguration,
} from '../domain/request'
import {
  isForbiddenHeaderName,
  validateHeaderName,
  validateHeaderValue,
  validateJsonBody,
  validateUrl,
  type BuildWarning,
  type FieldError,
  type FieldName,
} from '../domain/validation'
import { isPrivateNetworkHost } from './privateNetwork'

export type BuildResult =
  | { ok: true; request: BuiltRequest; warnings: BuildWarning[] }
  | { ok: false; errors: FieldError[]; warnings: BuildWarning[] }

const DEFAULT_CONTENT_TYPE = {
  json: 'application/json',
  text: 'text/plain;charset=UTF-8',
  urlencoded: 'application/x-www-form-urlencoded;charset=UTF-8',
} as const

export function buildRequest(config: RequestConfiguration): BuildResult {
  const errors: FieldError[] = []
  const warnings: BuildWarning[] = []

  // Each step runs even when an earlier one failed, so the user sees every problem at once.
  const url = buildUrl(config, errors, warnings)
  const headers = buildHeaders(config.headers, errors, warnings)
  const body = buildBody(config, errors)

  if (errors.length > 0 || url === null) return { ok: false, errors, warnings }

  if (body !== null && !headers.some(([name]) => name.toLowerCase() === 'content-type')) {
    headers.push(['Content-Type', body.contentType])
  }

  return {
    ok: true,
    request: { method: config.method, url, headers, body: body?.text ?? null },
    warnings,
  }
}

function buildUrl(
  config: RequestConfiguration,
  errors: FieldError[],
  warnings: BuildWarning[],
): string | null {
  const validated = validateUrl(config.url)
  if (!validated.ok) {
    errors.push({ field: 'url', message: validated.message })
  }

  // Validate rows even if the URL is broken, so their errors show up too.
  const extra = rowsToSearchParams(config.query, 'query', errors)
  if (!validated.ok) return null

  const { url } = validated
  // Don't use url.searchParams.append: it re-serialises the *whole* query, turning
  // "?q=a%20b&flag" into "?q=a+b&flag=". Encode only the new rows and join them on.
  const added = extra.toString()
  if (added !== '') {
    const existing = url.search.slice(1) // drop the leading "?"
    url.search = existing === '' ? added : `${existing}&${added}`
  }

  if (isPrivateNetworkHost(url.hostname)) {
    warnings.push({
      kind: 'private-network',
      host: url.hostname,
      message: `${url.hostname} is a local or private-network address. Confirm before sending.`,
    })
  }

  return url.href
}

/** Enabled, non-blank rows to URLSearchParams. Repeated keys are kept, in row order. */
function rowsToSearchParams(rows: QueryParameter[], field: FieldName, errors: FieldError[]) {
  const params = new URLSearchParams()
  for (const row of rows) {
    if (!row.enabled) continue
    if (row.key === '' && row.value === '') continue // the empty "new row" at the bottom of a table
    if (row.key === '') {
      errors.push({ field, rowId: row.id, message: 'Enter a name for this value.' })
      continue
    }
    params.append(row.key, row.value)
  }
  return params
}

function buildHeaders(
  rows: HeaderEntry[],
  errors: FieldError[],
  warnings: BuildWarning[],
): [string, string][] {
  // Keyed by lower-case name: header names are case-insensitive, so "accept" and "Accept" are
  // the same header. Map keeps insertion order, so the first row decides position and casing.
  const combined = new Map<string, { name: string; values: string[]; rowIds: string[] }>()

  for (const row of rows) {
    if (!row.enabled) continue
    if (row.name === '' && row.value === '') continue

    const nameCheck = validateHeaderName(row.name)
    if (!nameCheck.ok) {
      errors.push({ field: 'headers', rowId: row.id, message: nameCheck.message })
      continue
    }
    // The browser trims header values anyway. Trim here so the preview shows what is really sent.
    const value = row.value.trim()
    const valueCheck = validateHeaderValue(value)
    if (!valueCheck.ok) {
      errors.push({ field: 'headers', rowId: row.id, message: valueCheck.message })
      continue
    }

    if (isForbiddenHeaderName(row.name)) {
      // fetch() would drop it without telling anyone. Leave it out and say so.
      warnings.push({
        kind: 'forbidden-header',
        rowId: row.id,
        name: row.name,
        message: `The browser controls ${row.name}, so it won't be sent.`,
      })
      continue
    }

    const key = row.name.toLowerCase()
    const entry = combined.get(key)
    if (entry) {
      entry.values.push(value)
      entry.rowIds.push(row.id)
    } else {
      combined.set(key, { name: row.name, values: [value], rowIds: [row.id] })
    }
  }

  const headers: [string, string][] = []
  for (const { name, values, rowIds } of combined.values()) {
    // Same rule as Headers.append() and RFC 9110 §5.3: combine duplicates with ", ".
    headers.push([name, values.join(', ')])
    if (rowIds.length > 1) {
      warnings.push({
        kind: 'duplicate-header',
        name,
        rowIds,
        message: `${rowIds.length} ${name} headers will be sent as one, with values separated by ", ".`,
      })
    }
  }
  return headers
}

function buildBody(
  config: RequestConfiguration,
  errors: FieldError[],
): { text: string; contentType: string } | null {
  if (config.bodyMode === 'none') return null

  if (METHODS_WITHOUT_BODY.has(config.method)) {
    // Nothing typed yet: the mode is just left over from another method. Not worth an error.
    if (!hasBodyContent(config)) return null
    // Never drop the body or change the method behind the user's back (spec §6).
    errors.push({
      field: 'body',
      message: `${config.method} requests can't have a body. Set the body type to None or choose another method.`,
    })
    return null
  }

  switch (config.bodyMode) {
    case 'json': {
      const check = validateJsonBody(config.body)
      if (!check.ok) {
        const where = check.line ? ` (line ${check.line}, column ${check.column})` : ''
        errors.push({ field: 'body', message: `${check.message}${where}` })
        return null
      }
      // Sent exactly as typed. We validate the JSON but don't re-format it.
      return { text: config.body, contentType: DEFAULT_CONTENT_TYPE.json }
    }
    case 'text':
      return { text: config.body, contentType: DEFAULT_CONTENT_TYPE.text }
    case 'urlencoded': {
      const params = rowsToSearchParams(config.formFields, 'formFields', errors)
      return { text: params.toString(), contentType: DEFAULT_CONTENT_TYPE.urlencoded }
    }
  }
}

function hasBodyContent(config: RequestConfiguration): boolean {
  if (config.bodyMode === 'urlencoded') {
    return config.formFields.some((row) => row.enabled && (row.key !== '' || row.value !== ''))
  }
  return config.body.trim() !== ''
}
