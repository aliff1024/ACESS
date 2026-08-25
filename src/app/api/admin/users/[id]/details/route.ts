import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { buildIndex, computeUserDetail, loadSnapshot } from '@/lib/admin-analytics'

/**
 * Full administrative profile for one user.
 *
 * Derived from the same snapshot the dashboard uses, so a learner's progress
 * here always matches the same learner's contribution to the course figures.
 * Previously this route returned raw enrollment rows and the page rendered
 * `enrollment.progress_percent` — a column that does not exist, which is why
 * every progress bar read 0%.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const { id } = await context.params

    const snap = await loadSnapshot()
    const index = buildIndex(snap)
    const detail = computeUserDetail(id, snap, index)

    if (!detail) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load user'
    console.error('Admin user detail error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
