import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequestCancelledError } from '../../domain/errors'
import {
  failWithNetworkError,
  jsonResponse,
  neverRespond,
  respondWith,
  stallingBody,
} from '../../test/factories/fakeTransport'
import { headerRow, requestConfiguration } from '../../test/factories/requestConfiguration'
import type { Transport } from './fetchClient'
import { executeRequest, readBody } from './fetchClient'

// A clock that moves 25 ms per reading, so durations are exact.
function steppingClock() {
  let t = 1000
  return () => (t += 25)
}
const fixedDate = () => new Date('2026-11-08T10:00:00.000Z')
const options = (transport: Transport) => ({ transport, now: steppingClock(), clock: fixedDate })

describe('executeRequest: what is sent', () => {
  it('sends the built request without cookies', async () => {
    const transport = respondWith(() => jsonResponse({ ok: true }))
    await executeRequest(
      requestConfiguration({
        method: 'POST',
        bodyMode: 'json',
        body: '{"name":"Ada"}',
        headers: [headerRow('Authorization', 'Bearer test-token-not-real')],
      }),
      options(transport),
    )

    const request = transport.mock.calls[0]?.[0]
    expect(request?.method).toBe('POST')
    expect(request?.url).toBe('https://api.example.test/items')
    expect(request?.credentials).toBe('omit')
    expect(request?.headers.get('content-type')).toBe('application/json')
    expect(request?.headers.get('authorization')).toBe('Bearer test-token-not-real')
    expect(await request?.text()).toBe('{"name":"Ada"}')
  })

  it('sends nothing for an invalid request', async () => {
    const transport = respondWith(() => jsonResponse({}))
    const result = await executeRequest(
      requestConfiguration({ url: 'javascript:alert(1)' }),
      options(transport),
    )
    expect(result).toMatchObject({ kind: 'invalid', errors: [{ field: 'url' }] })
    expect(transport).not.toHaveBeenCalled()
  })
})

describe('executeRequest: responses', () => {
  it('returns a success with a measured duration', async () => {
    const result = await executeRequest(
      requestConfiguration(),
      options(respondWith(() => jsonResponse({ id: 1 }, { headers: { 'x-request-id': 'abc' } }))),
    )
    expect(result).toMatchObject({
      kind: 'success',
      response: {
        status: 200,
        body: { kind: 'json', value: { id: 1 } },
        durationMs: 25,
        startedAt: '2026-11-08T10:00:00.000Z',
        sizeBytes: 8,
        headerExposure: 'all',
        contentType: 'application/json',
      },
    })
    if (result.kind === 'success') expect(result.response.headers).toContainEqual(['x-request-id', 'abc'])
  })

  it('returns a 404 as an HTTP error with its body, not as a failure', async () => {
    const result = await executeRequest(
      requestConfiguration(),
      options(
        respondWith(() => jsonResponse({ error: 'not found' }, { status: 404, statusText: 'Not Found' })),
      ),
    )
    expect(result).toMatchObject({ kind: 'http-error', response: { status: 404, statusText: 'Not Found' } })
  })

  it('handles 204 No Content', async () => {
    const result = await executeRequest(
      requestConfiguration({ method: 'DELETE' }),
      options(respondWith(() => new Response(null, { status: 204 }))),
    )
    expect(result).toMatchObject({
      kind: 'success',
      response: { status: 204, body: { kind: 'empty' }, sizeBytes: 0 },
    })
  })

  it('returns a parse failure for broken JSON and keeps the text', async () => {
    const result = await executeRequest(
      requestConfiguration(),
      options(respondWith(() => new Response('{"a":', { headers: { 'content-type': 'application/json' } }))),
    )
    expect(result).toMatchObject({
      kind: 'parse-failure',
      response: { body: { kind: 'text', text: '{"a":' } },
    })
  })

  it('reports cross-origin headers as filtered', async () => {
    const corsResponse = () => {
      const response = new Response('x', { headers: { 'content-type': 'text/plain' } })
      Object.defineProperty(response, 'type', { value: 'cors' })
      return response
    }
    const result = await executeRequest(requestConfiguration(), options(respondWith(corsResponse)))
    expect(result).toMatchObject({ kind: 'success', response: { headerExposure: 'cors-filtered' } })
  })
})

