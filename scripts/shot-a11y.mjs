import { launch, login, shot } from './shot.mjs'
const browser = await launch()
let page
for (let i = 0; i < 5; i++) {
  page = await login(browser, 'aisyah.learner@acess.edu.my')
  if (!page.url().includes('/login')) break
  await page.context().close(); await new Promise(r => setTimeout(r, 8000))
}
await page.goto('http://localhost:3000/learner', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)
const items = await page.locator('aside[data-sidebar] button, aside[data-sidebar] a').allTextContents()
console.log('nav items:', JSON.stringify(items))
await page.locator('aside[data-sidebar] button, aside[data-sidebar] a').filter({ hasText: /accessibility/i }).first().click({ timeout: 8000 })
await page.waitForTimeout(4000)
await shot(page, null, 'a11y-settings-modal', { wait: 1500 })
const tabs = await page.getByRole('tab').allTextContents()
console.log('tabs:', JSON.stringify(tabs))
await browser.close()
