import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { loginAs } from './helpers'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const APPLICANT_EMAIL = 'e2e-reject-temp@example.com'

// Administrator rejects a pending instructor application through the real
// Educator Applications UI — the opposite decision to ADMIN-01's approval.
// Every existing pending application in the seed data is already used by
// ADMIN-01, so a genuine, throwaway pending application is created directly
// in the database first (the same real table the admin approval path
// writes to), then removed again in teardown, the same pattern EDUCATOR-01
// uses for its own throwaway test course.
test('ADMIN-02: reject a pending instructor application', async ({ page }) => {
  const { data: created, error: createError } = await admin
    .from('instructor_applications')
    .insert({ full_name: 'E2E Reject Test Applicant', email: APPLICANT_EMAIL, status: 'pending', experience: 'N/A', reason: 'Created by the automated suite to exercise the rejection path.' })
    .select('id')
    .single()
  if (createError || !created) throw new Error(`Could not create the temporary pending application: ${createError?.message}`)

  try {
    await loginAs(page, 'aliff.admin@acess.edu.my')
    await page.goto('/admin/instructor-applications')
    await page.waitForLoadState('networkidle')
    await page.getByText('E2E Reject Test Applicant', { exact: true }).click()
    await page.waitForTimeout(1000)

    await page.getByRole('button', { name: /^reject$/i }).first().click()
    await page.waitForTimeout(500)
    const confirmButton = page.getByRole('button', { name: 'Confirm Rejection', exact: true })
    await expect(confirmButton).toBeVisible({ timeout: 5000 })
    await confirmButton.click()
    await page.waitForTimeout(2000)

    const { data: appRow } = await admin.from('instructor_applications').select('status').eq('id', created.id).single()
    console.log('ADMIN-02: application status in the database after clicking Reject:', appRow?.status)
    expect(appRow?.status).toBe('rejected')
  } finally {
    const { error } = await admin.from('instructor_applications').delete().eq('id', created.id)
    console.log('ADMIN-02 teardown: temporary application removed:', error ? 'FAILED — ' + error.message : 'ok')
  }
})
