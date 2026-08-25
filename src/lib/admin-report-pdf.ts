/**
 * Professional PDF rendering for admin reports.
 *
 * Charts are drawn with jsPDF vector primitives rather than rasterised from the
 * DOM: the output stays sharp at print resolution, the file stays small, and a
 * chart can be measured before it is placed, which is what makes reliable
 * pagination possible. Nothing is ever split across a page boundary.
 */

import type { AdminReport, ReportChart, ReportTable } from './admin-reports'

type Doc = import('jspdf').jsPDF

// ─── Layout constants (mm, A4 portrait: 210 × 297) ───────────────────────

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 16
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_H = 14
const MAX_Y = PAGE_H - FOOTER_H

const INK: [number, number, number] = [24, 32, 38]
const MUTED: [number, number, number] = [110, 122, 130]
const RULE: [number, number, number] = [214, 222, 226]
const ACCENT: [number, number, number] = [20, 96, 122]
const ACCENT_SOFT: [number, number, number] = [225, 238, 243]
const BAND: [number, number, number] = [246, 249, 250]

export interface PdfContext {
  doc: Doc
  y: number
}

function setFill(doc: Doc, c: [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2])
}
function setText(doc: Doc, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2])
}
function setDraw(doc: Doc, c: [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2])
}

/** Starts a new page when `needed` mm will not fit below the current cursor. */
function ensureSpace(ctx: PdfContext, needed: number) {
  if (ctx.y + needed > MAX_Y) {
    ctx.doc.addPage()
    ctx.y = MARGIN
  }
}

// ─── Cover ───────────────────────────────────────────────────────────────

