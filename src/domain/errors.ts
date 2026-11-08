// Abort reasons. Timeout and user cancel both abort the same AbortController; passing a different
// reason object to abort() is how we tell them apart afterwards.

export class RequestTimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`No response within ${timeoutMs / 1000} s.`)
    this.name = 'TimeoutError'
    this.timeoutMs = timeoutMs
  }
}

export class RequestCancelledError extends Error {
  constructor() {
    super('Cancelled.')
    this.name = 'AbortError'
  }
}

/**
 * Shown on every network failure. The browser deliberately hides which one it was (a CORS
 * rejection looks exactly like a DNS failure to JavaScript), so the UI lists them all and never
 * claims to know.
 */
export const NETWORK_FAILURE_CAUSES = [
  {
    id: 'cors',
    title: 'CORS',
    detail:
      "The server didn't allow requests from this site. Requests with custom headers, a JSON body, or PUT/PATCH/DELETE also need a preflight OPTIONS request to succeed.",
  },
  { id: 'offline', title: 'Offline', detail: 'Your device may have lost its connection.' },
  { id: 'dns', title: 'Unknown host', detail: 'The hostname may be misspelled or may not exist.' },
  {
    id: 'mixed-content',
    title: 'Mixed content',
    detail: 'An https:// page cannot call an http:// URL.',
  },
  {
    id: 'tls',
    title: 'Certificate problem',
    detail: "The server's TLS certificate may be invalid or self-signed.",
  },
] as const
