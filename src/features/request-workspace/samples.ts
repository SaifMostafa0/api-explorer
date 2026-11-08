// Sample requests for the live demo. Rules (spec §7, amendment 3): public test APIs that allow
// CORS, nothing destructive, never a private or local address. Checked on 8 Nov 2026 with an
// Origin header: dummyjson.com and httpbin.org both answer with Access-Control-Allow-Origin.

import type { RequestConfiguration } from '../../domain/request'
import { createRowId } from './state/workspaceState'

export interface Sample {
  id: string
  title: string
  /** What the sample demonstrates. */
  description: string
  build: () => Pick<
    RequestConfiguration,
    'method' | 'url' | 'query' | 'headers' | 'bodyMode' | 'body' | 'formFields'
  >
}

const row = (key: string, value: string) => ({ id: createRowId(), key, value, enabled: true })
const header = (name: string, value: string) => ({ id: createRowId(), name, value, enabled: true })
const empty = { query: [], headers: [], bodyMode: 'none' as const, body: '', formFields: [] }

export const SAMPLES: Sample[] = [
  {
    id: 'json',
    title: 'GET a product (JSON)',
    description: 'A plain JSON response from DummyJSON.',
    build: () => ({ ...empty, method: 'GET', url: 'https://dummyjson.com/products/1' }),
  },
  {
    id: 'query',
    title: 'Search with query parameters',
    description: 'Parameters from the Params table are encoded and added to the URL.',
    build: () => ({
      ...empty,
      method: 'GET',
      url: 'https://dummyjson.com/products/search',
      query: [row('q', 'phone'), row('limit', '3'), row('select', 'title,price')],
    }),
  },
  {
    id: 'post',
    title: 'POST JSON (echoed back)',
    description: 'httpbin echoes the body it received. Nothing is stored.',
    build: () => ({
      ...empty,
      method: 'POST',
      url: 'https://httpbin.org/post',
      bodyMode: 'json',
      body: '{\n  "name": "Ada Lovelace",\n  "languages": ["en", "fr"],\n  "active": true\n}',
    }),
  },
  {
    id: 'headers',
    title: 'Custom header (CORS preflight)',
    description: 'A custom header makes the browser send an OPTIONS preflight first.',
    build: () => ({
      ...empty,
      method: 'GET',
      url: 'https://httpbin.org/headers',
      headers: [header('X-Demo-Request', 'api-explorer'), header('Accept', 'application/json')],
    }),
  },
  {
    id: 'not-found',
    title: '404 Not Found',
    description: 'An HTTP error is still a real response, not a network failure.',
    build: () => ({ ...empty, method: 'GET', url: 'https://httpbin.org/status/404' }),
  },
  {
    id: 'slow',
    title: 'Slow response (5 s)',
    description: 'Time to press Cancel, or lower the timeout to see it time out.',
    build: () => ({ ...empty, method: 'GET', url: 'https://httpbin.org/delay/5' }),
  },
]
