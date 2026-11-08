import { describe, expect, it } from 'vitest'
import { buildRequest } from '../../http/buildRequest'
import { isPrivateNetworkHost } from '../../http/privateNetwork'
import { requestConfiguration } from '../../test/factories/requestConfiguration'
import { SAMPLES } from './samples'

describe('sample requests', () => {
  it.each(SAMPLES.map((s) => [s.id, s] as const))('%s builds without errors or warnings', (_id, sample) => {
    const result = buildRequest(requestConfiguration(sample.build()))
    expect(result.ok).toBe(true)
    expect(result.warnings).toEqual([])
  })

  it.each(SAMPLES.map((s) => [s.id, s] as const))('%s targets a public https host', (_id, sample) => {
    const url = new URL(sample.build().url)
    expect(url.protocol).toBe('https:')
    expect(isPrivateNetworkHost(url.hostname)).toBe(false)
    expect(['dummyjson.com', 'httpbin.org']).toContain(url.hostname)
  })

  it('never ships a destructive method', () => {
    for (const sample of SAMPLES) expect(['GET', 'POST']).toContain(sample.build().method)
  })

  it('gives every row a fresh id each time it is loaded', () => {
    const sample = SAMPLES.find((s) => s.id === 'query')
    const first = sample?.build().query.map((r) => r.id)
    const second = sample?.build().query.map((r) => r.id)
    expect(first).toHaveLength(3)
    expect(second).not.toEqual(first)
  })

  it('has unique ids', () => {
    expect(new Set(SAMPLES.map((s) => s.id)).size).toBe(SAMPLES.length)
  })
})
