import type { HttpMethod, RequestBodyMode } from '../../../domain/request'
import { METHODS_WITHOUT_BODY } from '../../../domain/request'
import type { EditableRow } from '../state/workspaceState'
import { KeyValueTable, type RowMessages } from './KeyValueTable'
import { BODY_TEXT_ID, bodyModeInputId } from './fieldIds'
import styles from './BodyEditor.module.css'

const MODES: { mode: RequestBodyMode; label: string }[] = [
  { mode: 'none', label: 'None' },
  { mode: 'json', label: 'JSON' },
  { mode: 'text', label: 'Text' },
  { mode: 'urlencoded', label: 'Form (URL-encoded)' },
]

interface BodyEditorProps {
  method: HttpMethod
  mode: RequestBodyMode
  body: string
  formFields: EditableRow[]
  error: string | null
  formMessages: Map<string, RowMessages>
  onModeChange: (mode: RequestBodyMode) => void
  onBodyChange: (body: string) => void
  onAddField: () => string
  onChangeField: (id: string, patch: Partial<Omit<EditableRow, 'id'>>) => void
  onRemoveField: (id: string) => void
}

export function BodyEditor(props: BodyEditorProps) {
  const { method, mode, body, error } = props
  const errorId = error ? 'request-body-error' : undefined
  const noBodyAllowed = METHODS_WITHOUT_BODY.has(method)

  return (
    <div className={styles.editor}>
      <fieldset className={styles.modes} aria-describedby={errorId}>
        <legend>Body type</legend>
        {MODES.map(({ mode: value, label }) => (
          <label key={value} className={styles.mode}>
            <input
              type="radio"
              id={bodyModeInputId(value)}
              name="body-mode"
              value={value}
              checked={mode === value}
              onChange={() => props.onModeChange(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {noBodyAllowed && mode !== 'none' ? (
        <p className={styles.hint}>
          {method} requests can't have a body. What you type is kept; set the type to None or choose another
          method before sending.
        </p>
      ) : null}

      {mode === 'json' || mode === 'text' ? (
        <>
          <label htmlFor={BODY_TEXT_ID} className={styles.label}>
            {mode === 'json' ? 'JSON body' : 'Text body'}
          </label>
          <textarea
            id={BODY_TEXT_ID}
            className={styles.textarea}
            value={body}
            rows={10}
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            placeholder={mode === 'json' ? '{\n  "name": "value"\n}' : ''}
            onChange={(event) => props.onBodyChange(event.target.value)}
          />
        </>
      ) : null}

      {mode === 'urlencoded' ? (
        <KeyValueTable
          table="formFields"
          noun="field"
          rows={props.formFields}
          messages={props.formMessages}
          emptyText="No form fields yet."
          onAdd={props.onAddField}
          onChange={props.onChangeField}
          onRemove={props.onRemoveField}
        />
      ) : null}

      {error ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
