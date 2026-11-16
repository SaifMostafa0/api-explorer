// A real browser, against the production build. Every request the app makes is intercepted, so
// nothing here reaches a third-party server.

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const API = 'https://api.example.test'
const cors = { 'access-control-allow-origin': '*' }

test('sends a GET and shows the status and body', async ({ page }) => {
  await page.route(`${API}/item`, (route) =>
    route.fulfill({
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' },
      body: '{"id":1}',
    }),
  )

  await page.goto('/')
  await page.getByRole('textbox', { name: 'URL' }).fill(`${API}/item`)
  await page.getByRole('button', { name: 'Send' }).click()

  await expect(page.getByText('Success: 200')).toBeVisible()
  await expect(page.getByText('"id": 1')).toBeVisible()
})

test('a real mouse click on Cancel cancels and does not send again', async ({ page }) => {
  // Regression for PR #2: jsdom's element.click() could not reproduce this.
  let requests = 0
  await page.route(`${API}/slow`, () => {
    // Never fulfilled: the request stays in flight until the app cancels it.
    requests += 1
  })

  await page.goto('/')
  await page.getByRole('textbox', { name: 'URL' }).fill(`${API}/slow`)
  await page.getByRole('button', { name: 'Send' }).click()
  await page.getByRole('button', { name: 'Cancel' }).waitFor()
  await page.getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByRole('heading', { name: 'Cancelled' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send' })).toBeVisible()
  await page.waitForTimeout(500)
  expect(requests).toBe(1)
})

test('shows validation errors and moves focus to the URL', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Send' }).click()

  await expect(page.getByText('Enter a URL.')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'URL' })).toBeFocused()
  await expect(page.getByRole('textbox', { name: 'URL' })).toHaveAttribute('aria-invalid', 'true')
})

test('has no detectable accessibility violations, empty and with a response', async ({ page }) => {
  await page.route(`${API}/item`, (route) =>
    route.fulfill({
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' },
      body: '{"id":1}',
    }),
  )

  await page.goto('/')
  const empty = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(empty.violations).toEqual([])

  await page.getByRole('textbox', { name: 'URL' }).fill(`${API}/item`)
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('"id": 1')).toBeVisible()

  const withResponse = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(withResponse.violations).toEqual([])
})
