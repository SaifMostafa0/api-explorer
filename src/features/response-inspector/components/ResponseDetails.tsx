import type { ResponseSnapshot } from '../../../domain/response'
import type { SentRequest } from '../../request-workspace/hooks/useRequestRunner'
import { MAX_PREVIEW_BYTES } from '../../../infrastructure/http/fetchClient'
import { describeParse, formatBytes, formatDuration } from '../format'
import styles from './ResponseInspector.module.css'

export function ResponseDetails({ request, response }: { request: SentRequest; response: ResponseSnapshot }) {
  const redirected = response.finalUrl !== null && response.finalUrl !== request.url
  const started = new Date(response.startedAt)

  return (
    <dl className={styles.details}>
      <dt>Request</dt>
      <dd>
        <code>
          {request.method} {request.url}
        </code>
      </dd>

      {redirected ? (
        <>
          <dt>Final URL</dt>
          <dd>
            <code>{response.finalUrl}</code> (the browser followed a redirect)
          </dd>
        </>
      ) : null}

      <dt>Status</dt>
      <dd>
        {response.status}
        {response.statusText
          ? ` ${response.statusText}`
          : ' (no status text: normal for HTTP/2 and later, which never send one)'}
      </dd>

      <dt>Started</dt>
      <dd>
        <time dateTime={response.startedAt}>{started.toLocaleString()}</time>
      </dd>

      <dt>Duration</dt>
      <dd>{formatDuration(response.durationMs)}, from sending until the whole body was read</dd>

      <dt>Body size</dt>
      <dd>
        {response.sizeBytes === null ? 'Unknown' : formatBytes(response.sizeBytes)}
        {response.sizeBytes !== null ? ' after decompression' : ''}
        {response.truncated ? `; only the first ${formatBytes(MAX_PREVIEW_BYTES)} was kept` : ''}
      </dd>

      <dt>Content type</dt>
      <dd>{response.contentType ?? 'None sent'}</dd>

      <dt>Body</dt>
      <dd>{response.body.kind === 'empty' ? 'Empty' : describeParse(response.parse)}</dd>

      <dt>Headers</dt>
      <dd>
        {response.headers.length} visible
        {response.headerExposure === 'cors-filtered'
          ? '; filtered by CORS, the server may have sent more'
          : ''}
      </dd>
    </dl>
  )
}