function drawCover(doc: Doc, report: AdminReport) {
  setFill(doc, ACCENT)
  doc.rect(0, 0, PAGE_W, 62, 'F')

  setText(doc, [255, 255, 255])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text('ACESS', MARGIN, 28)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Accessible Learning Platform', MARGIN, 36)

  doc.setFontSize(8)
  doc.text('ADMINISTRATIVE REPORT', PAGE_W - MARGIN, 28, { align: 'right' })

  // Title block
  setText(doc, INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  const titleLines = doc.splitTextToSize(report.title, CONTENT_W) as string[]
  doc.text(titleLines, MARGIN, 86)

  let y = 86 + titleLines.length * 10

  setText(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const descLines = doc.splitTextToSize(report.description, CONTENT_W) as string[]
  doc.text(descLines, MARGIN, y)
  y += descLines.length * 5.6 + 10

  setDraw(doc, RULE)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 10

  // Metadata
  const generated = new Date(report.generatedAt)
  const meta: [string, string][] = [
    ['Report period', report.range.label],
    [
      'Date range',
      report.range.from
        ? `${new Date(report.range.from).toLocaleDateString()} — ${new Date(report.range.to).toLocaleDateString()}`
        : `All records up to ${new Date(report.range.to).toLocaleDateString()}`,
    ],
    ['Generated', generated.toLocaleString()],
  ]

  doc.setFontSize(9)
  for (const [label, value] of meta) {
    setText(doc, MUTED)
    doc.setFont('helvetica', 'bold')
    doc.text(label.toUpperCase(), MARGIN, y)
    setText(doc, INK)
    doc.setFont('helvetica', 'normal')
    doc.text(value, MARGIN + 42, y)
    y += 7
  }

  y += 8

  // Executive summary on the cover — the numbers that matter, up front.
  setText(doc, INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Executive summary', MARGIN, y)
  y += 8

  const cols = Math.min(report.summary.length, 3)
  const cardW = (CONTENT_W - (cols - 1) * 4) / cols
  let col = 0
  let rowY = y

  for (const item of report.summary) {
    const x = MARGIN + col * (cardW + 4)
    setFill(doc, BAND)
    doc.roundedRect(x, rowY, cardW, 22, 1.5, 1.5, 'F')

    setText(doc, ACCENT)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(item.value, x + 5, rowY + 10)

    setText(doc, INK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text(doc.splitTextToSize(item.label.toUpperCase(), cardW - 10)[0], x + 5, rowY + 15.5)

    if (item.hint) {
      setText(doc, MUTED)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.text(doc.splitTextToSize(item.hint, cardW - 10)[0], x + 5, rowY + 19.5)
    }

    col++
    if (col === cols) {
      col = 0
      rowY += 26
    }
  }
}

// ─── Section heading ─────────────────────────────────────────────────────

/**
 * Minimum content that must fit below a heading for it to stay on the page.
 * Without this a heading lands at the page foot and its chart or table starts
 * overleaf, which reads as a mistake.
 */
const HEADING_WIDOW_GUARD = 30

function drawSectionHeading(ctx: PdfContext, title: string, description?: string) {
  const { doc } = ctx
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  const descLines = description
    ? (doc.splitTextToSize(description, CONTENT_W) as string[])
    : []

  ensureSpace(ctx, 12 + descLines.length * 4.4 + 8 + HEADING_WIDOW_GUARD)

  setDraw(doc, RULE)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, ctx.y, PAGE_W - MARGIN, ctx.y)
  ctx.y += 6

  setText(doc, INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(title, MARGIN, ctx.y)
  ctx.y += 5.5

  if (descLines.length) {
    setText(doc, MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(descLines, MARGIN, ctx.y)
    ctx.y += descLines.length * 4.4
  }
  ctx.y += 3
}

// ─── Charts ──────────────────────────────────────────────────────────────

function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalised = value / magnitude
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10
  return step * magnitude
}

/**
 * Horizontal bars for categorical comparisons — labels stay readable at any
 * length, unlike rotated axis labels on vertical bars.
 */
function drawBarChart(ctx: PdfContext, chart: ReportChart) {
  const { doc } = ctx
  const series = chart.series.filter((s) => Number.isFinite(s.value))
  if (series.length === 0) {
    drawEmptyChart(ctx, chart.title)
    return
  }

  const rowH = 7
  const chartH = series.length * rowH + 12
  ensureSpace(ctx, chartH + 4)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  setText(doc, INK)
  doc.text(chart.title, MARGIN, ctx.y)
  ctx.y += 5

  const labelW = 52
  const valueW = 16
  const barMaxW = CONTENT_W - labelW - valueW - 4
  const max = niceMax(Math.max(...series.map((s) => s.value), 1))

  for (const item of series) {
    const rowY = ctx.y

    setText(doc, INK)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const label = (doc.splitTextToSize(item.label, labelW - 2) as string[])[0]
    doc.text(label, MARGIN, rowY + 3.6)

    // Track
    setFill(doc, BAND)
    doc.roundedRect(MARGIN + labelW, rowY, barMaxW, 4.6, 0.8, 0.8, 'F')

    // Value bar
    const w = max > 0 ? (item.value / max) * barMaxW : 0
    if (w > 0.4) {
      setFill(doc, ACCENT)
      doc.roundedRect(MARGIN + labelW, rowY, Math.max(w, 0.8), 4.6, 0.8, 0.8, 'F')
    }

    setText(doc, INK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(String(item.value), PAGE_W - MARGIN, rowY + 3.6, { align: 'right' })

    ctx.y += rowH
  }

  setText(doc, MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(`Measured in ${chart.unit}.`, MARGIN, ctx.y + 3)
  ctx.y += 8
}

/** Line chart with a filled area, gridlines and an emphasised final point. */
function drawLineChart(ctx: PdfContext, chart: ReportChart) {
  const { doc } = ctx
  const series = chart.series.filter((s) => Number.isFinite(s.value))
  if (series.length < 2) {
    drawEmptyChart(ctx, chart.title, 'Not enough points in this range to plot a trend.')
    return
  }

  const plotH = 42
  const totalH = plotH + 22
  ensureSpace(ctx, totalH + 4)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  setText(doc, INK)
  doc.text(chart.title, MARGIN, ctx.y)
  ctx.y += 5

  const axisW = 12
  const plotX = MARGIN + axisW
  const plotW = CONTENT_W - axisW
  const plotY = ctx.y
  const max = niceMax(Math.max(...series.map((s) => s.value), 1))

  // Gridlines + y labels
  setDraw(doc, RULE)
  doc.setLineWidth(0.2)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  for (let i = 0; i <= 4; i++) {
    const gy = plotY + plotH - (i / 4) * plotH
    doc.line(plotX, gy, plotX + plotW, gy)
    setText(doc, MUTED)
    doc.text(String(Math.round((i / 4) * max)), plotX - 2, gy + 1.2, { align: 'right' })
  }

  const pointX = (i: number) =>
    series.length === 1 ? plotX : plotX + (i / (series.length - 1)) * plotW
  const pointY = (v: number) => plotY + plotH - (v / max) * plotH

  // Area fill
  setFill(doc, ACCENT_SOFT)
  const area: [number, number][] = []
  area.push([plotX, plotY + plotH])
  series.forEach((s, i) => area.push([pointX(i), pointY(s.value)]))
  area.push([plotX + plotW, plotY + plotH])
  drawPolygon(doc, area)

  // Line
  setDraw(doc, ACCENT)
  doc.setLineWidth(0.7)
  for (let i = 1; i < series.length; i++) {
    doc.line(pointX(i - 1), pointY(series[i - 1].value), pointX(i), pointY(series[i].value))
  }

  // Emphasised endpoint
  setFill(doc, ACCENT)
  const lastIdx = series.length - 1
  doc.circle(pointX(lastIdx), pointY(series[lastIdx].value), 1.1, 'F')

  ctx.y = plotY + plotH + 4

  // X labels — thinned so they never collide
  const stride = Math.max(1, Math.ceil(series.length / 8))
  setText(doc, MUTED)
  doc.setFontSize(6.5)
  series.forEach((s, i) => {
    if (i % stride !== 0 && i !== lastIdx) return
    doc.text(s.label, pointX(i), ctx.y + 2, { align: i === lastIdx ? 'right' : 'center' })
  })
  ctx.y += 6

  doc.setFontSize(7)
  doc.text(
    `Measured in ${chart.unit}. Peak ${Math.max(...series.map((s) => s.value))}.`,
    MARGIN,
    ctx.y + 2
  )
  ctx.y += 7
}

function drawPolygon(doc: Doc, points: [number, number][]) {
  if (points.length < 3) return
  const [start, ...rest] = points
  const deltas = rest.map((p, i) => {
    const prev = i === 0 ? start : rest[i - 1]
    return [p[0] - prev[0], p[1] - prev[1]] as [number, number]
  })
  doc.lines(deltas, start[0], start[1], [1, 1], 'F', true)
}

function drawEmptyChart(ctx: PdfContext, title: string, message = 'No records in this range.') {
  const { doc } = ctx
  ensureSpace(ctx, 24)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  setText(doc, INK)
  doc.text(title, MARGIN, ctx.y)
  ctx.y += 4

  setFill(doc, BAND)
  doc.roundedRect(MARGIN, ctx.y, CONTENT_W, 14, 1.5, 1.5, 'F')
  setText(doc, MUTED)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.text(message, PAGE_W / 2, ctx.y + 8.4, { align: 'center' })
  ctx.y += 19
}

// ─── Tables ──────────────────────────────────────────────────────────────

async function drawTable(ctx: PdfContext, table: ReportTable) {
  const { doc } = ctx
  const { default: autoTable } = await import('jspdf-autotable')

  ensureSpace(ctx, 24)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  setText(doc, INK)
  doc.text(table.title, MARGIN, ctx.y)
  ctx.y += 3

  const columnStyles: Record<number, { halign: 'right' }> = {}
  for (const i of table.numericColumns) columnStyles[i] = { halign: 'right' }

  autoTable(doc, {
    head: [table.columns],
    body: table.rows.map((r) => r.map((c) => String(c ?? ''))),
    startY: ctx.y,
    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_H },
    theme: 'grid',
    // Header repeats on every page so a long table stays readable after a break.
    showHead: 'everyPage',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      lineColor: RULE,
      lineWidth: 0.1,
      textColor: INK,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: ACCENT,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: BAND },
    columnStyles,
  })

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
  ctx.y = (finalY ?? ctx.y) + 8
}

// ─── Findings & caveats ──────────────────────────────────────────────────

function drawList(
  ctx: PdfContext,
  title: string,
  items: string[],
  tone: 'accent' | 'muted',
  emptyMessage: string
) {
  const { doc } = ctx
  drawSectionHeading(ctx, title)

  if (items.length === 0) {
    setText(doc, MUTED)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.text(emptyMessage, MARGIN, ctx.y + 2)
    ctx.y += 8
    return
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  for (const item of items) {
    const lines = doc.splitTextToSize(item, CONTENT_W - 6) as string[]
    ensureSpace(ctx, lines.length * 4.6 + 4)

    setFill(doc, tone === 'accent' ? ACCENT : RULE)
    doc.rect(MARGIN, ctx.y - 1.4, 1.2, lines.length * 4.6, 'F')

    setText(doc, tone === 'accent' ? INK : MUTED)
    doc.setFontSize(tone === 'accent' ? 9 : 8)
    doc.text(lines, MARGIN + 5, ctx.y + 2)
    ctx.y += lines.length * 4.6 + 3.5
  }
  ctx.y += 3
}

// ─── Footer ──────────────────────────────────────────────────────────────

function drawFooters(doc: Doc, report: AdminReport) {
  const pageCount = doc.getNumberOfPages()
  const stamp = new Date(report.generatedAt).toLocaleString()

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)

    setDraw(doc, RULE)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, PAGE_H - 10, PAGE_W - MARGIN, PAGE_H - 10)

    setText(doc, MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(`ACESS · ${report.title}`, MARGIN, PAGE_H - 6)
    doc.text(`Generated ${stamp}`, PAGE_W / 2, PAGE_H - 6, { align: 'center' })
    doc.text(`Page ${page} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' })
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────

export function reportFileName(report: AdminReport): string {
  const slug = report.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `acess-${slug}-${report.range.key}.pdf`
}

/**
 * Builds the document without saving it, so the layout can be exercised in a
 * test without a browser download.
 */
export async function buildReportDoc(report: AdminReport): Promise<Doc> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  drawCover(doc, report)

  doc.addPage()
  const ctx: PdfContext = { doc, y: MARGIN }

  for (const section of report.sections) {
    drawSectionHeading(ctx, section.title, section.description)

    if (section.chart) {
      if (section.chart.type === 'line') drawLineChart(ctx, section.chart)
      else drawBarChart(ctx, section.chart)
    }

    if (section.table) {
      await drawTable(ctx, section.table)
    }

    if (section.note) {
      ensureSpace(ctx, 10)
      setText(doc, MUTED)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      const lines = doc.splitTextToSize(section.note, CONTENT_W) as string[]
      doc.text(lines, MARGIN, ctx.y)
      ctx.y += lines.length * 4.4 + 4
    }
  }

  drawList(
    ctx,
    'Key findings',
    report.findings,
    'accent',
    'The dataset in this range is too small to support findings.'
  )

  drawList(ctx, 'How to read this report', report.caveats, 'muted', '')

  drawFooters(doc, report)

  return doc
}

export async function generateReportPdf(report: AdminReport): Promise<void> {
  const doc = await buildReportDoc(report)
  doc.save(reportFileName(report))
}
