// What came back, or why nothing did. One short sentence is announced to screen readers per
// outcome; the body itself is never put in a live region (spec §13).

import { useState, type ReactNode } from 'react'
import { Tabs } from '../../../components/ui/Tabs'
import { NETWORK_FAILURE_CAUSES } from '../../../domain/errors'
import type { RequestResult, ResponseSnapshot } from '../../../domain/response'
import type { RunState } from '../../request-workspace/hooks/useRequestRunner'
import { formatBytes, formatDuration, statusCategory } from '../format'
import { ResponseBody } from './ResponseBody'
import { ResponseDetails } from './ResponseDetails'
import { ResponseHeaders } from './ResponseHeaders'
import styles from './ResponseInspector.module.css'

type TabId = 'body' | 'headers' | 'details'

export function ResponseInspector({ state }: { state: RunState }) {
  const [tab, setTab] = useState<TabId>('body')

  return (
    <section className={styles.inspector} aria-labelledby="response-title">
      <h2 id="response-title" className={styles.title}>
        Response
      </h2>
      <p role="status" aria-label="Request status" className="visually-hidden">
        {announce(state)}
      </p>

      {state.status === 'idle' ? (
        <p className={styles.muted}>Send a request to see the response here.</p>
      ) : null}

      {state.status === 'running' ? (
        <p className={styles.running}>
          Sending{' '}
          <code>
            {state.request.method} {state.request.url}
          </code>
          …
        </p>
      ) : null}

      {state.status === 'finished' ? (
        <Outcome result={state.result} request={state.request} tab={tab} onTab={setTab} />
      ) : null}
    </section>
  )
}

function Outcome({
  result,
  request,
  tab,
  onTab,
}: {
  result: RequestResult
  request: Extract<RunState, { status: 'finished' }>['request']
  tab: TabId
  onTab: (tab: TabId) => void
}) {
  switch (result.kind) {
    case 'success':
    case 'http-error':
    case 'parse-failure': {
      const { response } = result
      const parseMessage = result.kind === 'parse-failure' ? result.message : null
      return (
        <>
          <StatusBar response={response} />
          <Tabs<TabId>
            label="Response"
            idPrefix="response"
            selected={tab}
            onSelect={onTab}
            items={[
              {
                id: 'body',
                label: 'Body',
                // Keyed by run, so view toggles and "show everything" reset for a new response.
                panel: (
                  <ResponseBody key={response.startedAt} response={response} parseMessage={parseMessage} />
                ),
              },
              {
                id: 'headers',
                label: (
                  <>
                    Headers <span className={styles.count}>{response.headers.length}</span>
                  </>
                ),
                panel: <ResponseHeaders response={response} />,
              },
              {
                id: 'details',
                label: 'Details',
                panel: <ResponseDetails request={request} response={response} />,
              },
            ]}
          />
        </>
      )
    }
    case 'network-failure':
      return (
        <Failure title="Network error">
          <p>
            No response was received after {formatDuration(result.durationMs)}. The browser doesn't say why.
            Common causes:
          </p>
          <ul>
            {NETWORK_FAILURE_CAUSES.map((cause) => (
              <li key={cause.id}>
                <strong>{cause.title}.</strong> {cause.detail}
              </li>
            ))}
          </ul>
        </Failure>
      )
    case 'timeout':
      return (
        <Failure title="Timed out">
          <p>
            No response within {formatDuration(result.timeoutMs)}. The server may be slow or unreachable. The
            request was stopped; nothing is retried automatically.
          </p>
        </Failure>
      )
    case 'cancelled':
      return (
        <Failure title="Cancelled" tone="neutral">
          <p>You stopped the request before a response arrived.</p>
        </Failure>
      )
    case 'invalid':
      return (
        <Failure title="Not sent">
          <p>Fix the errors in the request first.</p>
        </Failure>
      )
  }
}

function StatusBar({ response }: { response: ResponseSnapshot }) {
  const category = statusCategory(response.status)
  return (
    <div className={styles.statusBar}>
      <span className={styles.badge} data-tone={category.tone}>
        {response.status}
        {response.statusText ? ` ${response.statusText}` : ''}
      </span>
      <span className={styles.category}>{category.label}</span>
      <span className={styles.meta}>
        <span className="visually-hidden">Time: </span>
        {formatDuration(response.durationMs)}
      </span>
      {response.sizeBytes !== null ? (
        <span className={styles.meta}>
          <span className="visually-hidden">Size: </span>
          {formatBytes(response.sizeBytes)}
          {response.truncated ? ' (preview)' : ''}
        </span>
      ) : null}
    </div>
  )
}

function Failure({
  title,
  tone = 'error',
  children,
}: {
  title: string
  tone?: 'error' | 'neutral'
  children: ReactNode
}) {
  return (
    <div className={styles.failure} data-tone={tone}>
      <h3 className={styles.failureTitle}>{title}</h3>
      {children}
    </div>
  )
}

/** One sentence per outcome for the live region. */
function announce(state: RunState): string {
  if (state.status === 'idle') return 'No request sent yet.'
  if (state.status === 'running') return 'Sending request…'
  const { result } = state
  const line = (response: ResponseSnapshot) =>
    `${response.status}${response.statusText ? ` ${response.statusText}` : ''} in ${formatDuration(response.durationMs)}`
  switch (result.kind) {
    case 'success':
      return `Success: ${line(result.response)}`
    case 'http-error':
      return `HTTP error: ${line(result.response)}`
    case 'parse-failure':
      return `Response isn't valid JSON: ${line(result.response)}`
    case 'network-failure':
      return 'Network error: no response was received.'
    case 'timeout':
      return `Timed out after ${result.timeoutMs / 1000} s with no response.`
    case 'cancelled':
      return 'Cancelled. No response was received.'
    case 'invalid':
      return 'Not sent: fix the errors above.'
  }
}
