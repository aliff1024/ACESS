import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

// Educator (farah) opens the real course analytics dashboard for a course
// with zero enrolments (confirmed via a direct database read before this
// test was written), to confirm the dashboard renders a clean zero rather
// than a crash or a broken calculation (NaN, undefined, division by zero).
test('EDUCATOR-05: analytics for a course with no learners renders a clean empty state', async ({ page }) => {
  await loginAs(page, 'farah.educator@acess.edu.my')
  await page.goto('/educator/analytics')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  const bodyText = await page.locator('body').innerText()
  console.log('EDUCATOR-05: analytics page state:', bodyText.slice(0, 1200))

  await expect(page.getByRole('heading', { name: 'Introduction to Assistive Technology' })).toBeVisible({ timeout: 10000 })
  // A broken zero-enrolment calculation would surface as one of these
  // literal strings somewhere on the page.
  expect(bodyText).not.toMatch(/NaN|undefined|Infinity/)
})
