import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Transport } from '../../../infrastructure/http/fetchClient'
import {
  failWithNetworkError,
  jsonResponse,
  neverRespond,
  respondWith,
} from '../../../test/factories/fakeTransport'
import { WorkspaceEnvironmentContext, type WorkspaceEnvironment } from '../environment'
import { WorkspacePage } from './WorkspacePage'

function renderWorkspace(overrides: Partial<WorkspaceEnvironment> = {}) {
  const environment: WorkspaceEnvironment = {
    transport: respondWith(() => jsonResponse({ ok: true })),
    timeoutMs: 30_000,
    confirmUnsafeMethods: false,
    pageProtocol: 'https:',
    ...overrides,
  }
  // user-event waits between keystrokes; under fake timers it must move the clock itself.
  const user = userEvent.setup({
    advanceTimers: (ms) => (vi.isFakeTimers() ? vi.advanceTimersByTime(ms) : undefined),
  })
  const view = render(
    <WorkspaceEnvironmentContext.Provider value={environment}>
      <WorkspacePage />
    </WorkspaceEnvironmentContext.Provider>,
  )
  return { user, environment, ...view }
}

const urlInput = () => screen.getByRole('textbox', { name: 'URL' })
const sendButton = () => screen.getByRole('button', { name: 'Send' })
const status = () => screen.getByRole('status', { name: 'Request status' })
const sentRequest = (transport: Transport) => vi.mocked(transport).mock.calls[0]?.[0]

afterEach(() => vi.useRealTimers())

describe('building and sending', () => {
  it('sends a GET with params and headers through the transport', async () => {
    const transport = respondWith(() => jsonResponse({ id: 7 }))
    const { user } = renderWorkspace({ transport })

    await user.type(urlInput(), 'https://api.example.test/items?sort=asc')
    await user.click(screen.getByRole('button', { name: 'Add parameter' }))
    await user.type(screen.getByRole('textbox', { name: 'Parameter name 1' }), 'q')
    await user.type(screen.getByRole('textbox', { name: 'Parameter value 1' }), 'a b')

    await user.click(screen.getByRole('tab', { name: 'Headers' }))
    await user.click(screen.getByRole('button', { name: 'Add header' }))
    await user.type(screen.getByRole('textbox', { name: 'Header name 1' }), 'Accept')
    await user.type(screen.getByRole('textbox', { name: 'Header value 1' }), 'application/json')

    await user.click(sendButton())

    expect(await screen.findByText(/^Success: 200/)).toBeInTheDocument()
    const request = sentRequest(transport)
    expect(request?.url).toBe('https://api.example.test/items?sort=asc&q=a+b')
    expect(request?.headers.get('accept')).toBe('application/json')
    expect(screen.getByLabelText('Response body')).toHaveTextContent('"id": 7')
  })

  it('sends a POST with a JSON body and sets Content-Type', async () => {
    const transport = respondWith(() =>
      jsonResponse({ created: true }, { status: 201, statusText: 'Created' }),
    )
    const { user } = renderWorkspace({ transport })

    await user.selectOptions(screen.getByRole('combobox', { name: 'Method' }), 'POST')
    await user.type(urlInput(), 'https://api.example.test/items')
    await user.click(screen.getByRole('tab', { name: 'Body' }))
    await user.click(screen.getByRole('radio', { name: 'JSON' }))
    // user-event treats { and [ as key descriptors, so they are doubled.
    await user.type(screen.getByRole('textbox', { name: 'JSON body' }), '{{"name":"Ada"}')
    await user.keyboard('{Enter}')
    await user.click(sendButton())

    expect(await screen.findByText(/^Success: 201 Created/)).toBeInTheDocument()
    const request = sentRequest(transport)
    expect(request?.method).toBe('POST')
    expect(request?.headers.get('content-type')).toBe('application/json')
    expect(await request?.text()).toBe('{"name":"Ada"}\n')
  })

  it('sends on Enter in the URL bar', async () => {
    const transport = respondWith(() => jsonResponse({}))
    const { user } = renderWorkspace({ transport })
    await user.type(urlInput(), 'https://api.example.test{Enter}')
    expect(await screen.findByText(/^Success:/)).toBeInTheDocument()
    expect(transport).toHaveBeenCalledTimes(1)
  })
})

