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
const clickText = async (page, txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find(x => (x.textContent || '').trim().toLowerCase() === t.toLowerCase())
  if (!b) return false; b.click(); return true
}, txt)

const page = await loginRetry('siti.educator@acess.edu.my')
await page.goto('http://localhost:3000/educator/courses/75e82100-5247-4e84-9401-d8804fea37a0', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(10000)
console.log('settings clicked:', await clickText(page, 'Settings'))
await page.waitForTimeout(7000)
const names = await page.evaluate(() => [...document.querySelectorAll('button')].map((b,i)=>i+' | '+(b.textContent||'').trim().replace(/\s+/g,' ').slice(0,80)))
console.log(names.filter(s => s.split('|')[1].trim()).join('\n'))
await page.screenshot({ path: `${OUT}/dbg-settings.png`, fullPage: true })
await browser.close()