describe('executeRequest: failures', () => {
  it('turns a fetch TypeError into a network failure without inventing a status', async () => {
    const result = await executeRequest(requestConfiguration(), options(failWithNetworkError()))
    expect(result).toEqual({ kind: 'network-failure', durationMs: 25 })
  })

  it('never rejects, even when the transport throws something unexpected', async () => {
    const broken: Transport = () => {
      throw new Error('bug in a transport')
    }
    await expect(executeRequest(requestConfiguration(), options(broken))).resolves.toMatchObject({
      kind: 'network-failure',
    })
  })

  it('returns cancelled straight away when already cancelled, without sending', async () => {
    const transport = respondWith(() => jsonResponse({}))
    const controller = new AbortController()
    controller.abort(new RequestCancelledError())
    const result = await executeRequest(requestConfiguration(), {
      ...options(transport),
      signal: controller.signal,
    })
    expect(result).toEqual({ kind: 'cancelled' })
    expect(transport).not.toHaveBeenCalled()
  })

  it('returns cancelled when the user cancels while waiting', async () => {
    const controller = new AbortController()
    const pending = executeRequest(requestConfiguration(), {
      ...options(neverRespond()),
      signal: controller.signal,
    })
    controller.abort(new RequestCancelledError())
    await expect(pending).resolves.toEqual({ kind: 'cancelled' })
  })
})

describe('executeRequest: timeout', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('times out, and says so instead of reporting a cancel', async () => {
    const pending = executeRequest(requestConfiguration(), { ...options(neverRespond()), timeoutMs: 5000 })
    await vi.advanceTimersByTimeAsync(5000)
    await expect(pending).resolves.toEqual({ kind: 'timeout', timeoutMs: 5000 })
  })

  it('also times out while the body is still downloading', async () => {
    const response = () =>
      new Response(stallingBody([new TextEncoder().encode('{"partial":')]), {
        headers: { 'content-type': 'application/json' },
      })
    const pending = executeRequest(requestConfiguration(), {
      ...options(respondWith(response)),
      timeoutMs: 2000,
    })
    await vi.advanceTimersByTimeAsync(2000)
    await expect(pending).resolves.toEqual({ kind: 'timeout', timeoutMs: 2000 })
  })

  it('leaves no timer behind after success, failure or cancel', async () => {
    await executeRequest(requestConfiguration(), options(respondWith(() => jsonResponse({}))))
    expect(vi.getTimerCount()).toBe(0)

    await executeRequest(requestConfiguration(), options(failWithNetworkError()))
    expect(vi.getTimerCount()).toBe(0)

    const controller = new AbortController()
    const pending = executeRequest(requestConfiguration(), {
      ...options(neverRespond()),
      signal: controller.signal,
    })
    expect(vi.getTimerCount()).toBe(1)
    controller.abort(new RequestCancelledError())
    await pending
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('readBody', () => {
  const encoder = new TextEncoder()
  const never = new AbortController().signal

  it('reads a whole small body', async () => {
    expect(await readBody(new Response('héllo'), never)).toEqual({
      text: 'héllo',
      sizeBytes: 6,
      truncated: false,
    })
  })

  it('keeps a preview of a large body but reports its real size', async () => {
    const body = 'a'.repeat(50)
    expect(await readBody(new Response(body), never, 10)).toEqual({
      text: 'a'.repeat(10),
      sizeBytes: 50,
      truncated: true,
    })
  })

  it('is not fooled by a body exactly at the limit', async () => {
    expect(await readBody(new Response('abcd'), never, 4)).toEqual({
      text: 'abcd',
      sizeBytes: 4,
      truncated: false,
    })
  })

  it('does not end a preview with half a character', async () => {
    // "é" is two bytes; a 2-byte limit cuts it in half after "a".
    expect((await readBody(new Response('aé'), never, 2)).text).toBe('a')
  })

  it('decodes characters split across chunks', async () => {
    const bytes = encoder.encode('é')
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.subarray(0, 1))
        controller.enqueue(bytes.subarray(1))
        controller.close()
      },
    })
    expect((await readBody(new Response(stream), never)).text).toBe('é')
  })

  it('stops and throws the reason when aborted mid-download', async () => {
    const controller = new AbortController()
    const pending = readBody(new Response(stallingBody([encoder.encode('part')])), controller.signal)
    const reason = new RequestCancelledError()
    controller.abort(reason)
    await expect(pending).rejects.toBe(reason)
  })

  it('throws straight away when the signal is already aborted', async () => {
    const controller = new AbortController()
    const reason = new RequestCancelledError()
    controller.abort(reason)
    await expect(readBody(new Response('x'), controller.signal)).rejects.toBe(reason)
  })
})
