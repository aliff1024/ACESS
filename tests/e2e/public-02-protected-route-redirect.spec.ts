import { test, expect } from '@playwright/test'

// Unauthenticated visitor tries to navigate directly to a protected
// administrator route with no session at all, to confirm the application
// redirects to the login page rather than exposing the page or erroring.
test('PUBLIC-02: an unauthenticated visit to a protected route redirects to login', async ({ browser }) => {
  const context = await browser.newContext() // deliberately no stored session
  const page = await context.newPage()
  const response = await page.goto('/admin/dashboard')
  await page.waitForLoadState('networkidle')

  console.log('PUBLIC-02: final URL after navigating to /admin/dashboard with no session:', page.url())
  expect(page.url()).toContain('/login')
  expect(page.url()).toContain('redirect=%2Fadmin%2Fdashboard')
  await expect(page.getByPlaceholder('your@email.com')).toBeVisible({ timeout: 10000 })
  await context.close()
})
