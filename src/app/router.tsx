import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router'
import { AppLayout } from '../components/layout/AppLayout'
import { WorkspacePage } from '../features/request-workspace/pages/WorkspacePage'
import { HistoryPage } from '../features/history/pages/HistoryPage'
import { SettingsPage } from '../features/settings/pages/SettingsPage'
import { NotFoundPage } from './NotFoundPage'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <WorkspacePage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}

/** Used by tests to render a route without touching window.location. */
export function createTestRouter(initialPath = '/') {
  return createMemoryRouter(routes, { initialEntries: [initialPath] })
}
