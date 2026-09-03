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
let page = await loginRetry('siti.educator@acess.edu.my')
await shot(page, '/educator/courses/75e82100-5247-4e84-9401-d8804fea37a0', 'educator-course-workspace', { wait: 8000 })
await shot(page, '/educator/analytics', 'educator-analytics', { wait: 8000 })
await shot(page, '/educator/students', 'educator-students', { wait: 7000 })
await shot(page, '/educator/ranking', 'educator-ranking', { wait: 7000 })
await page.context().close()

page = await loginRetry('aliff.admin@acess.edu.my')
await shot(page, '/admin', 'admin-dashboard', { wait: 8000 })
await shot(page, '/admin/analytics', 'admin-analytics', { wait: 8000 })
await shot(page, '/admin/users', 'admin-users', { wait: 7000 })
await shot(page, '/admin/courses', 'admin-courses', { wait: 7000 })
await shot(page, '/admin/reports', 'admin-reports', { wait: 7000 })
await page.context().close()
await browser.close()
