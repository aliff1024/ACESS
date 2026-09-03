import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { loginAs } from './helpers'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const COURSE_TITLE = 'Playwright E2E Test Course'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

// Educator (farah, "still preparing her first courses") creates a course
// through the real 4-step course wizard, then edits it, through the real UI.
test('EDUCATOR-01 and EDUCATOR-02: create then edit a course', async ({ page }) => {
  await loginAs(page, 'farah.educator@acess.edu.my')

  // EDUCATOR-01: create, through all four real wizard steps.
  await page.goto('/educator/courses/create')
  await page.waitForTimeout(2000)
  await page.getByPlaceholder('e.g., Introduction to Web Accessibility').fill(COURSE_TITLE)
  const editable = page.locator('[contenteditable="true"]').first()
  if (await editable.count()) {
    await editable.click()
    await editable.fill('Created by the automated Chapter 6 functional suite (Playwright), through the real course wizard.')
  }
  await page.getByRole('button', { name: /^continue$/i }).click()
  await page.waitForTimeout(1000)

  await page.getByText('+ ACCESSIBILITY', { exact: false }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /^continue$/i }).click()
  await page.waitForTimeout(1000)

  await page.getByRole('button', { name: /^continue$/i }).click() // skip lessons
  await page.waitForTimeout(1000)

  await expect(page.getByText('SAVE AS DRAFT', { exact: false }).first()).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: /^create course$/i }).click()
  // Re-verified 2026-09-03: a fixed 2.5s wait here occasionally wasn't
  // enough for the post-create redirect to land (flaky on a loaded dev
  // server), leaving page.url() still on /educator/courses/create when the
  // id-extraction below ran. Wait for the actual redirect instead of a
  // guessed delay.
  await page.waitForURL(/\/educator\/courses\/[0-9a-f-]{36}/, { timeout: 15000 })
  console.log('EDUCATOR-01: after CREATE COURSE, URL =', page.url())

  // Re-verified 2026-09-03: matching this test's own course by title (both
  // here and in the DB check below) is exactly what made it flaky —
  // whenever ANY course happened to share COURSE_TITLE (a leftover from an
  // interrupted prior run, e.g. one that crashed before reaching its own
  // teardown), `.last()` in DOM order picked whichever card the course list
  // happened to render last, not necessarily the one this run just created,
  // and the "edit" that followed silently edited the wrong course while
  // this run's own new course sat untouched — surfacing as
  // primary_disability_focus staying null even though Save Focus worked
  // perfectly well, just on a different row. The wizard's own redirect
  // after creation already lands on /educator/courses/<id>, so extract that
  // id directly and never touch title-matching again.
  const createdCourseId = page.url().match(/\/educator\/courses\/([0-9a-f-]{36})/)?.[1]
  if (!createdCourseId) throw new Error(`Could not extract course id from post-create URL: ${page.url()}`)
  console.log('EDUCATOR-01: created course id =', createdCourseId)

  // The wizard's own client-side course-list cache does not always refresh
  // immediately after creation, so confirm through a fresh navigation to the
  // course list rather than trusting the wizard's own post-submit view.
  await page.goto('/educator/courses')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(COURSE_TITLE, { exact: false }).first()).toBeVisible({ timeout: 10000 })
  console.log('EDUCATOR-01: confirmed course appears in the real course list')

  // EDUCATOR-02: edit the course just created — navigating straight to its
  // known id, not re-finding it by title through the list.
  await page.goto(`/educator/courses/${createdCourseId}`)
  await page.waitForLoadState('networkidle')
  console.log('EDUCATOR-02: edit page URL =', page.url())

  // Make a real edit through the Settings tab: set the course's primary
  // accessibility focus and save it.
  await page.getByRole('button', { name: /^settings$/i }).click()
  await page.waitForTimeout(1500)
  await expect(page.getByText('Course Settings', { exact: false })).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: /^adhd$/i }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /save focus/i }).click()
  await page.waitForTimeout(1500)
  console.log('EDUCATOR-02: set Primary Accessibility Focus to ADHD and clicked Save Focus')

  // Verified against the exact id this run created — see the comment above
  // createdCourseId for why title-matching was dropped entirely, not just
  // ordered/limited.
  const { data: verify } = await admin.from('courses').select('id, primary_disability_focus').eq('id', createdCourseId).single()
  try {
    console.log('EDUCATOR-02: primary_disability_focus in the database is now:', verify?.primary_disability_focus)
    expect(verify?.primary_disability_focus).toBe('adhd')
  } finally {
    // Teardown: remove the course this test created so a re-run starts clean.
    const { error: cleanupError } = await admin.from('courses').delete().eq('id', createdCourseId)
    console.log('EDUCATOR teardown: test course deleted:', cleanupError ? 'FAILED — ' + cleanupError.message : 'ok')
  }
})
