// What the workspace needs from the outside world, injected through context so component tests
// can swap in a fake transport and the UI never calls fetch itself (docs/architecture.md).

import { createContext, useContext } from 'react'
import { fetchTransport, type Transport } from '../../infrastructure/http/fetchClient'
import { DEFAULT_TIMEOUT_MS } from '../../infrastructure/http/timeout'

export interface WorkspaceEnvironment {
  transport: Transport
  timeoutMs: number
  /** Ask before POST/PUT/PATCH/DELETE. On for the hosted demo (production builds). */
  confirmUnsafeMethods: boolean
  /** The page's own protocol, for the mixed-content warning. */
  pageProtocol: string
}

export const defaultEnvironment: WorkspaceEnvironment = {
  transport: fetchTransport,
  timeoutMs: DEFAULT_TIMEOUT_MS,
  confirmUnsafeMethods: import.meta.env.PROD,
  pageProtocol: typeof location === 'undefined' ? 'https:' : location.protocol,
}

export const WorkspaceEnvironmentContext = createContext<WorkspaceEnvironment>(defaultEnvironment)

export const useWorkspaceEnvironment = () => useContext(WorkspaceEnvironmentContext)
