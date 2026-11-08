// Decides which RequestResult an outcome is. Pure.

import { RequestTimeoutError } from '../domain/errors'
import type { RequestResult } from '../domain/response'
import type { ParsedResponse } from './parseResponse'

/** A response came back: success, an HTTP error, or a body that claims JSON but isn't. */
export function classifyResponse({ snapshot, jsonError }: ParsedResponse): RequestResult {
  // A 4xx/5xx is a real answer from the server, so it wins over a parse problem. The snapshot
  // still says `parse: 'json-error'`, so the inspector can show both.
  if (snapshot.status >= 400) return { kind: 'http-error', response: snapshot }
  if (jsonError !== null) return { kind: 'parse-failure', response: snapshot, message: jsonError }
  return { kind: 'success', response: snapshot }
}

/**
 * No response. `fetch` rejects with an AbortError for both a timeout and a cancel, and with a
 * TypeError for every network-level failure (CORS, DNS, offline...). So the signal's *reason*
 * decides between timeout and cancel; the thrown error is only used when nothing aborted.
 */
export function classifyFailure(signal: AbortSignal, durationMs: number): RequestResult {
  if (signal.aborted) {
    const reason: unknown = signal.reason
    if (reason instanceof RequestTimeoutError) return { kind: 'timeout', timeoutMs: reason.timeoutMs }
    return { kind: 'cancelled' }
  }
  return { kind: 'network-failure', durationMs }
}
