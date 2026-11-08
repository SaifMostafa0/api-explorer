import { describe, expect, it } from 'vitest'
import type { HeaderEntry, QueryParameter, RequestConfiguration } from '../domain/request'
import { buildRequest, type BuildResult } from './buildRequest'

let nextId = 0
const row = (key: string, value: string, enabled = true): QueryParameter => ({
  id: `q${nextId++}`,
  key,
  value,
  enabled,
})
const header = (name: string, value: string, enabled = true): HeaderEntry => ({
  id: `h${nextId++}`,
  name,
  value,
  enabled,
})

function config(overrides: Partial<RequestConfiguration> = {}): RequestConfiguration {
  return {
    id: 'r1',
    name: 'Test',
    method: 'GET',
    url: 'https://api.example.com/items',
    query: [],
    headers: [],
    bodyMode: 'none',
    body: '',
    formFields: [],
    createdAt: '2026-11-08T00:00:00.000Z',
    updatedAt: '2026-11-08T00:00:00.000Z',
    ...overrides,
  }
}

function built(result: BuildResult) {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.errors)}`)
  return result.request
}

describe('URL normalisation and schemes', () => {
  it('sends the normalised URL', () => {
    expect(built(buildRequest(config({ url: 'HTTPS://API.Example.com:443/a/./b' }))).url).toBe(
      'https://api.example.com/a/b',
    )
  })

  it.each(['javascript:alert(1)', 'file:///etc/hosts', 'data:,x'])('refuses %s and sends nothing', (url) => {
    const result = buildRequest(config({ url }))
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.errors).toEqual([{ field: 'url', message: expect.stringMatching(/supported/) }])
  })

  it('refuses credentials embedded in the URL', () => {
    const result = buildRequest(config({ url: 'https://admin:hunter2@api.example.com' }))
    expect(result).toMatchObject({ ok: false, errors: [{ field: 'url' }] })
  })
})

describe('query parameters', () => {
  it('encodes spaces and special characters', () => {
    const request = built(buildRequest(config({ query: [row('q', 'a b&c=d/é'), row('sort by', '+1')] })))
    expect(request.url).toBe('https://api.example.com/items?q=a+b%26c%3Dd%2F%C3%A9&sort+by=%2B1')
    // Round-trips to the same values: nothing was double-encoded.
    const params = new URL(request.url).searchParams
    expect(params.get('q')).toBe('a b&c=d/é')
    expect(params.get('sort by')).toBe('+1')
  })

  it('keeps repeated keys in row order', () => {
    const request = built(
      buildRequest(config({ query: [row('tag', 'a'), row('page', '1'), row('tag', 'b')] })),
    )
    expect(request.url).toBe('https://api.example.com/items?tag=a&page=1&tag=b')
    expect(new URL(request.url).searchParams.getAll('tag')).toEqual(['a', 'b'])
  })

  it('skips disabled and blank rows', () => {
    const request = built(buildRequest(config({ query: [row('a', '1', false), row('', ''), row('b', '2')] })))
    expect(request.url).toBe('https://api.example.com/items?b=2')
  })

  it('preserves params typed in the URL byte for byte', () => {
    const request = built(
      buildRequest(config({ url: 'https://api.example.com/s?q=a%20b&flag', query: [row('page', '2')] })),
    )
    expect(request.url).toBe('https://api.example.com/s?q=a%20b&flag&page=2')
  })

  it('keeps an empty value and rejects a value without a name', () => {
    const okRow = row('empty', '')
    expect(built(buildRequest(config({ query: [okRow] }))).url).toBe('https://api.example.com/items?empty=')

    const bad = row('', 'orphan')
    expect(buildRequest(config({ query: [bad] }))).toMatchObject({
      ok: false,
      errors: [{ field: 'query', rowId: bad.id }],
    })
  })
})

describe('headers', () => {
  it('sends valid headers in order, with values trimmed', () => {
    const request = built(
      buildRequest(config({ headers: [header('Accept', ' application/json '), header('X-Id', '7')] })),
    )
    expect(request.headers).toEqual([
      ['Accept', 'application/json'],
      ['X-Id', '7'],
    ])
  })

  it('reports invalid names and values per row and sends nothing', () => {
    const badName = header('Content-Type:', 'x')
    const badValue = header('X-Note', 'line1\nline2')
    const result = buildRequest(config({ headers: [badName, badValue] }))
    expect(result).toMatchObject({
      ok: false,
      errors: [
        { field: 'headers', rowId: badName.id, message: expect.stringMatching(/Remove the ":"/) },
        { field: 'headers', rowId: badValue.id, message: expect.stringMatching(/line breaks/) },
      ],
    })
  })

  it('leaves out forbidden headers and warns instead of pretending they were sent', () => {
    const host = header('Host', 'evil.example')
    const cookie = header('Cookie', 'a=1')
    const result = buildRequest(config({ headers: [host, header('Accept', '*/*'), cookie] }))
    expect(built(result).headers).toEqual([['Accept', '*/*']])
    expect(result.warnings).toEqual([
      {
        kind: 'forbidden-header',
        rowId: host.id,
        name: 'Host',
        message: "The browser controls Host, so it won't be sent.",
      },
      expect.objectContaining({ kind: 'forbidden-header', rowId: cookie.id }),
    ])
  })

  it('combines duplicate names case-insensitively and says so', () => {
    const first = header('Accept', 'application/json')
    const second = header('accept', 'text/plain')
    const result = buildRequest(config({ headers: [first, second] }))
    expect(built(result).headers).toEqual([['Accept', 'application/json, text/plain']])
    expect(result.warnings).toEqual([
      expect.objectContaining({ kind: 'duplicate-header', name: 'Accept', rowIds: [first.id, second.id] }),
    ])
  })

  it('ignores disabled headers', () => {
    expect(built(buildRequest(config({ headers: [header('X-Off', '1', false)] }))).headers).toEqual([])
  })
})

describe('bodies', () => {
  it('sends JSON exactly as typed and sets Content-Type', () => {
    const body = '{\n  "name": "Ada",\n  "tags": []\n}'
    const request = built(buildRequest(config({ method: 'POST', bodyMode: 'json', body })))
    expect(request.body).toBe(body)
    expect(request.headers).toEqual([['Content-Type', 'application/json']])
  })

  it('keeps a Content-Type the user set', () => {
    const request = built(
      buildRequest(
        config({
          method: 'POST',
          bodyMode: 'json',
          body: '{}',
          headers: [header('content-type', 'application/merge-patch+json')],
        }),
      ),
    )
    expect(request.headers).toEqual([['content-type', 'application/merge-patch+json']])
  })

  it('reports invalid JSON with its location', () => {
    const result = buildRequest(config({ method: 'POST', bodyMode: 'json', body: '{\n  "a" 1\n}' }))
    expect(result).toMatchObject({
      ok: false,
      errors: [{ field: 'body', message: expect.stringMatching(/\(line 2, column 7\)$/) }],
    })
  })

  it('sends plain text with a text Content-Type', () => {
    const request = built(buildRequest(config({ method: 'PUT', bodyMode: 'text', body: 'hello' })))
    expect(request).toMatchObject({ body: 'hello', headers: [['Content-Type', 'text/plain;charset=UTF-8']] })
  })

  it('url-encodes form fields', () => {
    const request = built(
      buildRequest(
        config({
          method: 'POST',
          bodyMode: 'urlencoded',
          formFields: [row('user', 'a b'), row('skip', 'x', false), row('pw', 'p&w')],
        }),
      ),
    )
    expect(request.body).toBe('user=a+b&pw=p%26w')
    expect(request.headers).toEqual([['Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8']])
  })

  it('sends no body for mode none', () => {
    expect(built(buildRequest(config({ method: 'POST', body: 'ignored' }))).body).toBeNull()
  })
})

describe('body and method compatibility', () => {
  it.each(['GET', 'DELETE'] as const)('refuses a %s with a body instead of dropping it', (method) => {
    const original = config({ method, bodyMode: 'json', body: '{"a":1}' })
    const result = buildRequest(original)
    expect(result).toMatchObject({
      ok: false,
      errors: [{ field: 'body', message: expect.stringContaining(method) }],
    })
    // The configuration is untouched, so the user can fix it without retyping anything.
    expect(original.body).toBe('{"a":1}')
    expect(original.method).toBe(method)
  })

  it('refuses a GET with url-encoded fields', () => {
    const result = buildRequest(config({ bodyMode: 'urlencoded', formFields: [row('a', '1')] }))
    expect(result).toMatchObject({ ok: false, errors: [{ field: 'body' }] })
  })

  it('allows a GET whose body mode is set but empty', () => {
    expect(built(buildRequest(config({ bodyMode: 'json', body: '  ' }))).body).toBeNull()
  })
})

describe('reporting', () => {
  it('collects every error in one pass', () => {
    const result = buildRequest(
      config({
        method: 'GET',
        url: 'ftp://x',
        query: [row('', 'v')],
        headers: [header('Bad Name', 'v')],
        bodyMode: 'text',
        body: 'oops',
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.map((e) => e.field)).toEqual(['url', 'query', 'headers', 'body'])
  })

  it('warns about private-network targets but still builds the request', () => {
    const result = buildRequest(config({ url: 'http://localhost:3000/health' }))
    expect(result.ok).toBe(true)
    expect(result.warnings).toEqual([expect.objectContaining({ kind: 'private-network', host: 'localhost' })])
  })

  it('does not warn for public hosts', () => {
    expect(buildRequest(config()).warnings).toEqual([])
  })
})
