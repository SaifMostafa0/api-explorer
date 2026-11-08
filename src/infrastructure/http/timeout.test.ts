import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequestTimeoutError } from '../../domain/errors'
import { DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS, MIN_TIMEOUT_MS, clampTimeout, startTimeout } from './timeout'

describe('clampTimeout', () => {
  it.each([
    [5_000, 5_000],
    [10, MIN_TIMEOUT_MS],
    [999_999, MAX_TIMEOUT_MS],
    [1500.6, 1501],
    [Number.NaN, DEFAULT_TIMEOUT_MS],
    [Number.POSITIVE_INFINITY, DEFAULT_TIMEOUT_MS],
  ])('%d -> %d', (input, expected) => expect(clampTimeout(input)).toBe(expected))
})

describe('startTimeout', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('aborts with a timeout reason when the time is up', () => {
    const controller = new AbortController()
    startTimeout(controller, 2000)
    vi.advanceTimersByTime(1999)
    expect(controller.signal.aborted).toBe(false)
    vi.advanceTimersByTime(1)
    expect(controller.signal.reason).toBeInstanceOf(RequestTimeoutError)
    expect((controller.signal.reason as RequestTimeoutError).timeoutMs).toBe(2000)
  })

  it('leaves no timer behind once cleared', () => {
    const controller = new AbortController()
    const clear = startTimeout(controller, 2000)
    expect(vi.getTimerCount()).toBe(1)
    clear()
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(5000)
    expect(controller.signal.aborted).toBe(false)
  })
})
