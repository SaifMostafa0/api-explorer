import { describe, expect, it } from 'vitest'
import {
  REDACTED,
  isSensitiveHeaderName,
  isSensitiveQueryKey,
  redactConfiguration,
  redactUrl,
} from './redaction'
import type { RequestConfiguration } from './request'

describe('sensitive names', () => {
  it.each(['Authorization', 'proxy-authorization', 'COOKIE', 'Set-Cookie', 'X-API-Key'])(
    'header %s',
    (name) => expect(isSensitiveHeaderName(name)).toBe(true),
  )
  it('leaves ordinary headers alone', () => expect(isSensitiveHeaderName('Accept')).toBe(false))

  it.each(['token', 'Access_Token', 'api_key', 'apikey', 'password', 'secret'])('query key %s', (key) =>
    expect(isSensitiveQueryKey(key)).toBe(true),
  )
  it('leaves ordinary keys alone', () => expect(isSensitiveQueryKey('page')).toBe(false))
})

describe('redactUrl', () => {
  it('redacts sensitive values and keeps everything else byte for byte', () => {
    expect(redactUrl('https://x.test/a?q=a%20b&token=abc123&API_KEY=k#frag')).toBe(
      `https://x.test/a?q=a%20b&token=${REDACTED}&API_KEY=${REDACTED}#frag`,
    )
  })

  it('does not touch keys that only contain a sensitive word', () => {
    expect(redactUrl('https://x.test/?tokenizer=on&my_token=1')).toBe(
      'https://x.test/?tokenizer=on&my_token=1',
    )
  })

  it('works on URLs that would fail validation', () => {
    expect(redactUrl('not a url?password=hunter2')).toBe(`not a url?password=${REDACTED}`)
  })
})

describe('redactConfiguration', () => {
  const config: RequestConfiguration = {
    id: 'r1',
    name: 'Login',
    method: 'POST',
    url: 'https://x.test/login?access_token=t0k',
    query: [
      { id: 'q1', key: 'secret', value: 's3', enabled: true },
      { id: 'q2', key: 'page', value: '1', enabled: true },
    ],
    headers: [
      { id: 'h1', name: 'Authorization', value: 'Bearer abc', enabled: false },
      { id: 'h2', name: 'Accept', value: 'application/json', enabled: true },
    ],
    bodyMode: 'urlencoded',
    body: '{"password":"hunter2"}',
    formFields: [{ id: 'f1', key: 'password', value: 'hunter2', enabled: true }],
    createdAt: '2026-11-08T00:00:00.000Z',
    updatedAt: '2026-11-08T00:00:00.000Z',
  }

  it('redacts headers, params, form fields and URL, and drops the body', () => {
    const redacted = redactConfiguration(config)
    expect(redacted.url).toBe(`https://x.test/login?access_token=${REDACTED}`)
    expect(redacted.query.map((r) => r.value)).toEqual([REDACTED, '1'])
    // Disabled rows are redacted too: they are still stored.
    expect(redacted.headers.map((h) => h.value)).toEqual([REDACTED, 'application/json'])
    expect(redacted.formFields[0]?.value).toBe(REDACTED)
    expect(redacted.body).toBe('')
  })

  it('does not mutate the original', () => {
    redactConfiguration(config)
    expect(config.headers[0]?.value).toBe('Bearer abc')
    expect(config.body).toBe('{"password":"hunter2"}')
  })
})
