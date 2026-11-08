import { describe, expect, it } from 'vitest'
import { RequestCancelledError, RequestTimeoutError } from '../domain/errors'
import { classifyFailure, classifyResponse } from './classifyError'
import { parseResponse, type RawResponse } from './parseResponse'

const parsed = (overrides: Partial<RawResponse>) =>
  parseResponse({
    status: 200,
    statusText: 'OK',
    headers: [['content-type', 'application/json']],
    headerExposure: 'all',
    finalUrl: null,
    startedAt: '2026-11-08T10:00:00.000Z',
    durationMs: 5,
    sizeBytes: 2,
    text: '{}',
    truncated: false,
    ...overrides,
  })

const abortedWith = (reason: unknown) => {
  const controller = new AbortController()
  controller.abort(reason)
  return controller.signal
}

describe('classifyResponse', () => {
  it('2xx is success', () => {
    expect(classifyResponse(parsed({}))).toMatchObject({ kind: 'success', response: { status: 200 } })
  })

  it.each([400, 404, 500, 503])('%i is an HTTP error with the real response, not a failure', (status) => {
    const result = classifyResponse(parsed({ status, text: '{"error":"x"}' }))
    expect(result).toMatchObject({ kind: 'http-error', response: { status, body: { kind: 'json' } } })
  })

  it('a 2xx with broken JSON is a parse failure that keeps the raw text', () => {
    const result = classifyResponse(parsed({ text: '{"a":' }))
    expect(result).toMatchObject({
      kind: 'parse-failure',
      message: expect.any(String),
      response: { body: { kind: 'text', text: '{"a":' }, parse: 'json-error' },
    })
  })

  it('an HTTP error wins over a parse problem, and the snapshot still records it', () => {
    const result = classifyResponse(parsed({ status: 500, text: '<html>oops' }))
    expect(result).toMatchObject({ kind: 'http-error', response: { parse: 'json-error' } })
  })

  it('a truncated JSON preview is still a success', () => {
    expect(classifyResponse(parsed({ text: '[1,', truncated: true })).kind).toBe('success')
  })
})

describe('classifyFailure', () => {
  it('no abort means the network failed, with no status invented', () => {
    const result = classifyFailure(new AbortController().signal, 42)
    expect(result).toEqual({ kind: 'network-failure', durationMs: 42 })
  })

  it('a timeout reason is a timeout', () => {
    expect(classifyFailure(abortedWith(new RequestTimeoutError(5000)), 5000)).toEqual({
      kind: 'timeout',
      timeoutMs: 5000,
    })
  })

  it('a user cancel is a cancel', () => {
    expect(classifyFailure(abortedWith(new RequestCancelledError()), 10)).toEqual({ kind: 'cancelled' })
  })

  it('any other abort (e.g. the page going away) is treated as a cancel, not a timeout', () => {
    expect(classifyFailure(abortedWith(undefined), 10)).toEqual({ kind: 'cancelled' })
  })
})
