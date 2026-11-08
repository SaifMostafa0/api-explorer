// Editable key/value rows, shared by query params, headers and url-encoded form fields.
// Every input has its own label ("Parameter name 2"), errors are linked with aria-describedby,
// and focus goes somewhere sensible after adding or removing a row.

import { useEffect, useState } from 'react'
import type { EditableRow, RowTable } from '../state/workspaceState'
import { rowInputId } from './fieldIds'
import styles from './KeyValueTable.module.css'

export interface RowMessages {
  errors: string[]
  notes: string[]
}

interface KeyValueTableProps {
  table: RowTable
  /** Singular noun for labels: "parameter", "header", "field". */
  noun: string
  rows: EditableRow[]
  messages: Map<string, RowMessages>
  emptyText: string
  onAdd: () => string
  onChange: (id: string, patch: Partial<Omit<EditableRow, 'id'>>) => void
  onRemove: (id: string) => void
}

export function KeyValueTable({
  table,
  noun,
  rows,
  messages,
  emptyText,
  onAdd,
  onChange,
  onRemove,
}: KeyValueTableProps) {
  const [focusId, setFocusId] = useState<string | null>(null)
  const addButtonId = `${table}-add`

  useEffect(() => {
    if (focusId === null) return
    document.getElementById(focusId)?.focus()
    setFocusId(null)
  }, [focusId])

  const add = () => setFocusId(rowInputId(table, onAdd(), 'key'))

  const remove = (index: number, id: string) => {
    // Focus the row that moves into this place, else the one above, else the Add button.
    const neighbour = rows[index + 1] ?? rows[index - 1]
    onRemove(id)
    setFocusId(neighbour ? rowInputId(table, neighbour.id, 'key') : addButtonId)
  }

  const capitalised = noun.charAt(0).toUpperCase() + noun.slice(1)

  return (
    <div className={styles.table}>
      {rows.length === 0 ? <p className={styles.empty}>{emptyText}</p> : null}
      <ul className={styles.rows}>
        {rows.map((row, index) => {
          const n = index + 1
          const message = messages.get(row.id)
          const errorId = message?.errors.length ? `${table}-${row.id}-error` : undefined
          const noteId = message?.notes.length ? `${table}-${row.id}-note` : undefined
          const describedBy = [errorId, noteId].filter(Boolean).join(' ') || undefined
          const invalid = errorId !== undefined
          return (
            <li key={row.id} className={styles.row} data-disabled={!row.enabled || undefined}>
              <input
                type="checkbox"
                className={styles.toggle}
                checked={row.enabled}
                aria-label={`Send ${noun} ${n}`}
                onChange={(event) => onChange(row.id, { enabled: event.target.checked })}
              />
              <input
                id={rowInputId(table, row.id, 'key')}
                className={`${styles.input} ${styles.keyInput}`}
                value={row.key}
                placeholder="Name"
                aria-label={`${capitalised} name ${n}`}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => onChange(row.id, { key: event.target.value })}
              />
              <input
                id={rowInputId(table, row.id, 'value')}
                className={`${styles.input} ${styles.valueInput}`}
                value={row.value}
                placeholder="Value"
                aria-label={`${capitalised} value ${n}`}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => onChange(row.id, { value: event.target.value })}
              />
              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove ${noun} ${n}`}
                onClick={() => remove(index, row.id)}
              >
                Remove
              </button>
              {errorId ? (
                <p id={errorId} className={styles.error}>
                  {message?.errors.join(' ')}
                </p>
              ) : null}
              {noteId ? (
                <p id={noteId} className={styles.note}>
                  {message?.notes.join(' ')}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
      <button type="button" id={addButtonId} className={styles.add} onClick={add}>
        Add {noun}
      </button>
    </div>
  )
}
