import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { loginAs } from './helpers'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

// Re-verified 2026-09-03 by actually running this test: the original lesson
// (a94024eb-8ee6-4b77-b2a7-92387b8bfd54, course 327d4d84-379e-4e6a-8b59-
// 3101cf5f2da6) does not exist in the current database (a direct read of
// both the lessons and enrollments tables returned zero rows) — stale from
// an earlier seed generation, replaced with a lesson amir is actually
// enrolled in and has not completed (confirmed via a direct read).
const LESSON_ID = '817e7009-a633-4a9d-8566-111aac08e756' // "Capturing Notes That You Will Actually Reread"
const COURSE_ID = '3b8323c6-ce4c-49b4-a1b9-4e2cc692eb46' // "Digital Tools for Independent Learning"

// Learner (amir, ADHD persona) applies the ADHD preset through the real
// Accessibility settings modal, then completes a genuinely incomplete
// lesson (confirmed via a direct read before this test ran) through the
// real UI.
//
// Fixed 2026-09-03 (docs/testing-report.md, LEARNER-02 defect): ADHD forces
// `effectiveFocusMode` true, and every content section in this component —
// including the real "Complete Lesson" button — only reveals itself once
// `currentFocusId` (driven by `focusStep`) reaches the right step. The only
// UI that ever calls `setFocusStep` — the "Focus Mode Slide Navigation" bar
// (LessonViewPage.tsx, right below the ReadingToolbar block) — used to gate
// on the raw `focusMode` flag (only set by a manual toggle button, itself
// hidden whenever `simplifiedMode` is true) instead of `effectiveFocusMode`
// (which ADHD sets via a completely different branch, without ever
// touching the raw flag). Since ADHD's `simplifiedMode` is also always
// true, that combination meant the navigation bar could never render for
// ADHD users, `focusStep` stayed stuck at 0 for the whole lesson, and the
// real completion button — which only shows at the last step
// (`currentFocusId === 'summary'`) — was permanently unreachable. Fixed by
// keying that bar on `effectiveFocusMode` (the same condition every section
// it controls already uses) instead of the raw flag. This test now drives
// that real navigation bar exactly as a learner would: confirm it renders,
// scroll through the Content step to satisfy its own gate, jump to the
// Summary step, and complete the lesson for real.
test('LEARNER-02: apply ADHD preset then complete a lesson via the focus-mode navigation', async ({ page }) => {
  const { data: amirUser } = await admin.from('users').select('id').eq('email', 'amir.learner@acess.edu.my').single()
  const { data: priorProfile } = await admin.from('user_profiles').select('accessibility_prefs').eq('user_id', amirUser!.id).single()
  const priorPrefs = priorProfile?.accessibility_prefs
  const { data: enrollment } = await admin.from('enrollments').select('id').eq('course_id', COURSE_ID).eq('user_id', amirUser!.id).single()

  try {
    await loginAs(page, 'amir.learner@acess.edu.my')

    // amir's own seeded profile has distraction_free_mode: true directly
    // (independent of the ADHD preset's forced effectiveFocusMode this test
    // is about), which hides the whole sidebar — including the
    // "Accessibility" nav link this test needs next. Exit it first, the
    // same real control a learner would use, if it's showing.
    const exitDistractionFree = page.getByRole('button', { name: /exit distraction free mode/i })
    if (await exitDistractionFree.isVisible().catch(() => false)) {
      await exitDistractionFree.click()
      await page.waitForTimeout(500)
    }

    await page.getByText('Accessibility', { exact: true }).click()
    await page.getByRole('button', { name: 'ADHD', exact: true }).click()
    const applyButton = page.getByRole('button', { name: 'Apply preset', exact: true })
    await expect(applyButton).toBeVisible({ timeout: 5000 })
    await applyButton.click()
    await page.waitForTimeout(500)
    const saveButton = page.getByRole('button', { name: 'Save Settings', exact: true })
    if (await saveButton.isVisible().catch(() => false)) await saveButton.click()
    await page.waitForTimeout(1000)

    await page.goto(`/learner/lesson/${LESSON_ID}?courseId=${COURSE_ID}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)
    await expect(page.getByText('Lesson not found')).not.toBeVisible()

    // The regression check for the actual fix: this bar (title + "N / M" +
    // Prev/Next arrows + Exit + the step pills) must render for an ADHD
    // learner now — it never did before the fix.
    const stepCounter = page.getByText(/^\d+ \/ \d+$/)
    await expect(stepCounter, 'the focus-mode step navigation bar should render for ADHD learners').toBeVisible({ timeout: 10000 })
    console.log('LEARNER-02: focus-mode navigation bar is visible (this used to never render for ADHD)')

    // Satisfy the Content step's own gate (the scroll tracker listens on
    // #main-content specifically, not window — LessonViewPage.tsx:693)
    // while it's the active step, exactly like a real learner reading it.
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

    // Advance to the last step ("Summary") via the real Next arrow, the
    // same control a learner has to discover and use.
    const nextArrow = page.getByRole('button', { name: 'Next section' })
    for (let i = 0; i < 5; i++) {
      const disabled = await nextArrow.isDisabled().catch(() => true)
      if (disabled) break
      await nextArrow.click()
      await page.waitForTimeout(500)
    }
    console.log('LEARNER-02: step counter after advancing:', await stepCounter.innerText().catch(() => 'unknown'))

    const completeButton = page.getByRole('button', { name: 'Complete Lesson', exact: true })
    await completeButton.scrollIntoViewIfNeeded()
    await expect(completeButton, 'a clickable lesson-completion control should be reachable under the ADHD preset once the focus-mode nav bar can actually advance to the last step').toBeVisible({ timeout: 10000 })
    await completeButton.click()
    await page.waitForTimeout(1500)

    // Clicking Complete Lesson while a gate is still unmet opens the
    // "Incomplete Tasks" popup instead of completing — close it and retry
    // once in case a gate hadn't registered yet, same as a real learner
    // re-checking the checklist and clicking again.
    const gotIt = page.getByRole('button', { name: 'Got it', exact: true })
    if (await gotIt.isVisible().catch(() => false)) {
      console.log('LEARNER-02: "Incomplete Tasks" popup appeared on first click — closing and retrying once')
      await gotIt.click()
      await page.waitForTimeout(500)
      await completeButton.click()
      await page.waitForTimeout(1500)
    }

    const { data: progress } = await admin.from('lesson_progress').select('is_completed').eq('lesson_id', LESSON_ID).eq('enrollment_id', enrollment!.id).maybeSingle()
    console.log('LEARNER-02: lesson_progress.is_completed in the database =', progress?.is_completed)
    expect(progress?.is_completed).toBe(true)
  } finally {
    const { error } = await admin.from('user_profiles').update({ accessibility_prefs: priorPrefs }).eq('user_id', amirUser!.id)
    console.log('LEARNER-02 teardown: amir accessibility_prefs restored:', error ? 'FAILED — ' + error.message : 'ok')
    const { error: progErr } = await admin.from('lesson_progress').update({ is_completed: false, progress_meta: {} }).eq('lesson_id', LESSON_ID).eq('enrollment_id', enrollment!.id)
    console.log('LEARNER-02 teardown: lesson_progress reverted to incomplete:', progErr ? 'FAILED — ' + progErr.message : 'ok')
  }
})
