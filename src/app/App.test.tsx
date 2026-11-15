import { render, screen } from '@testing-library/react'
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

  it('does not link to pages that are not built yet', () => {
    renderAt('/')
    expect(screen.queryByRole('link', { name: 'History' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('shows the 404 page for a route that is not built yet', () => {
    renderAt('/history')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
