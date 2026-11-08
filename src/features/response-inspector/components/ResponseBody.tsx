// The body as text: formatted or raw JSON, or plain text. Never HTML: React escapes everything
// placed in <pre>, and nothing here uses dangerouslySetInnerHTML or an iframe.

import { useRef, useState } from 'react'
import type { ResponseSnapshot } from '../../../domain/response'
import { MAX_PREVIEW_BYTES } from '../../../infrastructure/http/fetchClient'
import { RENDER_LIMIT, formatBytes, formatJson } from '../format'
import { CopyButton } from './CopyButton'
import styles from './ResponseInspector.module.css'

interface ResponseBodyProps {
  response: ResponseSnapshot
  /** The JSON parse error, when there is one. */
  parseMessage: string | null
}

export function ResponseBody({ response, parseMessage }: ResponseBodyProps) {
  const [view, setView] = useState<'formatted' | 'raw'>('formatted')
  const [showAll, setShowAll] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)
  const { body } = response

  if (body.kind === 'empty') {
    return <p className={styles.muted}>The response has no body.</p>
  }

  const isJson = body.kind === 'json'
  const text = isJson && view === 'formatted' ? formatJson(body.value) : body.text
  const cut = !showAll && text.length > RENDER_LIMIT

  return (
    <div className={styles.stack}>
      {response.truncated ? (
        <p className={styles.notice}>
          Showing the first {formatBytes(MAX_PREVIEW_BYTES)} of{' '}
          {response.sizeBytes === null ? 'a larger body' : formatBytes(response.sizeBytes)}. The rest was not
          kept, so this is not the complete response.
        </p>
      ) : null}
      {response.parse === 'truncated' ? (
        <p className={styles.notice}>Not formatted as JSON: the preview is incomplete.</p>
      ) : null}
      {response.parse === 'json-error' ? (
        <p className={styles.notice}>
          The content type says JSON, but the body isn't valid JSON
          {parseMessage ? ` (${parseMessage})` : ''}. Showing the raw text.
        </p>
      ) : null}

      <div className={styles.toolbar}>
        {isJson ? (
          <div role="group" aria-label="Body view" className={styles.segmented}>
            <button type="button" aria-pressed={view === 'formatted'} onClick={() => setView('formatted')}>
              Formatted
            </button>
            <button type="button" aria-pressed={view === 'raw'} onClick={() => setView('raw')}>
              Raw
            </button>
          </div>
        ) : null}
        <CopyButton label="Copy body" getText={() => text} fallbackTarget={preRef} />
      </div>

      <pre ref={preRef} className={styles.code} tabIndex={0} aria-label="Response body">
        {cut ? text.slice(0, RENDER_LIMIT) : text}
      </pre>

      {cut ? (
        <p className={styles.notice}>
          Showing {RENDER_LIMIT.toLocaleString('en')} of {text.length.toLocaleString('en')} characters to keep
          the page responsive.{' '}
          <button type="button" className={styles.linkButton} onClick={() => setShowAll(true)}>
            Show everything
          </button>
        </p>
      ) : null}
    </div>
  )
}
