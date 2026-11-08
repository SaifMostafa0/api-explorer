import { describe, expect, it } from 'vitest'
import { isJsonContentType, parseResponse, type RawResponse } from './parseResponse'

function raw(overrides: Partial<RawResponse> = {}): RawResponse {
  return {
    status: 200,
    statusText: 'OK',
    headers: [['content-type', 'application/json; charset=utf-8']],
    headerExposure: 'all',
    finalUrl: 'https://api.example.test/items',
    startedAt: '2026-11-08T10:00:00.000Z',
    durationMs: 12.5,
    sizeBytes: 2,
    text: '{}',
    truncated: false,
    ...overrides,
  }
}

describe('isJsonContentType', () => {
  it.each([
    'application/json',
    'Application/JSON; charset=utf-8',
    'application/problem+json',
    'application/vnd.api+json',
  ])('treats %s as JSON', (type) => expect(isJsonContentType(type)).toBe(true))

  it.each([null, '', 'text/plain', 'text/html', 'application/jsonp', 'application/json-seq', 'text/json+'])(
    'does not treat %s as JSON',
    (type) => expect(isJsonContentType(type)).toBe(false),
  )
})

describe('parseResponse: JSON values', () => {
  it.each([
    ['object', '{"a":1}', { a: 1 }],
    ['array', '[1,"two",null]', [1, 'two', null]],
    ['string', '"hello"', 'hello'],
    ['number', '42.5', 42.5],
    ['boolean true', 'true', true],
  ])('parses a JSON %s', (_label, text, value) => {
    const { snapshot, jsonError } = parseResponse(raw({ text }))
    expect(snapshot.body).toEqual({ kind: 'json', value, text })
    expect(snapshot.parse).toBe('ok')
    expect(jsonError).toBeNull()
  })

  it.each([
    ['false', false],
    ['0', 0],
    ['null', null],
    ['""', ''],
  ])('keeps the falsy JSON value %s', (text, value) => {
    const { snapshot } = parseResponse(raw({ text }))
    expect(snapshot.body.kind).toBe('json')
    if (snapshot.body.kind === 'json') expect(snapshot.body.value).toBe(value)
  })

  it('keeps the original text next to the parsed value, for the raw view', () => {
    const text = '{\n  "a" : 1\n}'
    const { snapshot } = parseResponse(raw({ text }))
    expect(snapshot.body).toMatchObject({ kind: 'json', text })
  })
})

describe('parseResponse: other bodies', () => {
  it('treats an empty body as empty, even with a JSON content type', () => {
    expect(parseResponse(raw({ text: '' })).snapshot).toMatchObject({ body: { kind: 'empty' }, parse: 'ok' })
  })

  it('handles 204 No Content', () => {
    const { snapshot, jsonError } = parseResponse(
      raw({ status: 204, statusText: 'No Content', headers: [], text: '', sizeBytes: 0 }),
    )
    expect(snapshot).toMatchObject({ status: 204, body: { kind: 'empty' }, contentType: null, parse: 'ok' })
    expect(jsonError).toBeNull()
  })

  it('keeps malformed JSON as text and reports why', () => {
    const { snapshot, jsonError } = parseResponse(raw({ text: '{"a":' }))
    expect(snapshot).toMatchObject({ body: { kind: 'text', text: '{"a":' }, parse: 'json-error' })
    expect(jsonError).toEqual(expect.any(String))
  })

  it('keeps plain text as text', () => {
    const { snapshot } = parseResponse(raw({ headers: [['content-type', 'text/plain']], text: 'pong' }))
    expect(snapshot).toMatchObject({
      body: { kind: 'text', text: 'pong' },
      parse: 'not-json',
      contentType: 'text/plain',
    })
  })

  it('never treats HTML as anything but text', () => {
    const html = '<script>alert(1)</script>'
    const { snapshot } = parseResponse(raw({ headers: [['content-type', 'text/html']], text: html }))
    expect(snapshot.body).toEqual({ kind: 'text', text: html })
  })

  it('does not sniff JSON when there is no content type', () => {
    expect(parseResponse(raw({ headers: [], text: '{"a":1}' })).snapshot.parse).toBe('not-json')
  })
})

describe('parseResponse: large and restricted responses', () => {
  it('marks a large preview as truncated and does not call cut-off JSON malformed', () => {
    const { snapshot, jsonError } = parseResponse(
      raw({ text: '[1,2,3,', truncated: true, sizeBytes: 5_000_000 }),
    )
    expect(snapshot).toMatchObject({
      truncated: true,
      parse: 'truncated',
      sizeBytes: 5_000_000,
      body: { kind: 'text' },
    })
    expect(jsonError).toBeNull()
  })

  it('keeps a truncated text preview as text', () => {
    const { snapshot } = parseResponse(
      raw({ headers: [['content-type', 'text/plain']], text: 'abc', truncated: true }),
    )
    expect(snapshot).toMatchObject({ truncated: true, parse: 'not-json' })
  })

  it('passes through CORS-filtered headers without inventing missing ones', () => {
    const { snapshot } = parseResponse(raw({ headerExposure: 'cors-filtered', headers: [], text: 'x' }))
    expect(snapshot).toMatchObject({ headers: [], headerExposure: 'cors-filtered', contentType: null })
  })

  it('copies timing and URL through unchanged', () => {
    expect(parseResponse(raw()).snapshot).toMatchObject({
      durationMs: 12.5,
      startedAt: '2026-11-08T10:00:00.000Z',
      finalUrl: 'https://api.example.test/items',
    })
  })
})
