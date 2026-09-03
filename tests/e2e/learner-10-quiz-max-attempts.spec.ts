import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

const LESSON_ID = '389c2f41-8f92-4cb1-a503-2316111ec117' // "ADHD Study Skills Assessment"
const COURSE_ID = 'c2c9deb5-bb08-412a-8bac-739edd3cdaf1' // "Focus and Study Skills for ADHD Learners"

// Learner (amir) opens a quiz he has already attempted the maximum allowed
// number of times (2 of 2, confirmed via a direct database read before this
// test was written — this is real, pre-existing seed history, not created by
// this test), to confirm the interface correctly blocks a further attempt
// instead of allowing one past the limit.
test('LEARNER-10: a quiz at its attempt limit blocks a further attempt', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message))
  page.on('response', (res) => { if (res.status() >= 400) consoleErrors.push(`HTTP ${res.status()} ${res.url()}`) })
  await loginAs(page, 'amir.learner@acess.edu.my')
  await page.goto(`/learner/lesson/${LESSON_ID}?courseId=${COURSE_ID}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  // amir's ADHD preset locks this lesson into the same step-by-step focus
  // navigation fixed for LEARNER-02 (Defect 6): the Quiz step only becomes
  // visible by advancing through the real "Next section" arrow, the same
  // control an ADHD learner has to use, not by clicking a phase name directly.
  const contentPill = page.getByRole('button', { name: 'Lesson Content', exact: true })
  if (await contentPill.isVisible().catch(() => false)) {
    await contentPill.click()
    await page.waitForTimeout(400)
  }
  await page.evaluate(() => {
    const main = document.getElementById('main-content')
    main?.scrollTo(0, main.scrollHeight)
  })
  await page.waitForTimeout(800)
  // The real interactive quiz component (the one that actually knows about
  // the attempt limit) only renders for an ADHD learner at the very last
  // focus step, "Summary" — the same gate the LEARNER-02 fix (Defect 6)
  // uncovered for the completion button. Advance all the way there via the
  // real Next-section arrow, the same control an ADHD learner has to use.
  const nextArrow = page.getByRole('button', { name: 'Next section' })
  for (let i = 0; i < 5; i++) {
    const disabled = await nextArrow.isDisabled().catch(() => true)
    if (disabled) break
    await nextArrow.click()
    await page.waitForTimeout(600)
  }
  await page.waitForTimeout(2000) // let the quiz component's own attempt-check finish resolving

  const bodyText = await page.locator('body').innerText()
  console.log('LEARNER-10: quiz page state at the attempt limit:', bodyText.slice(0, 800))
  console.log('LEARNER-10: console/network errors captured:', JSON.stringify(consoleErrors, null, 2))
  console.log('LEARNER-10: HTML around the quiz card:', await page.locator('#lesson-quiz').innerHTML().catch((e) => 'no #lesson-quiz element: ' + e.message))

  // No "Start Attempt" control should be clickable once the limit is used up.
  await expect(page.getByRole('button', { name: /start attempt/i })).toHaveCount(0)
  await expect(page.getByText(/maximum attempts reached|no attempts? (remaining|left)/i).first()).toBeVisible({ timeout: 10000 })
})
