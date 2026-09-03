import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { loginAs } from './helpers'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

// Learner (amir, ADHD persona) applies the ADHD preset through the real
// Accessibility settings modal, then attempts to complete a genuinely
// incomplete lesson (confirmed via a direct read before this test ran)
// through whatever completion control the real lesson page offers under
// that preset. This test is expected to fail — see the assertion below.
test('LEARNER-02: apply ADHD preset then attempt to complete a lesson', async ({ page }) => {
  const { data: amirUser } = await admin.from('users').select('id').eq('email', 'amir.learner@acess.edu.my').single()
  const { data: priorProfile } = await admin.from('user_profiles').select('accessibility_prefs').eq('user_id', amirUser!.id).single()
  const priorPrefs = priorProfile?.accessibility_prefs

  try {
    await loginAs(page, 'amir.learner@acess.edu.my')

    await page.getByText('Accessibility', { exact: true }).click()
    await page.getByRole('button', { name: 'ADHD', exact: true }).click()
    const applyButton = page.getByRole('button', { name: 'Apply preset', exact: true })
    await expect(applyButton).toBeVisible({ timeout: 5000 })
    await applyButton.click()
    await page.waitForTimeout(500)
    const saveButton = page.getByRole('button', { name: 'Save Settings', exact: true })
    if (await saveButton.isVisible().catch(() => false)) await saveButton.click()
    await page.waitForTimeout(1000)

    await page.goto('/learner/lesson/a94024eb-8ee6-4b77-b2a7-92387b8bfd54?courseId=327d4d84-379e-4e6a-8b59-3101cf5f2da6')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // The baseline (no-preset) version of this exact lesson has a real
    // "Complete Lesson" <button> (confirmed separately, same lesson id, no
    // preset active). Under the ADHD preset's chunked/distraction-free
    // layout, look for any equivalent control among every clickable element
    // on the page.
    const allClickable = await page.locator('button, [role="button"], a').all()
    const labels: string[] = []
    for (const el of allClickable) labels.push((await el.innerText().catch(() => '')).replace(/\s+/g, ' ').trim())

    const completionControl = labels.find((l) => /complete lesson|mark.*complete|finish lesson/i.test(l))
    console.log('LEARNER-02: clickable elements on the lesson page under the ADHD preset:', JSON.stringify(labels))
    console.log('LEARNER-02: completion control found:', completionControl ?? 'NONE')

    // This assertion is expected to fail on the current build: no clickable
    // completion control exists under this preset, even though "Complete
    // Lesson" text appears on screen as a plain checklist label. Recorded as
    // a genuine defect in Table 6.9 rather than worked around.
    expect(completionControl, 'a clickable lesson-completion control should exist under the ADHD preset, matching the baseline lesson page').toBeTruthy()
  } finally {
    // Teardown always runs, whether the assertion above passes or fails:
    // restore amir's accessibility_prefs to what they were before this test.
    const { error } = await admin.from('user_profiles').update({ accessibility_prefs: priorPrefs }).eq('user_id', amirUser!.id)
    console.log('LEARNER-02 teardown: amir accessibility_prefs restored:', error ? 'FAILED — ' + error.message : 'ok')
  }
})
