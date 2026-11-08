import { describe, expect, it } from 'vitest'
import { isPrivateNetworkHost } from './privateNetwork'

// Go through the real URL parser, exactly as buildRequest does.
const hostOf = (url: string) => new URL(url).hostname

describe('isPrivateNetworkHost', () => {
  it.each([
    'http://localhost:3000',
    'http://LOCALHOST./',
    'http://api.localhost',
    'http://printer.local',
    'http://127.0.0.1',
    'http://127.12.0.5',
    'http://0.0.0.0:8080',
    'http://10.1.2.3',
    'http://172.16.0.1',
    'http://172.31.255.255',
    'http://192.168.1.1',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]:8080',
    'http://[fd12:3456::1]',
    'http://[fe80::1]',
    'http://[::ffff:127.0.0.1]',
    'http://[::ffff:192.168.0.1]',
  ])('flags %s', (url) => {
    expect(isPrivateNetworkHost(hostOf(url))).toBe(true)
  })

  it.each(['http://2130706433', 'http://0x7f.1', 'http://127.1', 'http://0177.0.0.1'])(
    'flags the disguised loopback %s, because the URL parser normalises it',
    (url) => {
      expect(hostOf(url)).toBe('127.0.0.1')
      expect(isPrivateNetworkHost(hostOf(url))).toBe(true)
    },
  )

  it.each([
    'https://example.com',
    'https://jsonplaceholder.typicode.com',
    'http://8.8.8.8',
    'http://172.15.0.1',
    'http://172.32.0.1',
    'http://192.169.0.1',
    'http://[2001:4860:4860::8888]',
    'http://[::ffff:8.8.8.8]',
    'https://localhost.example.com',
  ])('allows public %s', (url) => {
    expect(isPrivateNetworkHost(hostOf(url))).toBe(false)
  })
})
