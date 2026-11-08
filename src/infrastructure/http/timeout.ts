import { RequestTimeoutError } from '../../domain/errors'

export const DEFAULT_TIMEOUT_MS = 30_000
export const MIN_TIMEOUT_MS = 1_000
export const MAX_TIMEOUT_MS = 120_000

/** Settings validates the range for the user; this keeps a bad value from reaching setTimeout. */
export function clampTimeout(ms: number): number {
  if (!Number.isFinite(ms)) return DEFAULT_TIMEOUT_MS
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.round(ms)))
}

/**
 * Aborts `controller` with a RequestTimeoutError after `ms`. Returns the function that clears
 * the timer; call it in `finally` so no timer outlives its request.
 */
export function startTimeout(controller: AbortController, ms: number): () => void {
  const timer = setTimeout(() => controller.abort(new RequestTimeoutError(ms)), ms)
  return () => clearTimeout(timer)
}
