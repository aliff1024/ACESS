import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

// Educator (siti, "owns five published courses") views the real course
// analytics dashboard. Read-only, no state mutated.
test('EDUCATOR-03: view course analytics', async ({ page }) => {
  await loginAs(page, 'siti.educator@acess.edu.my')
  await page.goto('/educator/analytics')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  const bodyText = await page.locator('body').innerText()
  console.log('EDUCATOR-03:', bodyText.slice(0, 1200))
  await expect(page.getByText(/analytics|enrol|completion/i).first()).toBeVisible({ timeout: 10000 })
})
