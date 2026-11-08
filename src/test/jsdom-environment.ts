// Vitest's jsdom environment, with Node's own AbortController and AbortSignal kept.
//
// Why: jsdom replaces the global AbortController/AbortSignal, but `Request` and `fetch` still come
// from Node (undici). Node 22 accepted any signal-shaped object; Node 24 checks
// `instanceof AbortSignal` against its own class and throws for jsdom's. React Router builds a
// `Request` on every navigation, and the M3 transport builds one per send, so both need signals
// Node recognises.
//
// Cost: jsdom APIs that take a signal (e.g. addEventListener's `signal` option) would reject
// Node's signal. Nothing in the app or its tests uses those.

import { builtinEnvironments, type Environment } from 'vitest/environments'

const jsdom = builtinEnvironments.jsdom

export default {
  name: 'jsdom-native-abort',
  transformMode: 'web',
  async setup(global: typeof globalThis, options) {
    const { AbortController, AbortSignal } = global
    const environment = await jsdom.setup(global, options)
    global.AbortController = AbortController
    global.AbortSignal = AbortSignal
    return environment
  },
} satisfies Environment
