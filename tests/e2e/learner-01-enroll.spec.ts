import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { loginAs } from './helpers'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
// Re-verified 2026-09-03 by actually running this test: the original
// TARGET_COURSE_ID (2a7e86c1-4461-47c0-be7f-5fd16d7b26a6) no longer exists in
// the local database — a direct read returned zero rows, stale from an
// earlier seed generation. It was silently causing a timeout waiting for
// "Course Lessons" text that could never appear. Replaced with a course
// confirmed both to exist and to be unenrolled by haziq via a direct read.
const TARGET_COURSE_ID = 'c2c9deb5-bb08-412a-8bac-739edd3cdaf1' // "Focus and Study Skills for ADHD Learners"

// Learner (baseline persona: haziq, "still exploring which courses to
// follow") enrols in a course through the real catalogue UI. The target
// course id was confirmed unenrolled via a direct read immediately before
// this test ran, so the test drives a real, known-fresh enrolment rather
// than guessing at the first card's state. Teardown drops the enrolment
// again so a re-run starts from the same state.
test('LEARNER-01: enrol in a course through the catalogue', async ({ page }) => {
  await loginAs(page, 'haziq.learner@acess.edu.my')
  await page.goto(`/learner/courses/${TARGET_COURSE_ID}`)
  await page.getByText('Course Lessons', { exact: false }).waitFor({ timeout: 15000 })

  const enrollButton = page.getByRole('button', { name: 'Enroll in Course', exact: true })
  await expect(enrollButton).toBeVisible({ timeout: 10000 })
  await enrollButton.click()
  await page.waitForTimeout(1500)
  await expect(enrollButton).not.toBeVisible({ timeout: 10000 })
  console.log('LEARNER-01: clicked Enroll in Course, button is gone (enrolled), URL =', page.url())

  const { data: haziq } = await admin.from('users').select('id').eq('email', 'haziq.learner@acess.edu.my').single()
  const { data: enrollment } = await admin.from('enrollments').select('id, status').eq('user_id', haziq!.id).eq('course_id', TARGET_COURSE_ID).maybeSingle()
  console.log('LEARNER-01: enrollment confirmed in the database, status =', enrollment?.status)
  expect(enrollment?.status).toBe('active')

  const { error } = await admin.from('enrollments').delete().eq('id', enrollment!.id)
  console.log('LEARNER-01 teardown: enrolment removed:', error ? 'FAILED — ' + error.message : 'ok')
})
