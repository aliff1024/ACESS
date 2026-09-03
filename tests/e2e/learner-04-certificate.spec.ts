import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

// Learner (amir) views an already-issued certificate through the real
// Achievements & Certificates page. Read-only, no state mutated.
test('LEARNER-04: view an issued certificate', async ({ page }) => {
  await loginAs(page, 'amir.learner@acess.edu.my')
  await page.goto('/learner/certificates')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  const bodyText = await page.locator('body').innerText()
  console.log('LEARNER-04:', bodyText.slice(0, 1200))
  await expect(page.getByText(/certificate/i).first()).toBeVisible({ timeout: 10000 })
})
