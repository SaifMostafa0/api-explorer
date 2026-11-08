// The outcome of the last run, in words. The M5 response inspector replaces the body preview;
// the status line and its announcement stay.

import { NETWORK_FAILURE_CAUSES } from '../../../domain/errors'
import type { RequestResult, ResponseSnapshot } from '../../../domain/response'
import type { RunState } from '../hooks/useRequestRunner'
import styles from './ResultSummary.module.css'

/** Rendering a multi-megabyte string in one <pre> freezes the page; M5 adds a proper viewer. */
const PREVIEW_CHARS = 20_000

function summarise(state: RunState): { label: string; tone: 'neutral' | 'ok' | 'error' } {
  if (state.status === 'idle') return { label: 'No request sent yet.', tone: 'neutral' }
  if (state.status === 'running') return { label: 'Sending request…', tone: 'neutral' }
  const { result } = state
  switch (result.kind) {
    case 'success':
      return { label: `Success: ${statusLine(result.response)}`, tone: 'ok' }
    case 'http-error':
      return { label: `HTTP error: ${statusLine(result.response)}`, tone: 'error' }
    case 'parse-failure':
      return { label: `Response isn't valid JSON: ${statusLine(result.response)}`, tone: 'error' }
    case 'network-failure':
      return { label: 'Network error: no response was received.', tone: 'error' }
    case 'timeout':
      return { label: `Timed out after ${result.timeoutMs / 1000} s with no response.`, tone: 'error' }
    case 'cancelled':
      return { label: 'Cancelled. No response was received.', tone: 'neutral' }
    case 'invalid':
      return { label: 'Not sent: fix the errors above.', tone: 'error' }
  }
}

function statusLine(response: ResponseSnapshot) {
  const text = response.statusText ? ` ${response.statusText}` : ''
  return `${response.status}${text} in ${Math.round(response.durationMs)} ms`
}

export function ResultSummary({ state }: { state: RunState }) {
  const { label, tone } = summarise(state)
  const result = state.status === 'finished' ? state.result : null

  return (
    <section className={styles.result} aria-labelledby="result-title">
      <h2 id="result-title" className={styles.title}>
        Response
      </h2>
      {/* Polite, short and always mounted: announced on every change, never the whole body. */}
      <p role="status" className={styles.status} data-tone={tone}>
        {label}
      </p>
      {result ? <Details result={result} /> : null}
    </section>
  )
}

function Details({ result }: { result: RequestResult }) {
  if (result.kind === 'network-failure') {
    return (
      <div className={styles.details}>
        <p>The browser doesn't say why. Common causes:</p>
        <ul>
          {NETWORK_FAILURE_CAUSES.map((cause) => (
            <li key={cause.id}>
              <strong>{cause.title}.</strong> {cause.detail}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (result.kind === 'success' || result.kind === 'http-error' || result.kind === 'parse-failure') {
    const { body, truncated } = result.response
    if (body.kind === 'empty') return <p className={styles.details}>The response has no body.</p>
    const text = body.kind === 'json' ? JSON.stringify(body.value, null, 2) : body.text
    const cut = text.length > PREVIEW_CHARS
    return (
      <div className={styles.details}>
        {truncated || cut ? (
          <p className={styles.notice}>Showing the start of the response only. The full body is longer.</p>
        ) : null}
        {/* Text content only: React escapes it, so returned HTML or scripts are never run. */}
        <pre className={styles.body} tabIndex={0} aria-label="Response body">
          {cut ? text.slice(0, PREVIEW_CHARS) : text}
        </pre>
      </div>
    )
  }
  return null
}
