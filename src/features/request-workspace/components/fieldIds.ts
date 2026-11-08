// DOM ids shared by the editors and by WorkspacePage, which moves focus to the first error.

import type { RequestBodyMode } from '../../../domain/request'
import type { RowTable } from '../state/workspaceState'

export const URL_INPUT_ID = 'request-url'
export const BODY_TEXT_ID = 'request-body'
export const bodyModeInputId = (mode: RequestBodyMode) => `body-mode-${mode}`
export const rowInputId = (table: RowTable, rowId: string, part: 'key' | 'value') =>
  `${table}-${rowId}-${part}`
