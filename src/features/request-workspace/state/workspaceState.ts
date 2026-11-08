// Every edit the workspace can make to a RequestConfiguration, as one pure reducer.
// Ids are passed in with the action (not generated here) so the reducer stays deterministic.

import type { HttpMethod, RequestBodyMode, RequestConfiguration } from '../../../domain/request'

/** The three editable tables. Headers store `name`; the other two store `key`. */
export type RowTable = 'query' | 'headers' | 'formFields'

/** One row as the table component sees it, whichever table it belongs to. */
export interface EditableRow {
  id: string
  key: string
  value: string
  enabled: boolean
}

export type WorkspaceAction =
  | { type: 'set-method'; method: HttpMethod }
  | { type: 'set-url'; url: string }
  | { type: 'set-body-mode'; mode: RequestBodyMode }
  | { type: 'set-body'; body: string }
  | { type: 'add-row'; table: RowTable; id: string }
  | { type: 'update-row'; table: RowTable; id: string; patch: Partial<Omit<EditableRow, 'id'>> }
  | { type: 'remove-row'; table: RowTable; id: string }

let rowCounter = 0
/** Unique within the page. Not crypto.randomUUID: that only exists in secure contexts. */
export const createRowId = () => `row-${Date.now().toString(36)}-${(rowCounter++).toString(36)}`

export function createInitialConfiguration(now = new Date()): RequestConfiguration {
  const timestamp = now.toISOString()
  return {
    id: 'workspace',
    name: 'Untitled request',
    method: 'GET',
    url: '',
    query: [],
    headers: [],
    bodyMode: 'none',
    body: '',
    formFields: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

/** Reads any table as EditableRows, so one table component serves all three. */
export function rowsOf(config: RequestConfiguration, table: RowTable): EditableRow[] {
  if (table === 'headers') return config.headers.map(({ name, ...rest }) => ({ ...rest, key: name }))
  return config[table]
}

export function workspaceReducer(state: RequestConfiguration, action: WorkspaceAction): RequestConfiguration {
  switch (action.type) {
    case 'set-method':
      // The body is kept even for GET/DELETE: buildRequest reports the conflict instead of
      // silently dropping what the user typed (spec §6).
      return { ...state, method: action.method }
    case 'set-url':
      return { ...state, url: action.url }
    case 'set-body-mode':
      return { ...state, bodyMode: action.mode }
    case 'set-body':
      return { ...state, body: action.body }
    case 'add-row':
      return updateTable(state, action.table, (rows) => [
        ...rows,
        { id: action.id, key: '', value: '', enabled: true },
      ])
    case 'update-row':
      return updateTable(state, action.table, (rows) =>
        rows.map((row) => (row.id === action.id ? { ...row, ...action.patch } : row)),
      )
    case 'remove-row':
      return updateTable(state, action.table, (rows) => rows.filter((row) => row.id !== action.id))
  }
}

function updateTable(
  state: RequestConfiguration,
  table: RowTable,
  change: (rows: EditableRow[]) => EditableRow[],
): RequestConfiguration {
  const rows = change(rowsOf(state, table))
  if (table === 'headers')
    return { ...state, headers: rows.map(({ key, ...rest }) => ({ ...rest, name: key })) }
  return { ...state, [table]: rows }
}
