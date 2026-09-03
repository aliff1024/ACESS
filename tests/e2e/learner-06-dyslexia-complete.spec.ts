import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { loginAs } from './helpers'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const LESSON_ID = '7e23d0a9-0654-4017-a66a-5da3355d4d26' // "Dictation and Voice Typing"
const COURSE_ID = '3b8323c6-ce4c-49b4-a1b9-4e2cc692eb46' // "Digital Tools for Independent Learning"

// Learner (mei, Dyslexia persona — active_preset: 'dyslexia', OpenDyslexic font,
// cream background, reading spotlight, no chunked/guided layout override)
// completes a genuinely incomplete lesson (confirmed via a direct read before
// this test ran) through the real lesson page with her own preset already
// active from login. Unlike the ADHD and Autism presets, the Dyslexia preset
// does not set step_by_step_enabled, so LessonViewPage's guidedMode should
// stay false and the plain "Complete Lesson" button should behave like the
// baseline (LEARNER-05) — this test checks that assumption against the real UI.
test('LEARNER-06: complete a lesson under the Dyslexia preset', async ({ page }) => {
  const { data: userRow } = await admin.from('users').select('id').eq('email', 'mei.learner@acess.edu.my').single()
  const { data: enrollment } = await admin.from('enrollments').select('id').eq('course_id', COURSE_ID).eq('user_id', userRow!.id).single()

  // Re-verified 2026-09-03: is_completed isn't the only persisted state here
  // — lesson_progress.progress_meta independently caches {video, scroll,
  // activity} booleans, read fresh on every page load (confirmed directly:
  // a prior successful run of this exact test left progress_meta with
  // video/scroll/activity all true, which made the lesson complete itself
  // via the tracker before this test ever got a chance to click anything,
  // and made LEARNER-06 and A11Y-04 both fail with "Complete Lesson" simply
  // not existing in the DOM — lessonCompleted was already true on load).
  // Resetting only is_completed left this exact trap for the next run, so
  // both are reset here, unconditionally, before the test does anything.
  await admin.from('lesson_progress').update({ is_completed: false, progress_meta: {} }).eq('lesson_id', LESSON_ID).eq('enrollment_id', enrollment!.id)

  try {
    await loginAs(page, 'mei.learner@acess.edu.my')
    await page.goto(`/learner/lesson/${LESSON_ID}?courseId=${COURSE_ID}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
    console.log('LEARNER-06: body font-family under Dyslexia preset =', bodyFont)

    // This lesson has has_video=true (confirmed via a direct read), and
    // LessonViewPage's own completion check (LessonViewPage.tsx:2657-2667)
    // requires the video tracker satisfied before Complete Lesson does
    // anything but open an "Incomplete Tasks" popup. The real control for
    // that gate is "I have watched this video"; click it first, matching
    // what a real learner has to do.
    const watchedButton = page.getByRole('button', { name: /i have watched this video/i })
    if (await watchedButton.isVisible().catch(() => false)) {
      await watchedButton.click()
      await page.waitForTimeout(500)
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1000)

    const completeButton = page.getByRole('button', { name: 'Complete Lesson', exact: true })
    const visible = await completeButton.isVisible().catch(() => false)
    console.log('LEARNER-06: "Complete Lesson" button visible without extra navigation:', visible)

    if (!visible) {
      // Fall back to whatever guided/chunk "Continue" control exists, same
      // real-world path a learner would have to discover.
      for (let i = 0; i < 8 && !(await completeButton.isVisible().catch(() => false)); i++) {
        const cont = page.getByRole('button', { name: /continue to next section|next section|^next$/i })
        if (!(await cont.first().isVisible().catch(() => false))) break
        await cont.first().click()
        await page.waitForTimeout(600)
      }
    }

    console.log('LEARNER-06: "Complete Lesson" reachable at all:', await completeButton.isVisible().catch(() => false))
    await expect(completeButton).toBeVisible({ timeout: 5000 })
    await completeButton.click()
    await page.waitForTimeout(2000)

    const { data: progress } = await admin.from('lesson_progress').select('is_completed').eq('lesson_id', LESSON_ID).eq('enrollment_id', enrollment!.id).maybeSingle()
    console.log('LEARNER-06: lesson_progress.is_completed in the database =', progress?.is_completed)
    expect(progress?.is_completed).toBe(true)
  } finally {
    const { error } = await admin.from('lesson_progress').update({ is_completed: false, progress_meta: {} }).eq('lesson_id', LESSON_ID).eq('enrollment_id', enrollment!.id)
    console.log('LEARNER-06 teardown: lesson_progress reverted to incomplete:', error ? 'FAILED — ' + error.message : 'ok')
  }
})
