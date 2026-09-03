import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'

const COURSE_ID = 'd8749fab-978e-4241-bcdc-44a87a3a4edb' // "Foundations of Accessible Learning"

// Learner (haziq, already enrolled in this course from the seed data —
// confirmed via a direct database read before this test was written) revisits
// a course he is already taking, to confirm the interface gives him no way to
// trigger a second enrolment in the same course.
test('LEARNER-08: revisiting an already-enrolled course offers no way to enrol again', async ({ page }) => {
  await loginAs(page, 'haziq.learner@acess.edu.my')
  await page.goto(`/learner/courses/${COURSE_ID}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  const bodyText = await page.locator('body').innerText()
  console.log('LEARNER-08: course detail page state:', bodyText.slice(0, 800))

  // The real "Enroll in Course" control must not be offered at all once
  // already enrolled — it is replaced by a "Continue Learning" control.
  await expect(page.getByRole('button', { name: /^enroll in course$/i })).toHaveCount(0)
  await expect(page.getByText(/continue learning/i).first()).toBeVisible({ timeout: 10000 })
})
