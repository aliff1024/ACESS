import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { loginAs } from './helpers'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

// Administrator approves the real pending instructor application ("Tan Chee
// Meng") through the real Educator Applications UI, then it is reverted to
// pending via the service role so a re-run starts clean.
test('ADMIN-01: approve a pending instructor application', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
  page.on('response', (res) => { if (res.status() >= 400) consoleErrors.push(`HTTP ${res.status()} ${res.url()}`) })
  await loginAs(page, 'aliff.admin@acess.edu.my')
  await page.goto('/admin/instructor-applications')
  await page.waitForLoadState('networkidle')
  await page.getByText('Tan Chee Meng', { exact: true }).click()
  await page.waitForTimeout(1000)
  await expect(page.getByText('pending', { exact: true }).first()).toBeVisible({ timeout: 10000 })

  await page.getByRole('button', { name: /^approve$/i }).first().click()
  await page.waitForTimeout(800)
  // A confirmation dialog appears ("Confirm Approval ... This will activate
  // the educator account with fixed credentials").
  const confirmButton = page.getByRole('button', { name: 'Confirm Approval', exact: true })
  await expect(confirmButton).toBeVisible({ timeout: 5000 })
  await confirmButton.click()
  await page.waitForTimeout(3000)
  console.log('ERRORS DURING APPROVAL:', JSON.stringify(consoleErrors, null, 2))
  console.log('PAGE TEXT AFTER CONFIRM:', (await page.locator('body').innerText()).slice(0, 500))

  const { data: appRow } = await admin
    .from('instructor_applications')
    .select('id, status, reviewed_by')
    .eq('email', 'cheemeng.tan@example.com')
    .single()
  console.log('ADMIN-01: application status in the database after clicking Approve:', appRow?.status, '| reviewed_by:', appRow?.reviewed_by ?? 'NULL — not set by this approval path, unlike updateInstructorApplication() in admin-api.ts')
  // Re-verified 2026-09-03: this assertion sat with no try/finally around
  // the teardown below it — a failed run (this test has been genuinely
  // flaky; see docs/testing-report.md) left the application "approved" and
  // a provisioned account behind, and the NEXT run then failed differently
  // (couldn't even find "pending" text on the row) for a completely
  // unrelated-looking reason. Wrapped so teardown always runs.
  try {
    expect(appRow?.status).toBe('approved')
  } finally {
    // Teardown. Approving this application does more than change its status:
    // it provisions a real educator account for the applicant (confirmed via a
    // direct read — this is not documented behaviour of the UI copy alone, it
    // was found by checking the database). instructor_applications.user_id is
    // ON DELETE CASCADE against users (confirmed the hard way: deleting the
    // provisioned user before clearing this reference deleted the application
    // row along with it, and it had to be restored from a captured copy), so
    // the application's own columns are reset FIRST — severing the user_id
    // link — and only then is the provisioned account deleted.
    const { error } = await admin
      .from('instructor_applications')
      .update({ status: 'pending', admin_notes: null, reviewed_by: null, reviewed_at: null, user_id: null })
      .eq('id', appRow!.id)
    console.log('ADMIN-01 teardown: application reverted to pending:', error ? 'FAILED — ' + error.message : 'ok')

    const { data: newUserRow } = await admin.from('users').select('id').eq('email', 'cheemeng.tan@example.com').maybeSingle()
    if (newUserRow) {
      const { error: authDelErr } = await admin.auth.admin.deleteUser(newUserRow.id)
      console.log('ADMIN-01 teardown: provisioned educator account removed:', authDelErr ? 'FAILED — ' + authDelErr.message : 'ok')
      await admin.from('users').delete().eq('id', newUserRow.id)
    }
  }
})
