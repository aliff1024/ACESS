import { launch, login, shot } from './shot.mjs'
const OUT = 'C:/Users/user/OneDrive/Documents/PSM/ACESS-main/Report/Screenshots'
const browser = await launch()
async function loginRetry(email) {
  for (let i = 0; i < 6; i++) {
    const p = await login(browser, email)
    if (!p.url().includes('/login')) return p
    await p.context().close(); await new Promise(r => setTimeout(r, 9000))
  }
  throw new Error('login failed ' + email)
}
const clickText = async (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i')
  const b = [...document.querySelectorAll('button')].find(x => rx.test((x.textContent || '').trim()))
  if (!b) return false; b.scrollIntoView({ block: 'center' }); b.click(); return true
}, src)

// learner: quiz + course detail (enrollment flow)
let page = await loginRetry('aisyah.learner@acess.edu.my')
await shot(page, '/learner/quiz/e10b3af2-8730-4d5b-86ce-33d09090998f', 'learner-quiz', { wait: 7000 })
await shot(page, '/learner/courses/75e82100-5247-4e84-9401-d8804fea37a0', 'learner-course-detail', { wait: 7000 })
await page.context().close()

// admin: accessibility analytics tab
page = await loginRetry('aliff.admin@acess.edu.my')
await page.goto('http://localhost:3000/admin/analytics', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(9000)
console.log('a11y tab:', await clickText(page, '^Accessibility$'))
await page.waitForTimeout(5000)
await page.screenshot({ path: `${OUT}/admin-analytics-accessibility.png` })
await page.screenshot({ path: `${OUT}/admin-analytics-accessibility-full.png`, fullPage: true })
console.log('OK admin-analytics-accessibility')
await page.context().close()
await browser.close()
