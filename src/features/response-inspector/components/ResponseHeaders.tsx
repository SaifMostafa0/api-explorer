// Visible response headers. Distinguishes "the server sent none" from "the browser hid them",
// because under CORS JavaScript can only read the headers the server chose to expose.

import type { ResponseSnapshot } from '../../../domain/response'
import { CopyButton } from './CopyButton'
import styles from './ResponseInspector.module.css'

export function ResponseHeaders({ response }: { response: ResponseSnapshot }) {
  const { headers, headerExposure } = response
  const filtered = headerExposure === 'cors-filtered'

  return (
    <div className={styles.stack}>
      {filtered ? (
        <p className={styles.notice}>
          Cross-origin response: the browser only shows the headers the server lists in{' '}
          <code>Access-Control-Expose-Headers</code>, plus a few safe ones such as <code>Content-Type</code>.
          The server may have sent more.
        </p>
      ) : null}

      {headers.length === 0 ? (
        <p className={styles.muted}>
          {filtered ? 'No headers were exposed to this page.' : 'The server sent no headers.'}
        </p>
      ) : (
        <>
          <div className={styles.toolbar}>
            <CopyButton
              label="Copy headers"
              getText={() => headers.map(([name, value]) => `${name}: ${value}`).join('\n')}
            />
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="visually-hidden">
                {headers.length} response {headers.length === 1 ? 'header' : 'headers'}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {headers.map(([name, value], index) => (
                  // Names can repeat only if the browser reports them so; index keeps keys unique.
                  <tr key={`${name}-${index}`}>
                    <th scope="row">{name}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
