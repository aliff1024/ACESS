import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

// Learner (haziq, "no certificates" per his seeded scenario, confirmed via a
// direct database read before this test was written) opens the Achievements
// & Certificates page with zero certificates issued, to confirm the empty
// state renders a clear message rather than a blank page or a crash.
test('LEARNER-09: certificates page with no certificates shows a clear empty state', async ({ page }) => {
  await loginAs(page, 'haziq.learner@acess.edu.my')
  await page.goto('/learner/certificates')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  const bodyText = await page.locator('body').innerText()
  console.log('LEARNER-09: certificates page state:', bodyText.slice(0, 800))

  await expect(page.getByText(/no certificates yet/i)).toBeVisible({ timeout: 10000 })
})
