// Text the inspector shows. Pure, so every wording is unit-tested.

import type { ParseState } from '../../domain/response'

/** A status in words, so meaning never depends on colour alone (WCAG 1.4.1). */
export function statusCategory(status: number): { label: string; tone: 'ok' | 'info' | 'error' } {
  if (status >= 500) return { label: 'Server error', tone: 'error' }
  if (status >= 400) return { label: 'Client error', tone: 'error' }
  if (status >= 300) return { label: 'Redirect', tone: 'info' }
  if (status >= 200) return { label: 'Success', tone: 'ok' }
  return { label: 'Informational', tone: 'info' }
}

/** Binary units, labelled the way browser dev tools do (1 KB = 1024 bytes). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  const rounded = value >= 100 ? Math.round(value).toString() : value.toFixed(1).replace(/\.0$/, '')
  return `${rounded} ${units[unit]}`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2).replace(/0$/, '')} s`
}

export function describeParse(parse: ParseState): string {
  switch (parse) {
    case 'ok':
      return 'Parsed'
    case 'not-json':
      return 'Shown as text (not a JSON content type)'
    case 'json-error':
      return 'Content type says JSON, but the body is not valid JSON'
    case 'truncated':
      return 'Not parsed: only a preview was kept'
  }
}

/** 2-space JSON, the same shape the user would get from most API docs. */
export function formatJson(value: unknown): string {
  // JSON.stringify(undefined) is undefined; a parsed JSON value can never be undefined, but the
  // type says unknown, so be safe.
  return JSON.stringify(value, null, 2) ?? String(value)
}

/** Above this many characters the body's first render is cut, with a button to show the rest. */
export const RENDER_LIMIT = 200_000
