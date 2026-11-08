// Everything decided before a request goes out, in one pure function the UI calls on each render.

import type { RequestConfiguration } from '../../../domain/request'
import type { BuildWarning, FieldError } from '../../../domain/validation'
import { validateUrl } from '../../../domain/validation'
import { buildRequest } from '../../../http/buildRequest'
import { isBlockedMixedContent } from '../../../http/mixedContent'

export interface SendChecks {
  /** Block sending. Shown inline after the first send attempt. */
  errors: FieldError[]
  /** Shown, but sending is allowed. */
  warnings: BuildWarning[]
  /** Set when an https page targets an http URL the browser will block. */
  mixedContent: string | null
  /** Non-empty: ask the user to confirm before sending. */
  confirmReasons: string[]
}

export interface SendCheckOptions {
  confirmUnsafeMethods: boolean
  pageProtocol: string
}

export function getSendChecks(config: RequestConfiguration, options: SendCheckOptions): SendChecks {
  const built = buildRequest(config)
  const errors = built.ok ? [] : built.errors
  const warnings = built.warnings

  const url = validateUrl(config.url)
  const mixedContent =
    url.ok && isBlockedMixedContent(options.pageProtocol, url.url)
      ? 'Browsers block http:// requests from this https:// page. Use https:// if the server supports it.'
      : null

  const confirmReasons: string[] = []
  for (const warning of warnings) {
    if (warning.kind === 'private-network') confirmReasons.push(warning.message)
  }
  if (options.confirmUnsafeMethods && config.method !== 'GET') {
    confirmReasons.push(`${config.method} requests can change or delete data on the server.`)
  }

  return { errors, warnings, mixedContent, confirmReasons }
}

/** The UI tab that contains a field, so focus can be moved to the first error. */
export function tabOfField(field: FieldError['field']): 'params' | 'headers' | 'body' | null {
  switch (field) {
    case 'query':
      return 'params'
    case 'headers':
      return 'headers'
    case 'body':
    case 'formFields':
      return 'body'
    case 'url':
      return null
  }
}
