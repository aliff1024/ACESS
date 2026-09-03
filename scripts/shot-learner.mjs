import { chromium } from 'playwright-core'

const OUT = 'C:/Users/user/OneDrive/Documents/PSM/ACESS-main/Report/Screenshots'
const BASE = 'http://localhost:3000'
const PW = 'AcessDemo#2026'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log('  [console]', m.text().slice(0,150)) })

await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
await page.fill('input[type="email"]', process.env.EMAIL || 'mei.learner@acess.edu.my')
await page.fill('input[type="password"]', PW)
await page.click('button[type="submit"]')
await page.waitForTimeout(6000)
console.log('after login ->', page.url())

async function shot(url, name, opts = {}) {
  if (url) await page.goto(BASE + url, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(opts.wait ?? 4000)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: !!opts.full })
  console.log('OK  ', name, '->', page.url())
}

await shot(null, 'probe-dashboard')
await browser.close()
