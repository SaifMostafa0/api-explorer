import { useEffect, useMemo, useReducer, useState, type FormEvent } from 'react'
import { Tabs } from '../../../components/ui/Tabs'
import { HTTP_METHODS, type HttpMethod, type RequestConfiguration } from '../../../domain/request'
import type { BuildWarning, FieldError } from '../../../domain/validation'
import { BodyEditor } from '../components/BodyEditor'
import { ConfirmSendDialog } from '../components/ConfirmSendDialog'
import { BODY_TEXT_ID, URL_INPUT_ID, bodyModeInputId, rowInputId } from '../components/fieldIds'
import { KeyValueTable, type RowMessages } from '../components/KeyValueTable'
import { ResponseInspector } from '../../response-inspector/components/ResponseInspector'
import { useWorkspaceEnvironment } from '../environment'
import { SAMPLES } from '../samples'
import { useRequestRunner } from '../hooks/useRequestRunner'
import { getSendChecks, tabOfField } from '../state/sendChecks'
import {
  createInitialConfiguration,
  createRowId,
  rowsOf,
  workspaceReducer,
  type EditableRow,
  type RowTable,
} from '../state/workspaceState'
import styles from './WorkspacePage.module.css'

type TabId = 'params' | 'headers' | 'body'

export function WorkspacePage() {
  const environment = useWorkspaceEnvironment()
  const [config, dispatch] = useReducer(workspaceReducer, undefined, () => createInitialConfiguration())
  const { state, send, cancel } = useRequestRunner()
  const [tab, setTab] = useState<TabId>('params')
  const [showErrors, setShowErrors] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [loadedSample, setLoadedSample] = useState<string | null>(null)
  const [focusTarget, setFocusTarget] = useState<string | null>(null)

  const checks = useMemo(() => getSendChecks(config, environment), [config, environment])
  const errors = showErrors ? checks.errors : []
  const running = state.status === 'running'

  // Focus moves after render, once the right tab panel is visible.
  useEffect(() => {
    if (focusTarget === null) return
    document.getElementById(focusTarget)?.focus()
    setFocusTarget(null)
  }, [focusTarget])

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (running) return
    const [first] = checks.errors
    if (first) {
      setShowErrors(true)
      const errorTab = tabOfField(first.field)
      if (errorTab) setTab(errorTab)
      setFocusTarget(focusIdOf(first, config))
      return
    }
    if (checks.confirmReasons.length > 0) {
      setConfirming(true)
      return
    }
    void send(config)
  }

  const tableHandlers = (table: RowTable) => ({
    onAdd: () => {
      const id = createRowId()
      dispatch({ type: 'add-row', table, id })
      return id
    },
    onChange: (id: string, patch: Partial<Omit<EditableRow, 'id'>>) =>
      dispatch({ type: 'update-row', table, id, patch }),
    onRemove: (id: string) => dispatch({ type: 'remove-row', table, id }),
  })

  const urlError = errors.find((e) => e.field === 'url')?.message ?? null
  const bodyError = errors.find((e) => e.field === 'body')?.message ?? null
  const describedBy = [
    urlError ? 'request-url-error' : null,
    checks.mixedContent ? 'request-url-warning' : null,
  ]
    .filter(Boolean)
    .join(' ')

  const tabLabel = (text: string, count: number, hasErrors: boolean) => (
    <>
      {text}
      {count > 0 ? (
        <>
          {' '}
          <span className={styles.count}>{count}</span>
        </>
      ) : null}
      {hasErrors ? (
        <span className={styles.tabError}>
          {' '}
          <span aria-hidden="true">!</span>
          <span className="visually-hidden">, has errors</span>
        </span>
      ) : null}
    </>
  )
  const enabledCount = (table: RowTable) =>
    rowsOf(config, table).filter((r) => r.enabled && r.key !== '').length
  const hasErrors = (tabId: TabId) => errors.some((e) => tabOfField(e.field) === tabId)

  return (
    <section aria-labelledby="request-workspace-title" className={styles.workspace}>
      <div className={styles.header}>
        <h1 id="request-workspace-title" className={styles.heading}>
          Request workspace
        </h1>
        <div className={styles.samples}>
          <label htmlFor="sample-picker">Try a sample</label>
          <select
            id="sample-picker"
            value=""
            onChange={(event) => {
              const sample = SAMPLES.find((s) => s.id === event.target.value)
              if (!sample) return
              const request = sample.build()
              dispatch({ type: 'load', request })
              setShowErrors(false)
              setLoadedSample(sample.description)
              // Open the tab that shows what makes this sample interesting.
              setTab(request.bodyMode !== 'none' ? 'body' : request.headers.length > 0 ? 'headers' : 'params')
            }}
          >
            <option value="" disabled>
              Choose…
            </option>
            {SAMPLES.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      {loadedSample ? <p className={styles.sampleNote}>{loadedSample}</p> : null}

      <form onSubmit={onSubmit} noValidate className={styles.form} aria-busy={running}>
        <div className={styles.bar}>
          <label htmlFor="request-method" className="visually-hidden">
            Method
          </label>
          <select
            id="request-method"
            className={styles.method}
            value={config.method}
            onChange={(event) => dispatch({ type: 'set-method', method: event.target.value as HttpMethod })}
          >
            {HTTP_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>

          <label htmlFor={URL_INPUT_ID} className="visually-hidden">
            URL
          </label>
          <input
            id={URL_INPUT_ID}
            className={styles.url}
            type="url"
            inputMode="url"
            value={config.url}
            placeholder="https://api.example.com/resource"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={urlError ? true : undefined}
            aria-describedby={describedBy || undefined}
            onChange={(event) => dispatch({ type: 'set-url', url: event.target.value })}
          />

          {running ? (
            <button type="button" className={styles.cancel} onClick={cancel}>
              Cancel
            </button>
          ) : (
            <button type="submit" className={styles.send}>
              Send
            </button>
          )}
        </div>

        {urlError ? (
          <p id="request-url-error" className={styles.error}>
            {urlError}
          </p>
        ) : null}
        {checks.mixedContent ? (
          <p id="request-url-warning" className={styles.warning}>
            {checks.mixedContent}
          </p>
        ) : null}

        {errors.length > 0 ? (
          <div role="alert" className={styles.summary}>
            {errors.length === 1
              ? 'Fix 1 problem before sending.'
              : `Fix ${errors.length} problems before sending.`}
          </div>
        ) : null}

        <Tabs<TabId>
          label="Request"
          idPrefix="request"
          selected={tab}
          onSelect={setTab}
          items={[
            {
              id: 'params',
              label: tabLabel('Params', enabledCount('query'), hasErrors('params')),
              panel: (
                <>
                  <KeyValueTable
                    table="query"
                    noun="parameter"
                    rows={config.query}
                    messages={rowMessages(errors, checks.warnings, 'query')}
                    emptyText="No query parameters. Parameters already in the URL are kept as typed."
                    {...tableHandlers('query')}
                  />
                  <p className={styles.hint}>
                    Parameters here are added after any already in the URL. Repeated names are all sent, in
                    order.
                  </p>
                </>
              ),
            },
            {
              id: 'headers',
              label: tabLabel('Headers', enabledCount('headers'), hasErrors('headers')),
              panel: (
                <>
                  <KeyValueTable
                    table="headers"
                    noun="header"
                    rows={rowsOf(config, 'headers')}
                    messages={rowMessages(errors, checks.warnings, 'headers')}
                    emptyText="No custom headers."
                    {...tableHandlers('headers')}
                  />
                  <p className={styles.hint}>
                    Custom headers make the browser send a CORS preflight first. Cookies are never sent.
                  </p>
                </>
              ),
            },
            {
              id: 'body',
              label: tabLabel('Body', 0, hasErrors('body')),
              panel: (
                <BodyEditor
                  method={config.method}
                  mode={config.bodyMode}
                  body={config.body}
                  formFields={config.formFields}
                  error={bodyError}
                  formMessages={rowMessages(errors, checks.warnings, 'formFields')}
                  onModeChange={(mode) => dispatch({ type: 'set-body-mode', mode })}
                  onBodyChange={(body) => dispatch({ type: 'set-body', body })}
                  onAddField={tableHandlers('formFields').onAdd}
                  onChangeField={tableHandlers('formFields').onChange}
                  onRemoveField={tableHandlers('formFields').onRemove}
                />
              ),
            },
          ]}
        />
      </form>

      <ResponseInspector state={state} />

      {confirming ? (
        <ConfirmSendDialog
          method={config.method}
          url={config.url}
          reasons={checks.confirmReasons}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            void send(config)
          }}
        />
      ) : null}
    </section>
  )
}

