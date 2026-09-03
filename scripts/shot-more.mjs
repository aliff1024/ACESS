import { launch, login, shot } from './shot.mjs'
const browser = await launch()

async function loginRetry(email) {
  for (let i = 0; i < 6; i++) {
    const p = await login(browser, email)
    if (!p.url().includes('/login')) return p
    await p.context().close(); await new Promise(r => setTimeout(r, 9000))
  }
  throw new Error('login failed ' + email)
}

// ── Learner: preset details dialog + quiz
let page = await loginRetry('aisyah.learner@acess.edu.my')
await page.goto('http://localhost:3000/learner', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)
await page.locator('aside[data-sidebar] button, aside[data-sidebar] a').filter({ hasText: /accessibility/i }).first().click()
await page.waitForTimeout(3000)
await page.getByRole('button', { name: /^dyslexia$/i }).first().click().catch(e => console.log('preset click', e.message))
await page.waitForTimeout(3000)
await shot(page, null, 'a11y-preset-details', { wait: 1500 })
await page.keyboard.press('Escape'); await page.waitForTimeout(800)
await page.keyboard.press('Escape'); await page.waitForTimeout(800)

await shot(page, '/learner/quiz/60b2b865-7ddf-4b8b-8c02-fe8ed6a49661', 'learner-quiz', { wait: 6000 })
await page.context().close()

// ── Educator
page = await loginRetry('siti.educator@acess.edu.my')
await shot(page, '/educator', 'educator-dashboard', { wait: 6000 })
await shot(page, '/educator/courses', 'educator-courses', { wait: 5000 })
await shot(page, '/educator/courses/75e82100-5247-4e84-9401-d8804fea37a0', 'educator-course-workspace', { wait: 7000 })
await shot(page, '/educator/analytics', 'educator-analytics', { wait: 7000 })
await shot(page, '/educator/students', 'educator-students', { wait: 6000 })
await page.context().close()

// ── Admin
page = await loginRetry('aliff.admin@acess.edu.my')
await shot(page, '/admin', 'admin-dashboard', { wait: 7000 })
await shot(page, '/admin/analytics', 'admin-analytics', { wait: 7000 })
await shot(page, '/admin/users', 'admin-users', { wait: 6000 })
await shot(page, '/admin/courses', 'admin-courses', { wait: 6000 })
await shot(page, '/admin/reports', 'admin-reports', { wait: 6000 })
await page.context().close()

await browser.close()
