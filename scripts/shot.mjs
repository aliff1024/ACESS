import { chromium } from 'playwright-core'

export const OUT = 'C:/Users/user/OneDrive/Documents/PSM/ACESS-main/Report/Screenshots'
export const BASE = 'http://localhost:3000'
const PW = 'AcessDemo#2026'

export async function launch() {
  return chromium.launch({ channel: 'chrome', headless: true })
}

export async function login(browser, email, viewport = { width: 1440, height: 950 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 })
  const page = await ctx.newPage(); page.setDefaultNavigationTimeout(120000); page.setDefaultTimeout(60000)
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', PW)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(6000)
  return page
}

export async function shot(page, url, name, opts = {}) {
  if (url) await page.goto(BASE + url, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(opts.wait ?? 4000)
  if (opts.scroll) await page.evaluate((y) => window.scrollTo(0, y), opts.scroll)
  if (opts.scroll) await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: !!opts.full, clip: opts.clip })
  console.log('OK  ', name, '<-', page.url())
}
