import { describe, expect, it } from 'vitest'

// Guards src/test/jsdom-environment.ts. If a Vitest or jsdom upgrade brings back jsdom's
// AbortSignal, this fails with the real cause instead of a confusing router error.
describe('test environment', () => {
  it('runs with a DOM', () => {
    expect(document.createElement('div')).toBeInstanceOf(HTMLElement)
  })

  it("gives Request a signal it accepts, and abort reaches the request's own signal", () => {
    const controller = new AbortController()
    const request = new Request('https://example.test/', { signal: controller.signal })
    expect(request.signal.aborted).toBe(false)

    controller.abort(new DOMException('cancelled by user', 'AbortError'))
    expect(request.signal.aborted).toBe(true)
    expect(request.signal.reason).toMatchObject({ name: 'AbortError', message: 'cancelled by user' })
  })
})
