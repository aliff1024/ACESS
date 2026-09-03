import { execFileSync } from 'node:child_process'
import { launch, login, shot } from './shot.mjs'

const EMAIL = 'aisyah.learner@acess.edu.my'
const LESSON = '0d85fa7d-a09a-4514-8c9e-40f6e7981210'
const only = process.argv.slice(2)

function setPreset(p) {
  execFileSync('npx', ['tsx', 'scripts/preset-apply.ts', EMAIL, p], {
    stdio: 'ignore', shell: true,
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'x' },
  })
  console.log('preset ->', p)
}

const browser = await launch()
for (const preset of (only.length ? only : ['none', 'dyslexia', 'adhd', 'autism'])) {
  setPreset(preset)
  let page
  for (let i = 0; i < 4; i++) {
    page = await login(browser, EMAIL)
    if (!page.url().includes('/login')) break
    console.log('  login retry', i + 1)
    await page.context().close()
    await new Promise(r => setTimeout(r, 8000))
  }
  await shot(page, `/learner/lesson/${LESSON}`, `lesson-${preset}`, { wait: 8000 })
  await shot(page, `/learner`, `dashboard-${preset}`, { wait: 6000 })
  await page.context().close()
  await new Promise(r => setTimeout(r, 5000))
}
await browser.close()
