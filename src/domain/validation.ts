// Validators for user input. Every function returns a result object and never throws, so the
// caller can collect all problems at once and show them inline before anything is sent.

/** Which part of the form a problem belongs to. `rowId` points at a specific table row. */
export type FieldName = 'url' | 'query' | 'headers' | 'body' | 'formFields'

export interface FieldError {
  field: FieldName
  rowId?: string
  message: string
}

/** Things worth telling the user that don't block sending. */
export type BuildWarning =
  | { kind: 'forbidden-header'; rowId: string; name: string; message: string }
  | { kind: 'duplicate-header'; rowIds: string[]; name: string; message: string }
  | { kind: 'private-network'; host: string; message: string }

export type UrlValidation = { ok: true; url: URL } | { ok: false; message: string }

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export function validateUrl(input: string): UrlValidation {
  const trimmed = input.trim()
  if (trimmed === '') return { ok: false, message: 'Enter a URL.' }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, message: 'Enter an absolute URL that starts with http:// or https://.' }
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    // `localhost:3000` parses as scheme "localhost:" with path "3000". Saying "unsupported scheme
    // localhost" would confuse people, so name the real mistake instead.
    if (/^[^:/]+:\d/.test(trimmed)) {
      return { ok: false, message: `Add a scheme, for example http://${trimmed}.` }
    }
    return {
      ok: false,
      message: `"${url.protocol}" URLs aren't supported. Only http:// and https:// can be sent.`,
    }
  }

  if (url.username !== '' || url.password !== '') {
    return {
      ok: false,
      message: 'Remove the username and password from the URL. Send credentials in an Authorization header.',
    }
  }

  return { ok: true, url }
}

// RFC 9110 §5.6.2: token = 1*tchar
const HEADER_NAME_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/

export type SimpleValidation = { ok: true } | { ok: false; message: string }

export function validateHeaderName(name: string): SimpleValidation {
  if (name === '') return { ok: false, message: 'Enter a header name.' }
  if (name.endsWith(':')) {
    return { ok: false, message: 'Remove the ":" from the name. Put the value in the value field.' }
  }
  if (/\s/.test(name)) return { ok: false, message: "Header names can't contain spaces." }
  if (!HEADER_NAME_TOKEN.test(name)) {
    return { ok: false, message: "Header names can only use letters, digits and !#$%&'*+-.^_`|~." }
  }
  return { ok: true }
}

export function validateHeaderValue(value: string): SimpleValidation {
  // fetch() throws a TypeError for these; catching them here gives a message instead.
  if (/[\r\n\0]/.test(value)) {
    return { ok: false, message: "Header values can't contain line breaks or null characters." }
  }
  // Header values are byte strings. Characters above U+00FF can't be represented and make
  // fetch() throw, so emoji or Arabic text must be encoded by the user first.
  for (const char of value) {
    if ((char.codePointAt(0) ?? 0) > 0xff) {
      return {
        ok: false,
        message: 'Header values can only contain Latin-1 characters. Encode other text first.',
      }
    }
  }
  return { ok: true }
}

// Fetch standard "forbidden request-header" names. The browser silently drops these, so we flag
// them up front instead of letting the user believe they were sent.
const FORBIDDEN_HEADER_NAMES = new Set([
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie',
  'cookie2',
  'date',
  'dnt',
  'expect',
  'host',
  'keep-alive',
  'origin',
  'referer',
  'set-cookie',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'via',
])

export function isForbiddenHeaderName(name: string): boolean {
  const lower = name.toLowerCase()
  return FORBIDDEN_HEADER_NAMES.has(lower) || lower.startsWith('proxy-') || lower.startsWith('sec-')
}

export type JsonValidation =
  { ok: true } | { ok: false; message: string; position?: number; line?: number; column?: number }

export function validateJsonBody(text: string): JsonValidation {
  if (text.trim() === '') {
    return { ok: false, message: 'Enter a JSON body, or set the body type to None.' }
  }
  try {
    JSON.parse(text)
    return { ok: true }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return { ok: false, message: `Invalid JSON: ${detail}`, ...locateJsonError(text, detail) }
  }
}

/**
 * Engines word JSON errors differently. V8 says "at position 12" and, in newer versions, also
 * "(line 2 column 5)". Firefox says "at line 2 column 5". Read whichever is there.
 */
function locateJsonError(
  text: string,
  message: string,
): { position?: number; line?: number; column?: number } {
  const lineColumn = /line (\d+) column (\d+)/.exec(message)
  const position = /position (\d+)/.exec(message)
  if (lineColumn?.[1] && lineColumn[2]) {
    const result = { line: Number(lineColumn[1]), column: Number(lineColumn[2]) }
    return position?.[1] ? { ...result, position: Number(position[1]) } : result
  }
  if (position?.[1]) return fromOffset(text, Number(position[1]))
  // "Unexpected end of JSON input": the problem is, by definition, at the end.
  if (/unexpected end/i.test(message)) return fromOffset(text, text.length)
  // Some errors ("Unexpected token ']'") carry no location. We say nothing rather than guess.
  return {}
}

function fromOffset(text: string, offset: number) {
  const before = text.slice(0, offset).split('\n')
  return { position: offset, line: before.length, column: (before[before.length - 1]?.length ?? 0) + 1 }
}
