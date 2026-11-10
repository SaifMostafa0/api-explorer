import vercelConfig from '../../vercel.json'
import { describe, expect, it } from 'vitest'

// Guards the security headers shipped by vercel.json (docs/security.md).
const config: {
  headers: { source: string; headers: { key: string; value: string }[] }[]
  rewrites: { source: string; destination: string }[]
} = vercelConfig
const header = (key: string) => config.headers[0]?.headers.find((h) => h.key === key)?.value ?? ''
const directive = (name: string) =>
  header('Content-Security-Policy')
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `))

describe('vercel.json', () => {
  it('lets the app call any https API and local dev servers, nothing else over http', () => {
    expect(directive('connect-src')).toBe('connect-src https: http://localhost:* http://127.0.0.1:*')
    expect(header('Content-Security-Policy')).not.toContain('[')
  })

  it('never allows inline or remote scripts, frames or plugins', () => {
    expect(directive('script-src')).toBe("script-src 'self'")
    expect(directive('frame-src')).toBe("frame-src 'none'")
    expect(directive('object-src')).toBe("object-src 'none'")
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'")
  })

  it('serves index.html for app routes but not for built assets', () => {
    const [rewrite] = config.rewrites
    expect(rewrite?.destination).toBe('/index.html')
    const pattern = new RegExp(`^${rewrite?.source ?? ''}$`)
    expect(pattern.test('/history')).toBe(true)
    expect(pattern.test('/assets/index-abc.js')).toBe(false)
  })
})
