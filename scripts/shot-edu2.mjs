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
const page = await loginRetry('siti.educator@acess.edu.my')
await page.goto('http://localhost:3000/educator/courses/75e82100-5247-4e84-9401-d8804fea37a0', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(10000)

for (const tab of ['Overview', 'Settings']) {
  await page.getByRole('button', { name: new RegExp('^' + tab + '$') }).first().click().catch(e => console.log(tab, e.message))
  await page.waitForTimeout(5000)
  await page.screenshot({ path: `${OUT}/educator-workspace-${tab.toLowerCase()}.png`, fullPage: true })
  console.log('OK  workspace-' + tab.toLowerCase())
}

const cards = page.locator('button[title="Open this lesson\'s accessibility checklist"]')
console.log('lesson score cards:', await cards.count())
if (await cards.count()) {
  // pick the lowest-scoring card
  const texts = await cards.allTextContents()
  let idx = 0, low = 999
  texts.forEach((t, i) => { const m = t.match(/(\d+)%/); if (m && +m[1] < low) { low = +m[1]; idx = i } })
  console.log('opening card', idx, 'score', low)
  await cards.nth(idx).click()
  await page.waitForTimeout(9000)
  await shot(page, null, 'educator-a11y-compliance', { wait: 2500 })
  await page.screenshot({ path: `${OUT}/educator-a11y-compliance-full.png`, fullPage: true })
  console.log('OK full')
}
await browser.close()
