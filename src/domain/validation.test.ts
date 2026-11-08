import { describe, expect, it } from 'vitest'
import {
  isForbiddenHeaderName,
  validateHeaderName,
  validateHeaderValue,
  validateJsonBody,
  validateUrl,
} from './validation'

describe('validateUrl', () => {
  it('normalises with the native URL parser', () => {
    // Lower-cased scheme and host, default port dropped, dot segments resolved.
    const result = validateUrl('  HTTPS://Example.COM:443/a/../b?x=1  ')
    expect(result.ok && result.url.href).toBe('https://example.com/b?x=1')
  })

  it('accepts http and https', () => {
    expect(validateUrl('http://example.com').ok).toBe(true)
    expect(validateUrl('https://example.com').ok).toBe(true)
  })

  it('rejects empty input', () => {
    expect(validateUrl('   ')).toEqual({ ok: false, message: 'Enter a URL.' })
  })

  it('rejects relative or malformed URLs instead of guessing', () => {
    expect(validateUrl('example.com/users')).toMatchObject({ ok: false, message: /absolute URL/ })
    expect(validateUrl('http://')).toMatchObject({ ok: false })
  })

  it.each(['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'ftp://example.com', 'ws://x'])(
    'rejects unsupported scheme %s',
    (input) => {
      expect(validateUrl(input)).toMatchObject({ ok: false, message: /aren't supported/ })
    },
  )

  it('explains a missing scheme on host:port input', () => {
    expect(validateUrl('localhost:3000/api')).toEqual({
      ok: false,
      message: 'Add a scheme, for example http://localhost:3000/api.',
    })
  })

  it('rejects embedded credentials', () => {
    expect(validateUrl('https://user:pass@example.com')).toMatchObject({ ok: false, message: /username/ })
    expect(validateUrl('https://user@example.com')).toMatchObject({ ok: false })
  })
})

describe('validateHeaderName', () => {
  it('accepts RFC 9110 tokens', () => {
    expect(validateHeaderName('X-Request-Id')).toEqual({ ok: true })
    expect(validateHeaderName("a!#$%&'*+-.^_`|~9")).toEqual({ ok: true })
  })

  it.each([
    ['', /Enter a header name/],
    ['Content-Type:', /Remove the ":"/],
    ['X Custom', /spaces/],
    ['X-Ünicode', /letters, digits/],
    ['X(bad)', /letters, digits/],
  ])('rejects %j', (name, message) => {
    expect(validateHeaderName(name)).toMatchObject({ ok: false, message })
  })
})

describe('validateHeaderValue', () => {
  it('accepts normal and Latin-1 values', () => {
    expect(validateHeaderValue('Bearer abc.def')).toEqual({ ok: true })
    expect(validateHeaderValue('café')).toEqual({ ok: true })
  })

  it('rejects header injection characters', () => {
    expect(validateHeaderValue('a\r\nX-Evil: 1')).toMatchObject({ ok: false, message: /line breaks/ })
    expect(validateHeaderValue('a\0b')).toMatchObject({ ok: false })
  })

  it('rejects characters fetch cannot encode', () => {
    expect(validateHeaderValue('hello 👋')).toMatchObject({ ok: false, message: /Latin-1/ })
  })
})

describe('isForbiddenHeaderName', () => {
  it.each(['Host', 'cookie', 'Origin', 'Content-Length', 'Sec-Fetch-Mode', 'Proxy-Authorization', 'Referer'])(
    'flags %s',
    (name) => expect(isForbiddenHeaderName(name)).toBe(true),
  )

  it.each(['Authorization', 'Content-Type', 'Accept', 'X-Api-Key', 'Secret'])('allows %s', (name) =>
    expect(isForbiddenHeaderName(name)).toBe(false),
  )
})

describe('validateJsonBody', () => {
  it('accepts valid JSON, including falsy top-level values', () => {
    expect(validateJsonBody('{"a": [1, 2]}')).toEqual({ ok: true })
    expect(validateJsonBody('0')).toEqual({ ok: true })
    expect(validateJsonBody('null')).toEqual({ ok: true })
  })

  it('rejects an empty body with a hint', () => {
    expect(validateJsonBody('  \n')).toMatchObject({ ok: false, message: /set the body type to None/ })
  })

  it('reports line and column when the engine gives a position', () => {
    expect(validateJsonBody('{\n  "a" 1\n}')).toMatchObject({ ok: false, line: 2, column: 7 })
  })

  it('points at the end for truncated input', () => {
    expect(validateJsonBody('{\n"a": 1')).toMatchObject({ ok: false, line: 2, column: 7, position: 8 })
  })

  it('still fails cleanly when no location is available', () => {
    const result = validateJsonBody('[1,]')
    expect(result).toMatchObject({ ok: false, message: /^Invalid JSON: / })
  })
})
