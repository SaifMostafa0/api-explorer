// Connects the M3 RequestSession to React state. All the hard parts (stale results, double
// clicks, timers) live in the session; this hook only decides what to show.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { HttpMethod, RequestConfiguration } from '../../../domain/request'
import { buildRequest } from '../../../http/buildRequest'
import type { RequestResult } from '../../../domain/response'
import { createRequestSession, type RequestSession } from '../../../infrastructure/http/requestSession'
import { useWorkspaceEnvironment } from '../environment'

/** What was sent, as built (params appended), for the inspector's Details tab. */
export interface SentRequest {
  method: HttpMethod
  url: string
}

export type RunState =
  | { status: 'idle' }
  | { status: 'running'; request: SentRequest }
  | { status: 'finished'; request: SentRequest; result: RequestResult }

export function useRequestRunner() {
  const { transport, timeoutMs } = useWorkspaceEnvironment()
  const sessionRef = useRef<RequestSession | null>(null)
  const [state, setState] = useState<RunState>({ status: 'idle' })

  // Created in an effect, not during render, so StrictMode's mount/unmount/mount gets a fresh
  // session each time instead of reusing a disposed one. Dispose on unmount: a response that
  // arrives later is then reported as stale and never touches state.
  useEffect(() => {
    const session = createRequestSession({ transport, timeoutMs })
    sessionRef.current = session
    return () => {
      session.dispose()
      sessionRef.current = null
    }
  }, [transport, timeoutMs])

  const send = useCallback(async (config: RequestConfiguration) => {
    const session = sessionRef.current
    if (!session || session.isRunning) return
    const built = buildRequest(config)
    const request = { method: config.method, url: built.ok ? built.request.url : config.url }
    const outcome = session.send(config)
    setState({ status: 'running', request })
    const settled = await outcome
    // `stale` and `busy` are dropped on purpose: only the newest run may change the screen.
    if (settled.kind === 'latest') setState({ status: 'finished', request, result: settled.result })
  }, [])

  const cancel = useCallback(() => sessionRef.current?.cancel(), [])

  return { state, send, cancel }
}
