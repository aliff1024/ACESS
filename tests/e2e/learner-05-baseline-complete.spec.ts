import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { loginAs } from './helpers'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const LESSON_ID = '9d66d299-bdab-4f12-90fb-b4648e822366' // "Mapping the Structure of an Argument"
const COURSE_ID = '3b260c23-38ac-4012-9d69-ac7519a1123e' // "Advanced Comprehension Strategies"

// Learner (aisyah, no accessibility preset — active_preset: 'none') completes a
// genuinely incomplete lesson (confirmed via a direct read before this test
// ran) through the real, un-modified lesson page. This is the baseline control
// for LEARNER-02 (ADHD) and LEARNER-07 (Autism): if the plain "Complete
// Lesson" button works here but not under a preset, that isolates the defect
// to the preset's layout rather than the lesson page in general.
test('LEARNER-05: complete a lesson with no accessibility preset active', async ({ page }) => {
  await loginAs(page, 'aisyah.learner@acess.edu.my')
  await page.goto(`/learner/lesson/${LESSON_ID}?courseId=${COURSE_ID}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1000)

  const completeButton = page.getByRole('button', { name: 'Complete Lesson', exact: true })
  await expect(completeButton).toBeVisible({ timeout: 10000 })
  await completeButton.click()
  await page.waitForTimeout(2000)
  console.log('LEARNER-05: clicked Complete Lesson, URL =', page.url())

  const { data: lesson } = await admin.from('lessons').select('id').eq('id', LESSON_ID).single()
  const { data: enrollment } = await admin.from('enrollments').select('id').eq('course_id', COURSE_ID).eq('user_id', (await admin.from('users').select('id').eq('email', 'aisyah.learner@acess.edu.my').single()).data!.id).single()
  const { data: progress } = await admin.from('lesson_progress').select('is_completed').eq('lesson_id', lesson!.id).eq('enrollment_id', enrollment!.id).maybeSingle()
  console.log('LEARNER-05: lesson_progress.is_completed in the database =', progress?.is_completed)
  expect(progress?.is_completed).toBe(true)

  // Teardown: revert this lesson to incomplete so a re-run starts clean.
  const { error } = await admin.from('lesson_progress').update({ is_completed: false }).eq('lesson_id', lesson!.id).eq('enrollment_id', enrollment!.id)
  console.log('LEARNER-05 teardown: lesson_progress reverted to incomplete:', error ? 'FAILED — ' + error.message : 'ok')
})