describe('preventing invalid requests', () => {
  it('shows the URL error, moves focus to it, and sends nothing', async () => {
    const transport = respondWith(() => jsonResponse({}))
    const { user } = renderWorkspace({ transport })

    await user.type(urlInput(), 'javascript:alert(1)')
    await user.click(sendButton())

    expect(screen.getByRole('alert')).toHaveTextContent('Fix 1 problem before sending.')
    expect(urlInput()).toHaveAttribute('aria-invalid', 'true')
    expect(urlInput()).toHaveAccessibleDescription(/aren't supported/)
    expect(urlInput()).toHaveFocus()
    expect(transport).not.toHaveBeenCalled()
  })

  it('does not show errors before the first send attempt', async () => {
    const { user } = renderWorkspace()
    await user.type(urlInput(), 'not a url')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(urlInput()).not.toHaveAttribute('aria-invalid')
  })

  it('opens the tab with the first error and focuses the broken row', async () => {
    const { user } = renderWorkspace()
    await user.type(urlInput(), 'https://api.example.test')
    await user.click(screen.getByRole('tab', { name: 'Headers' }))
    await user.click(screen.getByRole('button', { name: 'Add header' }))
    await user.type(screen.getByRole('textbox', { name: 'Header name 1' }), 'Bad Name')
    await user.click(screen.getByRole('tab', { name: /^Params/ }))

    await user.click(sendButton())

    expect(screen.getByRole('tab', { name: /Headers.*has errors/ })).toHaveAttribute('aria-selected', 'true')
    const nameInput = screen.getByRole('textbox', { name: 'Header name 1' })
    expect(nameInput).toHaveFocus()
    expect(nameInput).toHaveAccessibleDescription(/spaces/)
  })

  it('refuses a GET with a body and keeps the body', async () => {
    const transport = respondWith(() => jsonResponse({}))
    const { user } = renderWorkspace({ transport })
    await user.type(urlInput(), 'https://api.example.test')
    await user.click(screen.getByRole('tab', { name: 'Body' }))
    await user.click(screen.getByRole('radio', { name: 'Text' }))
    await user.type(screen.getByRole('textbox', { name: 'Text body' }), 'hello')

    expect(screen.getByText(/GET requests can't have a body/)).toBeInTheDocument()
    await user.click(sendButton())

    const body = screen.getByRole('textbox', { name: 'Text body' })
    expect(body).toHaveValue('hello')
    expect(body).toHaveFocus()
    expect(body).toHaveAccessibleDescription(/GET requests can't have a body/)
    expect(transport).not.toHaveBeenCalled()
  })

  it('notes forbidden headers instead of pretending they are sent', async () => {
    const transport = respondWith(() => jsonResponse({}))
    const { user } = renderWorkspace({ transport })
    await user.type(urlInput(), 'https://api.example.test')
    await user.click(screen.getByRole('tab', { name: 'Headers' }))
    await user.click(screen.getByRole('button', { name: 'Add header' }))
    await user.type(screen.getByRole('textbox', { name: 'Header name 1' }), 'Cookie')
    await user.type(screen.getByRole('textbox', { name: 'Header value 1' }), 'a=1')

    expect(screen.getByRole('textbox', { name: 'Header name 1' })).toHaveAccessibleDescription(
      "The browser controls Cookie, so it won't be sent.",
    )
    await user.click(sendButton())
    expect(sentRequest(transport)?.headers.has('cookie')).toBe(false)
  })

  it('warns about mixed content before sending', async () => {
    const { user } = renderWorkspace({ pageProtocol: 'https:' })
    await user.type(urlInput(), 'http://api.example.test')
    expect(urlInput()).toHaveAccessibleDescription(/Browsers block http:\/\//)
  })
})

describe('editing rows', () => {
  it('focuses a new row, and the neighbouring row after a removal', async () => {
    const { user } = renderWorkspace()
    const add = screen.getByRole('button', { name: 'Add parameter' })

    await user.click(add)
    expect(screen.getByRole('textbox', { name: 'Parameter name 1' })).toHaveFocus()
    await user.keyboard('first')
    await user.click(add)
    await user.keyboard('second')

    await user.click(screen.getByRole('button', { name: 'Remove parameter 1' }))
    const remaining = screen.getByRole('textbox', { name: 'Parameter name 1' })
    expect(remaining).toHaveValue('second')
    expect(remaining).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Remove parameter 1' }))
    expect(add).toHaveFocus()
    expect(screen.getByText(/No query parameters/)).toBeInTheDocument()
  })

  it('skips a disabled row when sending', async () => {
    const transport = respondWith(() => jsonResponse({}))
    const { user } = renderWorkspace({ transport })
    await user.type(urlInput(), 'https://api.example.test')
    await user.click(screen.getByRole('button', { name: 'Add parameter' }))
    await user.keyboard('debug')
    await user.click(screen.getByRole('checkbox', { name: 'Send parameter 1' }))
    await user.click(sendButton())
    await screen.findByText(/^Success:/)
    expect(sentRequest(transport)?.url).toBe('https://api.example.test/')
  })
})

describe('results', () => {
  it('shows a 404 as an HTTP error with its status', async () => {
    const transport = respondWith(() =>
      jsonResponse({ error: 'nope' }, { status: 404, statusText: 'Not Found' }),
    )
    const { user } = renderWorkspace({ transport })
    await user.type(urlInput(), 'https://api.example.test/missing{Enter}')
    expect(await screen.findByText(/^HTTP error: 404 Not Found/)).toBeInTheDocument()
  })

  it('shows a network failure with possible causes and no invented status', async () => {
    const { user } = renderWorkspace({ transport: failWithNetworkError() })
    await user.type(urlInput(), 'https://api.example.test{Enter}')
    expect(await screen.findByText('Network error: no response was received.')).toBeInTheDocument()
    expect(screen.getByText(/The browser doesn't say why/)).toBeInTheDocument()
    expect(screen.getByText('CORS.')).toBeInTheDocument()
    expect(status()).not.toHaveTextContent(/\d{3}/)
  })

  it('renders returned HTML as text and never runs it', async () => {
    const html = '<img src="x" onerror="window.__pwned = true"><script>window.__pwned = true</script>'
    const transport = respondWith(() => new Response(html, { headers: { 'content-type': 'text/html' } }))
    const { user, container } = renderWorkspace({ transport })
    await user.type(urlInput(), 'https://api.example.test{Enter}')
    await screen.findByText(/^Success:/)
    expect(screen.getByLabelText('Response body')).toHaveTextContent(html)
    expect(container.querySelector('img, script')).toBeNull()
    expect((window as { __pwned?: boolean }).__pwned).toBeUndefined()
  })

  it('announces a short sentence, never the body', async () => {
    const { user } = renderWorkspace()
    expect(status()).toHaveTextContent('No request sent yet.')
    await user.type(urlInput(), 'https://api.example.test{Enter}')
    await screen.findByText(/^Success:/)
    expect(status()).toHaveTextContent(/^Success: 200 in \d+ ms$/)
    // The only other live regions are the copy buttons' own, empty until a copy happens.
    for (const region of screen.getAllByRole('status')) {
      expect(region).not.toHaveTextContent('"ok"')
    }
  })
})

describe('running, cancelling and timing out', () => {
  it('swaps Send for Cancel while running, and cancels', async () => {
    const { user } = renderWorkspace({ transport: neverRespond() })
    await user.type(urlInput(), 'https://api.example.test{Enter}')

    expect(status()).toHaveTextContent('Sending request…')
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await screen.findByText('Cancelled. No response was received.')).toBeInTheDocument()
    expect(sendButton()).toBeInTheDocument()
  })

  it('sends once when Enter is pressed twice quickly', async () => {
    const transport = neverRespond()
    const { user } = renderWorkspace({ transport })
    await user.type(urlInput(), 'https://api.example.test')
    await user.keyboard('{Enter}{Enter}')
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('shows timeout feedback', async () => {
    const { user } = renderWorkspace({ transport: neverRespond(), timeoutMs: 5000 })
    await user.type(urlInput(), 'https://api.example.test')
    // Fake the clock only from the send onwards: typing under fake timers stalls React's scheduler.
    vi.useFakeTimers()
    act(() => fireEvent.click(sendButton()))
    expect(status()).toHaveTextContent('Sending request…')

    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(status()).toHaveTextContent('Timed out after 5 s with no response.')
  })

  it('ignores a response that arrives after unmount', async () => {
    let respond: (response: Response) => void = () => {}
    const transport = vi.fn<Transport>(() => new Promise((resolve) => (respond = resolve)))
    const errors = vi.spyOn(console, 'error')
    const { user, unmount } = renderWorkspace({ transport })
    await user.type(urlInput(), 'https://api.example.test{Enter}')
    unmount()
    await act(async () => respond(jsonResponse({ late: true })))
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })
})

describe('confirmation', () => {
  it('asks before sending to localhost, and sends nothing on "Don\'t send"', async () => {
    const transport = respondWith(() => jsonResponse({}))
    const { user } = renderWorkspace({ transport, pageProtocol: 'http:' })
    await user.type(urlInput(), 'http://localhost:3000/health{Enter}')

    const dialog = screen.getByRole('dialog', { name: 'Send this request?' })
    expect(dialog).toHaveAccessibleDescription(/localhost is a local or private-network address/)
    const dontSend = within(dialog).getByRole('button', { name: "Don't send" })
    expect(dontSend).toHaveFocus()
    await user.click(dontSend)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(transport).not.toHaveBeenCalled()
  })

  it('sends after "Send anyway"', async () => {
    const transport = respondWith(() => jsonResponse({}))
    const { user } = renderWorkspace({ transport, pageProtocol: 'http:' })
    await user.type(urlInput(), 'http://localhost:3000/health{Enter}')
    await user.click(screen.getByRole('button', { name: 'Send anyway' }))
    expect(await screen.findByText(/^Success:/)).toBeInTheDocument()
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('treats Escape as "Don\'t send"', async () => {
    const transport = respondWith(() => jsonResponse({}))
    const { user } = renderWorkspace({ transport, pageProtocol: 'http:' })
    await user.type(urlInput(), 'http://127.0.0.1{Enter}')
    const dialog = screen.getByRole('dialog')
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    await act(async () => {})
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(transport).not.toHaveBeenCalled()
  })

  it('on the demo, asks before methods that can change data', async () => {
    const { user } = renderWorkspace({ confirmUnsafeMethods: true })
    await user.selectOptions(screen.getByRole('combobox', { name: 'Method' }), 'DELETE')
    await user.type(urlInput(), 'https://api.example.test/items/1{Enter}')
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
      /DELETE requests can change or delete data/,
    )
  })

  it('on the demo, sends GET without asking', async () => {
    const transport = respondWith(() => jsonResponse({}))
    const { user } = renderWorkspace({ transport, confirmUnsafeMethods: true })
    await user.type(urlInput(), 'https://api.example.test{Enter}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(transport).toHaveBeenCalledTimes(1)
  })
})

describe('keyboard', () => {
  it('moves between request tabs with the arrow keys', async () => {
    const { user } = renderWorkspace()
    const params = screen.getByRole('tab', { name: 'Params' })
    params.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Headers' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Headers' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Body' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(params).toHaveFocus()
    expect(params).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Body' })).toHaveAttribute('tabindex', '-1')
  })
})
