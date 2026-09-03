import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

// Re-verified 2026-09-03 by actually running this test: the original lesson
// (7ba81da7-3b25-4f9a-a5a8-64e6ca2ae963, course 02111b11-03d1-4f3c-afe8-
// b99e74ed5243) has no quiz attached in the current database (a direct read
// of the quizzes table for that lesson returned zero rows) — stale from an
// earlier seed generation, and "Start Attempt" could never appear as a
// result. Replaced with "Fluency Check", a quiz on a lesson mei is actually
// enrolled in, in her own dyslexia-focused course ("Reading Fluency with
// Dyslexia Support"), confirmed to exist via a direct read.
//
// Learner (mei, Dyslexia persona, preferred_reading_level='simplified') takes
// a quiz attempt through the real quiz UI. Her profile routes her into a
// different quiz component (immediate per-question feedback, "Simplified
// View / Easy Read Mode is on") than the linear select-all-then-submit flow
// a baseline learner gets — discovered live, not assumed.
test('LEARNER-03: take a quiz attempt under the Dyslexia preset', async ({ page }) => {
  await loginAs(page, 'mei.learner@acess.edu.my')
  await page.goto('/learner/lesson/bb9c41e4-0fe3-4e31-8f3b-af22d9f0a3b7?courseId=75e82100-5247-4e84-9401-d8804fea37a0')
  await page.waitForLoadState('networkidle')

  const startButton = page.getByRole('button', { name: /start attempt/i })
  await expect(startButton).toBeVisible({ timeout: 15000 })
  await startButton.click()
  await page.getByText('Question 1 of 2', { exact: false }).waitFor({ timeout: 15000 })

  const optionButtons = page.locator('main button').filter({ hasNotText: /^(previous|next|submit|read question aloud|quiz\.)/i })
  await expect(optionButtons.first()).toBeVisible({ timeout: 10000 })
  await optionButtons.first().click()
  await page.waitForTimeout(1000)

  const bodyText = await page.locator('body').innerText()
  console.log('LEARNER-03: state after answering question 1:', bodyText.slice(0, 500))
  // The quiz UI must still show quiz content after answering (either the
  // next question or feedback on this one), not go blank or fall back to
  // an unrelated page.
  await expect(page.getByText(/question \d of 2|correct|not quite|well done/i)).toBeVisible({ timeout: 5000 })
})
