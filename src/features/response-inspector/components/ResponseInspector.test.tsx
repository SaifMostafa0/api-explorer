import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RequestResult } from '../../../domain/response'
import { classifyResponse } from '../../../http/classifyError'
import { parseResponse, type RawResponse } from '../../../http/parseResponse'
import type { RunState } from '../../request-workspace/hooks/useRequestRunner'
import { RENDER_LIMIT } from '../format'
import { ResponseInspector } from './ResponseInspector'

const request = { method: 'GET' as const, url: 'https://api.example.test/items' }

/** A result built by the real parser and classifier, so the UI sees exactly what M3 produces. */
function resultFor(overrides: Partial<RawResponse> = {}): RequestResult {
  return classifyResponse(
    parseResponse({
      status: 200,
      statusText: 'OK',
      headers: [
        ['content-type', 'application/json'],
        ['x-request-id', 'abc'],
      ],
      headerExposure: 'all',
      finalUrl: request.url,
      startedAt: '2026-11-08T10:00:00.000Z',
      durationMs: 439.4,
      sizeBytes: 1536,
      text: '{"id":7,"done":false}',
      truncated: false,
      ...overrides,
    }),
  )
}

const finished = (result: RequestResult): RunState => ({ status: 'finished', request, result })

function renderInspector(state: RunState) {
  const user = userEvent.setup()
  return { user, ...render(<ResponseInspector state={state} />) }
}

const announcement = () => screen.getByRole('status', { name: 'Request status' })
const body = () => screen.getByLabelText('Response body')

afterEach(() => vi.restoreAllMocks())

describe('states before a response', () => {
  it('invites a first request', () => {
    renderInspector({ status: 'idle' })
    expect(screen.getByText('Send a request to see the response here.')).toBeInTheDocument()
    expect(announcement()).toHaveTextContent('No request sent yet.')
  })

  it('says what is being sent while running', () => {
    renderInspector({ status: 'running', request })
    expect(screen.getByText('GET https://api.example.test/items')).toBeInTheDocument()
    expect(announcement()).toHaveTextContent('Sending request…')
  })
})

