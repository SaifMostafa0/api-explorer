// One workspace's request lifecycle, outside React so it can be tested without rendering.
// The M4 hook owns one session, calls dispose() on unmount, and applies only `latest` outcomes.

import { RequestCancelledError } from '../../domain/errors'
import type { RequestConfiguration } from '../../domain/request'
import type { RequestResult } from '../../domain/response'
import { executeRequest, type ExecuteOptions } from './fetchClient'

export type RunOutcome =
  /** A request is already running (e.g. a double-click). Nothing was sent. */
  | { kind: 'busy' }
  /** This run was overtaken by a newer one, or the session was disposed. Don't show it. */
  | { kind: 'stale'; runId: number }
  | { kind: 'latest'; runId: number; result: RequestResult }

export interface RequestSession {
  send(config: RequestConfiguration): Promise<RunOutcome>
  cancel(): void
  dispose(): void
  readonly isRunning: boolean
}

export function createRequestSession(options: Omit<ExecuteOptions, 'signal'> = {}): RequestSession {
  // Every send gets the next id. A result is only "latest" if no send started after it, which
  // is what stops a slow, older response from replacing a newer one.
  let latestRunId = 0
  let inFlight: { runId: number; controller: AbortController } | null = null
  let disposed = false

  const cancel = () => {
    inFlight?.controller.abort(new RequestCancelledError())
    // Free the slot now, so Send works again at once even if the transport is slow to stop.
    inFlight = null
  }

  return {
    get isRunning() {
      return inFlight !== null
    },

    async send(config) {
      if (disposed) return { kind: 'stale', runId: latestRunId }
      // Double-click protection. Not a retry or a queue: a second click while running is dropped.
      if (inFlight) return { kind: 'busy' }

      const runId = ++latestRunId
      const controller = new AbortController()
      inFlight = { runId, controller }
      try {
        const result = await executeRequest(config, { ...options, signal: controller.signal })
        return !disposed && runId === latestRunId
          ? { kind: 'latest', runId, result }
          : { kind: 'stale', runId }
      } finally {
        if (inFlight?.runId === runId) inFlight = null
      }
    },

    cancel,

    dispose() {
      disposed = true
      cancel()
    },
  }
}
