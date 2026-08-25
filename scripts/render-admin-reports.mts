/**
 * Renders every admin report to PDF on disk so pagination and layout can be
 * checked without a browser.
 *
 *   npx tsx scripts/render-admin-reports.mts [outDir]
 */
import fs from 'fs'
import path from 'path'
import { buildIndex, loadSnapshot, resolveRange } from '../src/lib/admin-analytics'
import { buildReport, REPORT_META, type ReportId } from '../src/lib/admin-reports'
import { buildReportDoc, reportFileName } from '../src/lib/admin-report-pdf'

for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line.includes('=') || line.trim().startsWith('#')) continue
  const i = line.indexOf('=')
  process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '')
}

const outDir = process.argv[2] ?? 'report-output'
fs.mkdirSync(outDir, { recursive: true })

const snap = await loadSnapshot()
const index = buildIndex(snap)
const range = resolveRange(process.env.REPORT_RANGE ?? 'all')

for (const id of Object.keys(REPORT_META) as ReportId[]) {
  const report = buildReport(id, snap, index, range)
  const doc = await buildReportDoc(report)
  const file = path.join(outDir, reportFileName(report))
  fs.writeFileSync(file, Buffer.from(doc.output('arraybuffer')))

  console.log(
    `${report.title.padEnd(22)} ${String(doc.getNumberOfPages()).padStart(2)} pages  ` +
      `${String(report.findings.length).padStart(2)} findings  ` +
      `${String(report.sections.length).padStart(2)} sections  ` +
      `${(fs.statSync(file).size / 1024).toFixed(0).padStart(4)} KB`
  )
  for (const f of report.findings) console.log(`    · ${f}`)
}

console.log(`\nWritten to ${path.resolve(outDir)}`)
