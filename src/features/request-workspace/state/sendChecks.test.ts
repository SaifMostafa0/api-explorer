import { describe, expect, it } from 'vitest'
import { headerRow, requestConfiguration } from '../../../test/factories/requestConfiguration'
import { getSendChecks, tabOfField } from './sendChecks'

const demo = { confirmUnsafeMethods: true, pageProtocol: 'https:' }
const local = { confirmUnsafeMethods: false, pageProtocol: 'http:' }

describe('getSendChecks', () => {
  it('a valid public GET needs nothing', () => {
    expect(getSendChecks(requestConfiguration(), demo)).toEqual({
      errors: [],
      warnings: [],
      mixedContent: null,
      confirmReasons: [],
    })
  })

  it('passes buildRequest errors and warnings through', () => {
    const checks = getSendChecks(
      requestConfiguration({ url: 'ftp://x', headers: [headerRow('Host', 'x')] }),
      local,
    )
    expect(checks.errors).toEqual([expect.objectContaining({ field: 'url' })])
    // buildRequest runs every step, so header warnings show up even when the URL is invalid.
    expect(checks.warnings).toEqual([expect.objectContaining({ kind: 'forbidden-header' })])
  })

  it('asks to confirm private-network targets everywhere', () => {
    const checks = getSendChecks(requestConfiguration({ url: 'http://localhost:3000' }), local)
    expect(checks.confirmReasons).toEqual([expect.stringContaining('localhost')])
  })

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)('asks to confirm %s on the demo only', (method) => {
    expect(getSendChecks(requestConfiguration({ method }), demo).confirmReasons).toEqual([
      `${method} requests can change or delete data on the server.`,
    ])
    expect(getSendChecks(requestConfiguration({ method }), local).confirmReasons).toEqual([])
  })

  it('warns about mixed content without blocking', () => {
    const checks = getSendChecks(requestConfiguration({ url: 'http://api.example.test' }), demo)
    expect(checks.mixedContent).toMatch(/block/)
    expect(checks.errors).toEqual([])
  })
})

describe('tabOfField', () => {
  it.each([
    ['url', null],
    ['query', 'params'],
    ['headers', 'headers'],
    ['body', 'body'],
    ['formFields', 'body'],
  ] as const)('%s is on %s', (field, tab) => expect(tabOfField(field)).toBe(tab))
})
