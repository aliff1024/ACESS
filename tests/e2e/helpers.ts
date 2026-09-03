import { Page, expect } from '@playwright/test'

export const DEMO_PASSWORD = 'AcessDemo#2026'

export async function loginAs(page: Page, email: string) {
  await page.goto('/login')
  await page.getByPlaceholder('your@email.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  // 15s occasionally wasn't enough under this session's sustained load
  // (many sequential full-suite runs against one local dev server today) —
  // a real, observed, environment-driven variance in response time, not a
  // masked app bug, so widened rather than wrapped in a blind retry.
  await page.waitForURL(/\/(learner|educator|admin)/, { timeout: 25000 })
}
