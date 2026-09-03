import { launch, login, shot } from './shot.mjs'
const browser = await launch()
let page
for (let i = 0; i < 5; i++) {
  page = await login(browser, 'aisyah.learner@acess.edu.my')
  if (!page.url().includes('/login')) break
  await page.context().close(); await new Promise(r => setTimeout(r, 8000))
}
console.log('logged in ->', page.url())

await shot(page, '/learner/courses', 'learner-courses')
await shot(page, '/learner/progress', 'learner-progress')
await shot(page, '/learner/certificates', 'learner-certificates')
await shot(page, '/learner/achievements', 'learner-achievements')

// Accessibility settings modal
await page.goto('http://localhost:3000/learner', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
const btn = page.getByRole('button', { name: /accessibility/i }).first()
await btn.click({ timeout: 10000 }).catch(e => console.log('click fail', e.message))
await page.waitForTimeout(3500)
await shot(page, null, 'a11y-settings-modal', { wait: 1500 })
await browser.close()
