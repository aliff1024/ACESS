import { Page, expect } from '@playwright/test'

export const DEMO_PASSWORD = 'AcessDemo#2026'

export async function loginAs(page: Page, email: string) {
  await page.goto('/login')
  await page.getByPlaceholder('your@email.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/(learner|educator|admin)/, { timeout: 15000 })
}
