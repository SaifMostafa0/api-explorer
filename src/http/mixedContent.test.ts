import { describe, expect, it } from 'vitest'
import { isBlockedMixedContent } from './mixedContent'

describe('isBlockedMixedContent', () => {
  it('flags http targets from an https page', () => {
    expect(isBlockedMixedContent('https:', new URL('http://api.example.test'))).toBe(true)
    expect(isBlockedMixedContent('https:', new URL('http://192.168.1.10'))).toBe(true)
  })

  it.each(['http://localhost:3000', 'http://app.localhost', 'http://127.0.0.1:8080', 'http://[::1]/'])(
    'allows the loopback target %s, which browsers treat as trustworthy',
    (url) => expect(isBlockedMixedContent('https:', new URL(url))).toBe(false),
  )

  it('does not flag https targets or http pages', () => {
    expect(isBlockedMixedContent('https:', new URL('https://api.example.test'))).toBe(false)
    expect(isBlockedMixedContent('http:', new URL('http://api.example.test'))).toBe(false)
  })
})
