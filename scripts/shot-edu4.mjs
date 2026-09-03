import { launch, login } from './shot.mjs'
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
const clickText = async (page, re) => page.evaluate((src) => {
  const rx = new RegExp(src, 'i')
  const b = [...document.querySelectorAll('button')].find(x => rx.test((x.textContent || '').trim()))
  if (!b) return false; b.scrollIntoView({ block: 'center' }); b.click(); return true
}, re)

const page = await loginRetry('siti.educator@acess.edu.my')
await page.goto('http://localhost:3000/educator/courses/75e82100-5247-4e84-9401-d8804fea37a0', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(10000)
await clickText(page, '^Settings$')
await page.waitForTimeout(6000)
console.log('audit toggle:', await clickText(page, 'Accessibility Compliance Audit'))
await page.waitForTimeout(5000)
await page.screenshot({ path: `${OUT}/educator-course-audit-full.png`, fullPage: true })
console.log('OK educator-course-audit-full')

// viewport-sized shot anchored on the audit panel
const el = await page.$('#course-accessibility-audit')
if (el) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(1200) }
await page.screenshot({ path: `${OUT}/educator-course-audit.png` })
console.log('OK educator-course-audit')

// open the weakest lesson's checklist
const opened = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('button[title="Open this lesson\'s accessibility checklist"]')]
  if (!cards.length) return -1
  let best = cards[0], low = 999
  for (const c of cards) { const m = (c.textContent || '').match(/(\d+)%/); if (m && +m[1] < low) { low = +m[1]; best = c } }
  best.click(); return low
})
console.log('opened lesson score', opened)
if (opened >= 0) {
  await page.waitForTimeout(10000)
  await page.screenshot({ path: `${OUT}/educator-a11y-compliance.png` })
  await page.screenshot({ path: `${OUT}/educator-a11y-compliance-full.png`, fullPage: true })
  console.log('OK educator-a11y-compliance')
}
await browser.close()