describe('status bar', () => {
  it('shows code, meaning in words, time and size', () => {
    renderInspector(finished(resultFor()))
    expect(screen.getByText('200 OK', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('439 ms')).toBeInTheDocument()
    expect(screen.getByText('1.5 KB')).toBeInTheDocument()
    expect(announcement()).toHaveTextContent('Success: 200 OK in 439 ms')
  })

  it.each([
    [404, 'Not Found', 'Client error', 'HTTP error: 404 Not Found'],
    [503, 'Service Unavailable', 'Server error', 'HTTP error: 503 Service Unavailable'],
    [301, 'Moved Permanently', 'Redirect', 'Success: 301 Moved Permanently'],
  ])('labels %i as %s without relying on colour', (status, statusText, label, spoken) => {
    renderInspector(finished(resultFor({ status, statusText })))
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(announcement()).toHaveTextContent(spoken)
  })

  it('works without status text (HTTP/2)', () => {
    renderInspector(finished(resultFor({ statusText: '' })))
    expect(screen.getByText('200', { selector: 'span' })).toBeInTheDocument()
  })
})

describe('body tab', () => {
  it('shows formatted JSON by default and raw text on request', async () => {
    const { user } = renderInspector(finished(resultFor()))
    expect(body()).toHaveTextContent('{ "id": 7, "done": false }', { normalizeWhitespace: true })
    expect(body().textContent).toContain('\n  "id": 7')

    const view = screen.getByRole('group', { name: 'Body view' })
    await user.click(within(view).getByRole('button', { name: 'Raw' }))
    expect(body().textContent).toBe('{"id":7,"done":false}')
    expect(within(view).getByRole('button', { name: 'Raw' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(view).getByRole('button', { name: 'Formatted' })).toHaveAttribute('aria-pressed', 'false')
  })

  it.each(['false', '0', 'null', '""'])('shows the falsy JSON value %s', (text) => {
    renderInspector(finished(resultFor({ text })))
    expect(body().textContent).toBe(text)
  })

  it('handles an empty 204', () => {
    renderInspector(finished(resultFor({ status: 204, statusText: 'No Content', text: '', sizeBytes: 0 })))
    expect(screen.getByText('The response has no body.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Response body')).not.toBeInTheDocument()
  })

  it('shows plain text without a JSON toggle', () => {
    renderInspector(finished(resultFor({ headers: [['content-type', 'text/plain']], text: 'pong' })))
    expect(body().textContent).toBe('pong')
    expect(screen.queryByRole('group', { name: 'Body view' })).not.toBeInTheDocument()
  })

  it('explains malformed JSON and shows the raw text', () => {
    renderInspector(finished(resultFor({ text: '{"a":' })))
    expect(screen.getByText(/the body isn't valid JSON/)).toHaveTextContent(/\(.+\)/)
    expect(body().textContent).toBe('{"a":')
    expect(announcement()).toHaveTextContent("Response isn't valid JSON: 200 OK")
  })

  it('says clearly when only a preview was kept', () => {
    renderInspector(finished(resultFor({ text: '[1,2,', truncated: true, sizeBytes: 5 * 1024 * 1024 })))
    expect(screen.getByText(/Showing the first 1 MB of 5 MB/)).toHaveTextContent(/not the complete response/)
    expect(screen.getByText('Not formatted as JSON: the preview is incomplete.')).toBeInTheDocument()
    expect(screen.getByText(/5 MB \(preview\)/)).toBeInTheDocument()
  })

  it('cuts a very long body on first render and can show it all', async () => {
    const text = 'x'.repeat(RENDER_LIMIT + 10)
    const { user } = renderInspector(finished(resultFor({ headers: [['content-type', 'text/plain']], text })))
    expect(body().textContent).toHaveLength(RENDER_LIMIT)
    await user.click(screen.getByRole('button', { name: 'Show everything' }))
    expect(body().textContent).toHaveLength(RENDER_LIMIT + 10)
  })
})

describe('headers tab', () => {
  it('lists the visible headers in a table', async () => {
    const { user } = renderInspector(finished(resultFor()))
    await user.click(screen.getByRole('tab', { name: 'Headers 2' }))
    const table = screen.getByRole('table', { name: '2 response headers' })
    expect(within(table).getByRole('rowheader', { name: 'x-request-id' })).toBeInTheDocument()
    expect(within(table).getByRole('cell', { name: 'abc' })).toBeInTheDocument()
  })

  it('says "none sent" for a same-origin response without headers', async () => {
    const { user } = renderInspector(finished(resultFor({ headers: [], text: 'x' })))
    await user.click(screen.getByRole('tab', { name: /Headers/ }))
    expect(screen.getByText('The server sent no headers.')).toBeInTheDocument()
  })

  it('says "not exposed" for a cross-origin response, and explains CORS', async () => {
    const { user } = renderInspector(
      finished(resultFor({ headers: [], headerExposure: 'cors-filtered', text: 'x' })),
    )
    await user.click(screen.getByRole('tab', { name: /Headers/ }))
    expect(screen.getByText('No headers were exposed to this page.')).toBeInTheDocument()
    expect(screen.getByText(/Access-Control-Expose-Headers/)).toBeInTheDocument()
    expect(screen.queryByText('The server sent no headers.')).not.toBeInTheDocument()
  })
})

describe('details tab', () => {
  it('summarises request, timing, size and parsing', async () => {
    const { user } = renderInspector(
      finished(resultFor({ truncated: true, text: '[', sizeBytes: 3 * 1024 * 1024 })),
    )
    await user.click(screen.getByRole('tab', { name: 'Details' }))
    const details = screen.getByRole('tabpanel', { name: 'Details' })
    expect(details).toHaveTextContent('GET https://api.example.test/items')
    expect(details).toHaveTextContent('439 ms, from sending until the whole body was read')
    expect(details).toHaveTextContent('3 MB after decompression; only the first 1 MB was kept')
    expect(details).toHaveTextContent('Not parsed: only a preview was kept')
    expect(details).not.toHaveTextContent('Final URL')
  })

  it('shows the final URL after a redirect', async () => {
    const { user } = renderInspector(finished(resultFor({ finalUrl: 'https://api.example.test/v2/items' })))
    await user.click(screen.getByRole('tab', { name: 'Details' }))
    expect(screen.getByText('https://api.example.test/v2/items')).toBeInTheDocument()
    expect(screen.getByText(/followed a redirect/)).toBeInTheDocument()
  })
})

describe('copying', () => {
  function mockClipboard(writeText: (text: string) => Promise<void>) {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  }

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
  })

  it('copies the body as displayed and confirms it', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    const { user } = renderInspector(finished(resultFor()))
    mockClipboard(writeText)
    await user.click(screen.getByRole('button', { name: 'Copy body' }))
    expect(writeText).toHaveBeenCalledWith('{\n  "id": 7,\n  "done": false\n}')
    expect(screen.getByRole('status', { name: 'Copy body result' })).toHaveTextContent('Copied.')
  })

  it('selects the text and explains when the clipboard is blocked', async () => {
    const { user } = renderInspector(finished(resultFor()))
    mockClipboard(() => Promise.reject(new DOMException('denied', 'NotAllowedError')))
    await user.click(screen.getByRole('button', { name: 'Copy body' }))
    expect(screen.getByRole('status', { name: 'Copy body result' })).toHaveTextContent(/press Ctrl\+C/)
    // jsdom can't stringify selections; check the range covers the body (verified by hand in Chromium).
    expect(window.getSelection()?.getRangeAt(0).startContainer).toBe(body())
    expect(body()).toHaveFocus()
  })

  it('fails gracefully when there is no clipboard API at all (insecure page)', async () => {
    const { user } = renderInspector(finished(resultFor()))
    // userEvent.setup() installs a fake clipboard; remove it to model an http:// page.
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    await user.click(screen.getByRole('tab', { name: /Headers/ }))
    await user.click(screen.getByRole('button', { name: 'Copy headers' }))
    expect(screen.getByRole('status', { name: 'Copy headers result' })).toHaveTextContent(
      "Couldn't copy: the browser blocked clipboard access.",
    )
  })

  it('copies headers as name: value lines', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    const { user } = renderInspector(finished(resultFor()))
    mockClipboard(writeText)
    await user.click(screen.getByRole('tab', { name: /Headers/ }))
    await user.click(screen.getByRole('button', { name: 'Copy headers' }))
    expect(writeText).toHaveBeenCalledWith('content-type: application/json\nx-request-id: abc')
  })
})

describe('failures', () => {
  it('network failure: no status, measured time, possible causes', () => {
    renderInspector(finished({ kind: 'network-failure', durationMs: 120 }))
    expect(screen.getByRole('heading', { name: 'Network error' })).toBeInTheDocument()
    expect(screen.getByText(/No response was received after 120 ms/)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('timeout says nothing is retried', () => {
    renderInspector(finished({ kind: 'timeout', timeoutMs: 30_000 }))
    expect(screen.getByRole('heading', { name: 'Timed out' })).toBeInTheDocument()
    expect(screen.getByText(/nothing is retried automatically/)).toBeInTheDocument()
    expect(announcement()).toHaveTextContent('Timed out after 30 s with no response.')
  })

  it("cancel is reported as the user's choice", () => {
    renderInspector(finished({ kind: 'cancelled' }))
    expect(screen.getByRole('heading', { name: 'Cancelled' })).toBeInTheDocument()
    expect(announcement()).toHaveTextContent('Cancelled. No response was received.')
  })
})
