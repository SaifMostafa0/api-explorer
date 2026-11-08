import { describe, expect, it } from 'vitest'
import { describeParse, formatBytes, formatDuration, formatJson, statusCategory } from './format'

describe('statusCategory', () => {
  it.each([
    [101, 'Informational', 'info'],
    [200, 'Success', 'ok'],
    [204, 'Success', 'ok'],
    [304, 'Redirect', 'info'],
    [404, 'Client error', 'error'],
    [500, 'Server error', 'error'],
    [599, 'Server error', 'error'],
  ] as const)('%i is %s', (status, label, tone) => {
    expect(statusCategory(status)).toEqual({ label, tone })
  })
})

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [150 * 1024, '150 KB'],
    [1024 * 1024, '1 MB'],
    [5.25 * 1024 * 1024, '5.3 MB'],
    [3 * 1024 ** 3, '3 GB'],
  ])('%d -> %s', (bytes, text) => expect(formatBytes(bytes)).toBe(text))
})

describe('formatDuration', () => {
  it.each([
    [0.4, '0 ms'],
    [439.6, '440 ms'],
    [1000, '1.0 s'],
    [1240, '1.24 s'],
    [30_000, '30.0 s'],
  ])('%d -> %s', (ms, text) => expect(formatDuration(ms)).toBe(text))
})

describe('describeParse', () => {
  it('has a plain description for every state', () => {
    for (const state of ['ok', 'not-json', 'json-error', 'truncated'] as const) {
      expect(describeParse(state)).not.toBe('')
    }
  })
})

describe('formatJson', () => {
  it('indents with two spaces and keeps falsy values', () => {
    expect(formatJson({ a: [1, false, null, 0, ''] })).toBe(
      '{\n  "a": [\n    1,\n    false,\n    null,\n    0,\n    ""\n  ]\n}',
    )
    expect(formatJson(false)).toBe('false')
    expect(formatJson(null)).toBe('null')
  })
})
