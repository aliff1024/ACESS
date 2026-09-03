import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { loginAs } from './helpers'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const LESSON_ID = '7e23d0a9-0654-4017-a66a-5da3355d4d26' // "Dictation and Voice Typing" (has_video=true)
const COURSE_ID = '3b8323c6-ce4c-49b4-a1b9-4e2cc692eb46' // "Digital Tools for Independent Learning"

// Retest 2026-09-03 (docs/testing-report.md, A11Y-04): closing the lesson
// page's "Incomplete Tasks" popup (LessonViewPage.tsx:2968, a Radix Dialog)
// used to leave document.body permanently stuck at
// `style="pointer-events: none"` — confirmed via getComputedStyle both by
// hand and in 2 independent automated runs, root-caused to
// @radix-ui/react-dismissable-layer's module-level (not per-dialog)
// bookkeeping of "how many layers currently want outside pointer events
// disabled" getting out of sync with 5 sibling Dialog roots in
// LessonViewPage.tsx. Fixed with a small watchdog
// (src/components/ui/dialog-pointer-events-guard.tsx, mounted once in
// src/app/providers.tsx) that clears any stray lock once no Radix
// dialog/alertdialog is actually open — reacting to the dialog's own close
// button, but also, per the original ask, Escape and outside-click, since
// Radix treats all three as the same "layer closed" event and none of them
// reliably left the lock cleared before this fix.
test('A11Y-04: closing the "Incomplete Tasks" popup leaves the page usable — own close button, Escape, and outside click', async ({ page }) => {
  const { data: userRow } = await admin.from('users').select('id').eq('email', 'mei.learner@acess.edu.my').single()
  const { data: enrollment } = await admin.from('enrollments').select('id').eq('course_id', COURSE_ID).eq('user_id', userRow!.id).single()

  const dismissalPaths: Array<{ name: string; dismiss: (page: import('@playwright/test').Page) => Promise<void> }> = [
    { name: 'its own "Got it" button', dismiss: async (p) => { await p.getByRole('button', { name: 'Got it', exact: true }).click() } },
    { name: 'Escape', dismiss: async (p) => { await p.keyboard.press('Escape') } },
    { name: 'clicking outside the dialog', dismiss: async (p) => { await p.mouse.click(10, 10) } },
  ]

  try {
    for (const { name, dismiss } of dismissalPaths) {
      // Re-verified 2026-09-03: lesson_progress.progress_meta independently
      // caches {video, scroll, activity} booleans read fresh on every page
      // load — resetting only is_completed between iterations wasn't
      // enough, because clicking "I have watched this video" once earlier
      // in a run (or a prior run entirely) leaves progress_meta.video=true
      // forever after, and once every gate happens to already read true
      // clicking Complete Lesson finishes the lesson directly instead of
      // opening the popup this test needs — resetting BOTH before every
      // single dismissal attempt, not just once at the top, keeps every
      // iteration on a genuinely fresh incomplete lesson regardless of what
      // the previous iteration (or a previous run) satisfied.
      await admin.from('lesson_progress').update({ is_completed: false, progress_meta: {} }).eq('lesson_id', LESSON_ID).eq('enrollment_id', enrollment!.id)

      await loginAs(page, 'mei.learner@acess.edu.my')
      await page.goto(`/learner/lesson/${LESSON_ID}?courseId=${COURSE_ID}`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)

      const completeButton = page.getByRole('button', { name: 'Complete Lesson', exact: true })
      await completeButton.scrollIntoViewIfNeeded()
      await expect(completeButton).toBeVisible({ timeout: 10000 })

      const dialogTitle = page.getByText('Incomplete Tasks', { exact: true })
      await completeButton.click()
      await expect(dialogTitle).toBeVisible({ timeout: 5000 })
      await dismiss(page)
      await expect(dialogTitle).not.toBeVisible({ timeout: 5000 })

      const pointerEvents = await page.evaluate(() => getComputedStyle(document.body).pointerEvents)
      console.log(`A11Y-04: dismissed via ${name} — document.body pointer-events =`, pointerEvents)
      expect(pointerEvents, `body should stay clickable after the dialog is dismissed via ${name}`).not.toBe('none')

      // A style check alone can't be faked past — also prove a real click
      // elsewhere on the page still lands where it should.
      const listenButton = page.getByRole('button', { name: /^listen$/i }).first()
      if (await listenButton.isVisible().catch(() => false)) {
        await listenButton.click({ timeout: 5000 })
        console.log(`A11Y-04: a real click after dismissing via ${name} landed successfully`)
      }
    }
  } finally {
    await admin.from('lesson_progress').update({ is_completed: false, progress_meta: {} }).eq('lesson_id', LESSON_ID).eq('enrollment_id', enrollment!.id)
    console.log('A11Y-04 teardown: lesson_progress reset')
  }
})