/** The input to focus for an error: the URL bar, the row's name field, or the body editor. */
function focusIdOf(error: FieldError, config: RequestConfiguration): string {
  if (error.field === 'url') return URL_INPUT_ID
  if (error.field === 'body') {
    return config.bodyMode === 'json' || config.bodyMode === 'text'
      ? BODY_TEXT_ID
      : bodyModeInputId(config.bodyMode)
  }
  return error.rowId ? rowInputId(error.field, error.rowId, 'key') : URL_INPUT_ID
}

/** Errors and notes for one table, keyed by row id. */
function rowMessages(
  errors: FieldError[],
  warnings: BuildWarning[],
  table: RowTable,
): Map<string, RowMessages> {
  const messages = new Map<string, RowMessages>()
  const entry = (rowId: string) => {
    let found = messages.get(rowId)
    if (!found) messages.set(rowId, (found = { errors: [], notes: [] }))
    return found
  }
  for (const error of errors) {
    if (error.field === table && error.rowId) entry(error.rowId).errors.push(error.message)
  }
  if (table === 'headers') {
    for (const warning of warnings) {
      if (warning.kind === 'forbidden-header') entry(warning.rowId).notes.push(warning.message)
      if (warning.kind === 'duplicate-header') {
        for (const rowId of warning.rowIds) entry(rowId).notes.push(warning.message)
      }
    }
  }
  return messages
}
