import type { HeaderEntry, QueryParameter, RequestConfiguration } from '../../domain/request'

let nextId = 0

export const queryRow = (key: string, value: string, enabled = true): QueryParameter => ({
  id: `q${nextId++}`,
  key,
  value,
  enabled,
})

export const headerRow = (name: string, value: string, enabled = true): HeaderEntry => ({
  id: `h${nextId++}`,
  name,
  value,
  enabled,
})

export function requestConfiguration(overrides: Partial<RequestConfiguration> = {}): RequestConfiguration {
  return {
    id: 'r1',
    name: 'Test',
    method: 'GET',
    url: 'https://api.example.test/items',
    query: [],
    headers: [],
    bodyMode: 'none',
    body: '',
    formFields: [],
    createdAt: '2026-11-08T00:00:00.000Z',
    updatedAt: '2026-11-08T00:00:00.000Z',
    ...overrides,
  }
}
