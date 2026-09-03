import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { loginAs } from './helpers'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const LESSON_ID = 'f1b91035-365c-4927-8629-aeb770f997bd' // "Beating the Starting Problem"
const COURSE_ID = 'c2c9deb5-bb08-412a-8bac-739edd3cdaf1' // "Focus and Study Skills for ADHD Learners"

// Learner (priya, Autism persona — active_preset: 'autism', step_by_step_enabled
// and visual_schedule_enabled both true). Reading LessonViewPage.tsx directly
// (src/components/courses/LessonViewPage.tsx:1266) shows guidedMode is true
// whenever activePreset === 'autism', exactly as it is for ADHD — so this
// lesson is expected to render as a step-by-step guided sequence, the same
// shape as the ADHD case in LEARNER-02. Unlike LEARNER-02, this test actually
// drives the guided "Continue to next section" control across every step
// (this is the real, intended path per ChunkNavigation.tsx:164) rather than
// only checking whether a completion control is visible on first load, so a
// genuinely reachable-but-undiscoverable flow is not misreported as fully broken.
test('LEARNER-07: navigate the guided flow and attempt to complete a lesson under the Autism preset', async ({ page }) => {
  const { data: priyaUser } = await admin.from('users').select('id').eq('email', 'priya.learner@acess.edu.my').single()
  const { data: enrollment } = await admin.from('enrollments').select('id').eq('course_id', COURSE_ID).eq('user_id', priyaUser!.id).single()

  try {
    await loginAs(page, 'priya.learner@acess.edu.my')
    await page.goto(`/learner/lesson/${LESSON_ID}?courseId=${COURSE_ID}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const stepBadgeVisible = await page.getByText(/step \d of \d/i).first().isVisible().catch(() => false)
    console.log('LEARNER-07: guided step-by-step badge visible on load:', stepBadgeVisible)

    const completeButton = page.getByRole('button', { name: 'Complete Lesson', exact: true })
    let reachedFinish = await completeButton.isVisible().catch(() => false)
    let stepsClicked = 0
    const stepLog: string[] = []

    while (!reachedFinish && stepsClicked < 10) {
      const continueBtn = page.getByRole('button', { name: /continue to next section/i }).first()
      const isContinueVisible = await continueBtn.isVisible().catch(() => false)
      if (!isContinueVisible) {
        stepLog.push(`step ${stepsClicked}: no "Continue to next section" button found — guided flow stalled or ended without reaching finish`)
        break
      }
      const disabled = await continueBtn.isDisabled().catch(() => false)
      if (disabled) {
        const bodyText = await page.locator('body').innerText()
        stepLog.push(`step ${stepsClicked}: "Continue to next section" is disabled (likely a checkpoint gate). Visible text near it: ${bodyText.slice(0, 300)}`)
        break
      }
      await continueBtn.click()
      await page.waitForTimeout(700)
      stepsClicked++
      reachedFinish = await completeButton.isVisible().catch(() => false)
      stepLog.push(`step ${stepsClicked}: clicked Continue, Complete Lesson visible = ${reachedFinish}`)
    }

    console.log('LEARNER-07: guided-flow walk log:\n' + stepLog.join('\n'))
    console.log('LEARNER-07: reached a visible "Complete Lesson" control:', reachedFinish)

    if (reachedFinish) {
      await completeButton.click()
      await page.waitForTimeout(2000)
      const { data: progress } = await admin.from('lesson_progress').select('is_completed').eq('lesson_id', LESSON_ID).eq('enrollment_id', enrollment!.id).maybeSingle()
      console.log('LEARNER-07: lesson_progress.is_completed in the database =', progress?.is_completed)
      expect(progress?.is_completed).toBe(true)
    } else {
      // Recorded as a genuine finding either way — this assertion documents
      // whichever outcome the real guided flow actually produced.
      expect(reachedFinish, 'the Autism preset\'s guided flow should eventually expose a completion control, matching the baseline (LEARNER-05) lesson page').toBeTruthy()
    }
  } finally {
    const { error } = await admin.from('lesson_progress').update({ is_completed: false }).eq('lesson_id', LESSON_ID).eq('enrollment_id', enrollment!.id)
    console.log('LEARNER-07 teardown: lesson_progress reverted to incomplete:', error ? 'FAILED — ' + error.message : 'ok')
  }
})
