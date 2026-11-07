import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { createTestRouter } from './router'

function renderAt(path: string) {
  return render(<RouterProvider router={createTestRouter(path)} />)
}

describe('app shell', () => {
  it('renders the request workspace at /', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Request workspace' })).toBeInTheDocument()
  })

  it('shows a useful 404 for unknown paths', () => {
    renderAt('/does-not-exist')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to the request workspace/i })).toHaveAttribute('href', '/')
  })

  it('navigates between sections from the main nav', async () => {
    renderAt('/')
    await userEvent.click(screen.getByRole('link', { name: 'History' }))
    expect(screen.getByRole('heading', { level: 1, name: 'History' })).toBeInTheDocument()
  })
})
