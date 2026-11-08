// The only module that talks to the network. Everything it needs to decide is delegated to pure
// functions (buildRequest, parseResponse, classify*); this file only does the I/O and the timing.

import type { RequestConfiguration } from '../../domain/request'
import type { HeaderExposure, RequestResult } from '../../domain/response'
import { buildRequest } from '../../http/buildRequest'
import { classifyFailure, classifyResponse } from '../../http/classifyError'
import { parseResponse } from '../../http/parseResponse'
import { DEFAULT_TIMEOUT_MS, clampTimeout, startTimeout } from './timeout'

/** Injected so tests never reach the network. Must reject when `signal` aborts, as fetch does. */
export type Transport = (request: Request, signal: AbortSignal) => Promise<Response>

export const fetchTransport: Transport = (request, signal) => fetch(request, { signal })

/** Bodies larger than this are counted but only this much is kept for the preview. */
export const MAX_PREVIEW_BYTES = 1024 * 1024

export interface ExecuteOptions {
  transport?: Transport
  timeoutMs?: number
  /** Aborting this cancels the request (the Cancel button). */
  signal?: AbortSignal
  /** Injected for deterministic tests. */
  now?: () => number
  clock?: () => Date
}

/** Never rejects: every outcome, including an unexpected bug, comes back as a RequestResult. */
export async function executeRequest(
  config: RequestConfiguration,
  options: ExecuteOptions = {},
): Promise<RequestResult> {
  const {
    transport = fetchTransport,
    signal: cancelSignal,
    now = () => performance.now(),
    clock = () => new Date(),
  } = options
  const timeoutMs = clampTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  const built = buildRequest(config)
  if (!built.ok) return { kind: 'invalid', errors: built.errors }
  if (cancelSignal?.aborted) return { kind: 'cancelled' }

  // One controller for everything that can stop this request: the timer and the Cancel button.
  // The reason passed to abort() is what tells them apart later.
  const controller = new AbortController()
  const forwardCancel = () => controller.abort(cancelSignal?.reason)
  cancelSignal?.addEventListener('abort', forwardCancel, { once: true })
  const clearTimer = startTimeout(controller, timeoutMs)

  const startedAt = clock().toISOString()
  const t0 = now()
  try {
    const request = new Request(built.request.url, {
      method: built.request.method,
      headers: built.request.headers,
      body: built.request.body,
      credentials: 'omit', // never send the user's cookies for this site (docs/http-model.md)
      cache: 'no-store', // an API tool should always show a fresh response
    })
    const response = await transport(request, controller.signal)
    const body = await readBody(response, controller.signal)
    const durationMs = now() - t0

    return classifyResponse(
      parseResponse({
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers],
        headerExposure: headerExposureOf(response),
        finalUrl: response.url === '' ? null : response.url,
        startedAt,
        durationMs,
        sizeBytes: body.sizeBytes,
        text: body.text,
        truncated: body.truncated,
      }),
    )
  } catch {
    // The error itself is deliberately ignored: the browser gives the same opaque TypeError for
    // CORS, DNS and offline, and the signal tells timeout from cancel more reliably than the error.
    return classifyFailure(controller.signal, now() - t0)
  } finally {
    clearTimer()
    cancelSignal?.removeEventListener('abort', forwardCancel)
  }
}

function headerExposureOf(response: Response): HeaderExposure {
  // "cors": cross-origin, so the browser hides every header the server didn't expose.
  return response.type === 'cors' ? 'cors-filtered' : 'all'
}

export interface BodyRead {
  text: string
  sizeBytes: number
  truncated: boolean
}

/**
 * Reads the body once, as a stream: keeps the first `limit` bytes, counts the rest without
 * storing it, and stops as soon as `signal` aborts. Unlike response.text(), a huge body can't
 * fill memory, and the reported size is the real one. Throws the abort reason on abort.
 */
export async function readBody(
  response: Response,
  signal: AbortSignal,
  limit = MAX_PREVIEW_BYTES,
): Promise<BodyRead> {
  if (response.body === null) return { text: '', sizeBytes: 0, truncated: false }

  const reader = response.body.getReader()
  // Cancelling the reader makes a pending read() settle, so an abort mid-download is immediate
  // even with a transport that ignores the signal.
  const stop = () => void reader.cancel(signal.reason).catch(() => {})
  signal.addEventListener('abort', stop, { once: true })

  // UTF-8, the same decoding response.text() uses. `stream: true` keeps multi-byte characters
  // that are split across chunks intact.
  const decoder = new TextDecoder()
  let text = ''
  let kept = 0
  let sizeBytes = 0
  let truncated = false
  try {
    for (;;) {
      if (signal.aborted) throw signal.reason
      const { done, value } = await reader.read()
      if (signal.aborted) throw signal.reason
      if (done) break

      sizeBytes += value.byteLength
      const room = limit - kept
      if (room <= 0) {
        truncated = true
        continue
      }
      const slice = value.byteLength > room ? value.subarray(0, room) : value
      if (slice !== value) truncated = true
      text += decoder.decode(slice, { stream: true })
      kept += slice.byteLength
    }
    // A complete body: flush the decoder. A truncated one: drop a half character at the cut
    // instead of ending the preview with a replacement character.
    if (!truncated) text += decoder.decode()
    return { text, sizeBytes, truncated }
  } finally {
    signal.removeEventListener('abort', stop)
    reader.releaseLock()
  }
}
