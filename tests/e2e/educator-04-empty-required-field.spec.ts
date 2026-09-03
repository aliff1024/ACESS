import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

// Educator (farah) starts the real course-creation wizard and leaves the
// required Title and Description fields empty, to confirm the wizard's own
// client-side validation blocks progress rather than letting an incomplete
// course through.
test('EDUCATOR-04: course wizard blocks progress when required fields are empty', async ({ page }) => {
  await loginAs(page, 'farah.educator@acess.edu.my')
  await page.goto('/educator/courses/create')
  await page.waitForTimeout(2000)

  // Deliberately leave the title and description untouched (empty) and try
  // to proceed, exactly as a person skipping ahead by mistake would.
  const continueButton = page.getByRole('button', { name: /^continue$/i })
  await expect(continueButton).toBeVisible({ timeout: 10000 })
  await expect(continueButton).toBeDisabled()
  console.log('EDUCATOR-04: Continue button is disabled while the title/description fields are empty, as expected')

  // Confirm it is genuinely the empty fields holding the gate shut, not the
  // button being disabled for an unrelated reason: filling both fields must
  // enable it.
  await page.getByPlaceholder('e.g., Introduction to Web Accessibility').fill('Temporary validation check')
  const editable = page.locator('[contenteditable="true"]').first()
  if (await editable.count()) {
    await editable.click()
    await editable.fill('Filled in only to confirm the Continue button re-enables once required fields are present.')
  }
  await page.waitForTimeout(300)
  await expect(continueButton).toBeEnabled()
  console.log('EDUCATOR-04: Continue button re-enables once both required fields are filled')
})
