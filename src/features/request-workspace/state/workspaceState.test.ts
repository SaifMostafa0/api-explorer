import { describe, expect, it } from 'vitest'
import {
  createInitialConfiguration,
  createRowId,
  rowsOf,
  workspaceReducer,
  type WorkspaceAction,
} from './workspaceState'

const initial = createInitialConfiguration(new Date('2026-11-08T10:00:00.000Z'))
const apply = (...actions: WorkspaceAction[]) => actions.reduce(workspaceReducer, initial)

describe('workspaceReducer', () => {
  it('starts empty, as a GET with no body', () => {
    expect(initial).toMatchObject({ method: 'GET', url: '', bodyMode: 'none', query: [], headers: [] })
    expect(initial.createdAt).toBe('2026-11-08T10:00:00.000Z')
  })

  it('sets method, URL, body mode and body', () => {
    const state = apply(
      { type: 'set-method', method: 'POST' },
      { type: 'set-url', url: 'https://api.example.test' },
      { type: 'set-body-mode', mode: 'json' },
      { type: 'set-body', body: '{}' },
    )
    expect(state).toMatchObject({
      method: 'POST',
      url: 'https://api.example.test',
      bodyMode: 'json',
      body: '{}',
    })
  })

  it('keeps the body when switching to GET, so nothing is lost', () => {
    const state = apply(
      { type: 'set-method', method: 'POST' },
      { type: 'set-body-mode', mode: 'json' },
      { type: 'set-body', body: '{"a":1}' },
      { type: 'set-method', method: 'GET' },
    )
    expect(state).toMatchObject({ method: 'GET', bodyMode: 'json', body: '{"a":1}' })
  })

  it('adds, edits, disables and removes query rows', () => {
    let state = apply(
      { type: 'add-row', table: 'query', id: 'a' },
      { type: 'add-row', table: 'query', id: 'b' },
    )
    state = workspaceReducer(state, {
      type: 'update-row',
      table: 'query',
      id: 'a',
      patch: { key: 'page', value: '2' },
    })
    state = workspaceReducer(state, {
      type: 'update-row',
      table: 'query',
      id: 'b',
      patch: { enabled: false },
    })
    expect(state.query).toEqual([
      { id: 'a', key: 'page', value: '2', enabled: true },
      { id: 'b', key: '', value: '', enabled: false },
    ])
    state = workspaceReducer(state, { type: 'remove-row', table: 'query', id: 'a' })
    expect(state.query.map((r) => r.id)).toEqual(['b'])
  })

  it('stores header keys as `name`, and reads them back as `key`', () => {
    const state = apply(
      { type: 'add-row', table: 'headers', id: 'h' },
      { type: 'update-row', table: 'headers', id: 'h', patch: { key: 'Accept', value: '*/*' } },
    )
    expect(state.headers).toEqual([{ id: 'h', name: 'Accept', value: '*/*', enabled: true }])
    expect(rowsOf(state, 'headers')).toEqual([{ id: 'h', key: 'Accept', value: '*/*', enabled: true }])
  })

  it('edits form fields independently of query params', () => {
    const state = apply(
      { type: 'add-row', table: 'formFields', id: 'f' },
      { type: 'update-row', table: 'formFields', id: 'f', patch: { key: 'user' } },
    )
    expect(state.formFields).toHaveLength(1)
    expect(state.query).toHaveLength(0)
  })

  it('loads a whole request but keeps id and timestamps', () => {
    const state = apply(
      { type: 'set-body', body: 'old' },
      {
        type: 'load',
        request: {
          method: 'POST',
          url: 'https://api.example.test',
          query: [],
          headers: [{ id: 'h', name: 'Accept', value: '*/*', enabled: true }],
          bodyMode: 'json',
          body: '{}',
          formFields: [],
        },
      },
    )
    expect(state).toMatchObject({ id: 'workspace', method: 'POST', body: '{}', createdAt: initial.createdAt })
    expect(state.headers).toHaveLength(1)
  })

  it('does not mutate the previous state', () => {
    const before = apply({ type: 'add-row', table: 'query', id: 'a' })
    workspaceReducer(before, { type: 'update-row', table: 'query', id: 'a', patch: { key: 'x' } })
    expect(before.query[0]?.key).toBe('')
  })
})

describe('createRowId', () => {
  it('never repeats', () => {
    const ids = new Set(Array.from({ length: 1000 }, createRowId))
    expect(ids.size).toBe(1000)
  })
})
