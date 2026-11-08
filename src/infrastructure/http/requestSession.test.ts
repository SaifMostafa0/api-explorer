import { describe, expect, it } from 'vitest'
import {
  deferredTransport,
  jsonResponse,
  neverRespond,
  respondWith,
} from '../../test/factories/fakeTransport'
import { requestConfiguration } from '../../test/factories/requestConfiguration'
import { createRequestSession } from './requestSession'

describe('createRequestSession', () => {
  it('runs a request and returns it as the latest result', async () => {
    const session = createRequestSession({ transport: respondWith(() => jsonResponse({ n: 1 })) })
    const outcome = await session.send(requestConfiguration())
    expect(outcome).toMatchObject({ kind: 'latest', runId: 1, result: { kind: 'success' } })
    expect(session.isRunning).toBe(false)
  })

  it('drops a second send while one is running (double-click protection)', async () => {
    const transport = neverRespond()
    const session = createRequestSession({ transport })
    const first = session.send(requestConfiguration())
    expect(session.isRunning).toBe(true)

    await expect(session.send(requestConfiguration())).resolves.toEqual({ kind: 'busy' })
    expect(transport).toHaveBeenCalledTimes(1)

    session.cancel()
    await expect(first).resolves.toMatchObject({ kind: 'latest', result: { kind: 'cancelled' } })
  })

  it('a slow response from a cancelled run cannot overwrite the newer run', async () => {
    const { transport, resolve } = deferredTransport() // ignores the abort, like a slow network
    const session = createRequestSession({ transport })

    const first = session.send(requestConfiguration({ url: 'https://api.example.test/slow' }))
    session.cancel()
    const second = session.send(requestConfiguration({ url: 'https://api.example.test/fast' }))

    resolve(1, jsonResponse({ run: 'second' }))
    resolve(0, jsonResponse({ run: 'first' }))

    await expect(second).resolves.toMatchObject({
      kind: 'latest',
      runId: 2,
      result: { kind: 'success', response: { body: { value: { run: 'second' } } } },
    })
    await expect(first).resolves.toEqual({ kind: 'stale', runId: 1 })
  })

  it('cancel frees the slot immediately, so Send works again', async () => {
    const session = createRequestSession({ transport: neverRespond() })
    void session.send(requestConfiguration())
    session.cancel()
    expect(session.isRunning).toBe(false)
  })

  it('after dispose (unmount), nothing is reported as latest and nothing new is sent', async () => {
    const transport = neverRespond()
    const session = createRequestSession({ transport })
    const running = session.send(requestConfiguration())

    session.dispose()
    await expect(running).resolves.toEqual({ kind: 'stale', runId: 1 })
    await expect(session.send(requestConfiguration())).resolves.toMatchObject({ kind: 'stale' })
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('cancel with nothing running is harmless', () => {
    const session = createRequestSession({ transport: neverRespond() })
    expect(() => session.cancel()).not.toThrow()
  })
})
