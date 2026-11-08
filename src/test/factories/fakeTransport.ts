// Deterministic transports for tests (docs/testing-strategy.md). Each one records the requests it
// was given, so tests can assert on exactly what would have been sent.

import { vi } from 'vitest'
import type { Transport } from '../../infrastructure/http/fetchClient'

/** Like fetch: rejects with the signal's reason when aborted. */
function rejectOnAbort(signal: AbortSignal, reject: (reason: unknown) => void) {
  if (signal.aborted) reject(signal.reason)
  signal.addEventListener('abort', () => reject(signal.reason), { once: true })
}

/** Responds with a fresh Response each call (a Response body can only be read once). */
export function respondWith(makeResponse: () => Response) {
  return vi.fn<Transport>((_request, signal) =>
    signal.aborted ? Promise.reject(signal.reason) : Promise.resolve(makeResponse()),
  )
}

export const jsonResponse = (value: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(value), {
    status: 200,
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  })

/** What fetch does for CORS, DNS, offline and mixed content alike. */
export function failWithNetworkError() {
  return vi.fn<Transport>(() => Promise.reject(new TypeError('Failed to fetch')))
}

/** Never answers. Only an abort (timeout or cancel) ends it. */
export function neverRespond() {
  return vi.fn<Transport>(
    (_request, signal) => new Promise<Response>((_resolve, reject) => rejectOnAbort(signal, reject)),
  )
}

/**
 * Ignores the signal and answers only when the test calls `resolve`. Models a slow response that
 * arrives after the user has already moved on, for stale-result tests.
 */
export function deferredTransport() {
  const pending: ((response: Response) => void)[] = []
  const transport = vi.fn<Transport>(() => new Promise<Response>((resolve) => pending.push(resolve)))
  return {
    transport,
    /** Resolves the n-th call (0-based). */
    resolve(index: number, response: Response) {
      const settle = pending[index]
      if (!settle) throw new Error(`no pending call #${index}`)
      settle(response)
    },
  }
}

/** A body that arrives in chunks and then stalls until aborted: for mid-download aborts. */
export function stallingBody(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      // no close(): the rest never arrives
    },
  })
}
