import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { buildIndex, loadSnapshot, resolveRange } from '@/lib/admin-analytics'
import { REPORT_META, buildReport, type ReportId } from '@/lib/admin-reports'

const VALID_IDS = Object.keys(REPORT_META) as ReportId[]

/** Lists the available reports so the UI does not hard-code them. */
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  return NextResponse.json({
    reports: VALID_IDS.map((id) => ({ id, ...REPORT_META[id] })),
  })
}

/**
 * Builds one report from the shared analytics snapshot.
 *
 * Body: { reportId: 'users' | 'courses' | 'learning' | 'accessibility', range?: RangeKey }
 */
export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const body = await request.json()
    const reportId = body?.reportId as ReportId

    if (!VALID_IDS.includes(reportId)) {
      return NextResponse.json(
        { error: `Unknown report. Expected one of: ${VALID_IDS.join(', ')}` },
        { status: 400 }
      )
    }

    const range = resolveRange(body?.range)
    const snap = await loadSnapshot()
    const index = buildIndex(snap)

    return NextResponse.json(buildReport(reportId, snap, index, range))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build report'
    console.error('Admin report error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
