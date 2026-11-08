// The request domain model. Pure data: no functions with side effects, no imports.
// The contract lives in docs/http-model.md; keep the two in sync.

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
export type HttpMethod = (typeof HTTP_METHODS)[number]

/** Methods that may not carry a body in the MVP (spec §6). */
export const METHODS_WITHOUT_BODY: ReadonlySet<HttpMethod> = new Set(['GET', 'DELETE'])

/** One editable row in the Params table (also reused for url-encoded form fields). */
export interface QueryParameter {
  id: string
  key: string
  value: string
  enabled: boolean
}

/** One editable row in the Headers table. */
export interface HeaderEntry {
  id: string
  name: string
  value: string
  enabled: boolean
}

export const REQUEST_BODY_MODES = ['none', 'json', 'text', 'urlencoded'] as const
export type RequestBodyMode = (typeof REQUEST_BODY_MODES)[number]

/** Everything the user has configured for one request, exactly as typed. */
export interface RequestConfiguration {
  id: string
  name: string
  method: HttpMethod
  url: string
  query: QueryParameter[]
  headers: HeaderEntry[]
  bodyMode: RequestBodyMode
  /** Raw editor text for `json` and `text` modes. */
  body: string
  /** Rows for `urlencoded` mode. */
  formFields: QueryParameter[]
  createdAt: string
  updatedAt: string
}

/**
 * What `buildRequest` hands to the transport: plain, serialisable data rather than a `Request`
 * object, so it is easy to assert on in tests and to show in the UI ("this is what will be sent").
 */
export interface BuiltRequest {
  method: HttpMethod
  url: string
  /** In send order. Duplicate names are already combined, forbidden ones already removed. */
  headers: [string, string][]
  body: string | null
}
