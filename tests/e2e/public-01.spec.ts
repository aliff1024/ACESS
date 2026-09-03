import { test, expect } from '@playwright/test'

test('PUBLIC-01: landing page renders with no session, and no public catalogue route exists', async ({ page }) => {
  const resp = await page.goto('/')
  expect(resp?.status()).toBeLessThan(400)
  await page.waitForLoadState('networkidle')
  const bodyText = await page.locator('body').innerText()
  console.log('LANDING PAGE TEXT:', bodyText.slice(0, 400))

  // Chapter 4 (Software Design, "Public navigation") claims unauthenticated
  // visitors reach "the course catalogue preview". Confirm that live: the
  // route interceptor's PUBLIC_ROUTES list (src/proxy.ts) has no catalogue
  // entry, so this asserts the redirect actually happens rather than assuming it.
  await page.goto('/courses')
  await page.waitForURL(/\/login/, { timeout: 10000 })
  console.log('CATALOGUE-ROUTE-FINAL-URL:', page.url())
})
