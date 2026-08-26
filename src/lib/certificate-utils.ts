'use client';

import { jsPDF } from 'jspdf';

/**
 * Certificate rendering.
 *
 * Everything on the page is a field of `CertificateRenderData`, and every one
 * of those fields is supplied by the caller from the database. There are no
 * defaults baked into the drawing code: the previous generator printed
 * `'Course Educator'` when it had no educator and left `Course Duration: 0
 * hours` on the page when the duration was unknown, so the document asserted
 * things nobody had established. Optional fields are now genuinely optional —
 * an unknown educator or duration omits its block and the layout closes up
 * around it, rather than filling the gap with a placeholder.
 *
 * The one place a placeholder is legitimate is MOCK_PREVIEW_DATA at the foot
 * of this file, which exists solely for the educator's live preview panel and
 * is never used on a learner's real certificate.
 */
export interface CertificateRenderData {
  learnerName: string
  courseTitle: string
  /** Empty string when the course has no identifiable educator. */
  educatorName: string
  /** The educator's signing title, e.g. "Course Educator". */
  educatorRole?: string
  institutionName: string
  /** ISO timestamp. Formatted here, once. */
  completionDate: string
  certificateCode: string
  verificationUrl: string
  skills: string[]
  /** Hours. 0 means unknown — the line is omitted rather than printing "0". */
  courseDurationHours: number
  /** Published lesson count. 0 omits the line. */
  lessonCount?: number
  /** Course category, e.g. "Reading & Literacy". Omitted when absent. */
  courseCategory?: string
  /** A data: URL for the verification QR code, when one could be generated. */
  qrDataUrl?: string
}

/**
 * Formats an ISO timestamp for display.
 *
 * Callers must pass ISO. The certificate list used to hand this function a
 * string it had already localised ("6 May 2026"), which `new Date()` parses
 * only by luck and not at all in every locale — the PDF could be stamped
 * "Invalid Date". Anything unparseable now returns an empty string so a bad
 * date is visibly missing rather than silently wrong.
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function generateCertificateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segments = [4, 4, 4]
  return segments.map(len => {
    let s = ''
    for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length))
    return s
  }).join('-')
}

/** Text that must fit a fixed width, shrunk until it does. */
function fitText(doc: jsPDF, text: string, maxWidth: number, startSize: number, minSize: number): number {
  let size = startSize
  doc.setFontSize(size)
  while (size > minSize && doc.getTextWidth(text) > maxWidth) {
    size -= 1
    doc.setFontSize(size)
  }
  return size
}

const INK = {
  navy: [23, 47, 105] as const,
  blue: [37, 99, 235] as const,
  gold: [180, 132, 27] as const,
  ink: [24, 30, 42] as const,
  body: [71, 82, 102] as const,
  faint: [141, 152, 170] as const,
  rule: [206, 214, 228] as const,
}

/**
 * Renders the certificate as a landscape A4 PDF.
 *
 * The layout is a fixed grid rather than a run of hand-placed y-coordinates,
 * so a long course title or a missing optional block cannot push text into
 * the signature line the way the previous absolute positions could.
 */
export async function generatePDFCertificate(
  data: CertificateRenderData,
  mode: 'download' | 'blob' = 'download'
): Promise<Blob | void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const cx = W / 2

  // Document metadata. A certificate is a document someone will file, search
  // for and possibly open in a screen reader; without these it is "untitled"
  // everywhere. setLanguage tags the document so assistive technology
  // pronounces it correctly instead of guessing from the reader's locale.
  doc.setProperties({
    title: `Certificate of Completion — ${data.courseTitle}`,
    subject: `Awarded to ${data.learnerName} by ${data.institutionName}`,
    author: data.institutionName,
    creator: 'ACESS',
    keywords: ['certificate', 'completion', data.courseTitle, data.certificateCode].join(', '),
  })
  if (typeof (doc as unknown as { setLanguage?: (l: string) => void }).setLanguage === 'function') {
    (doc as unknown as { setLanguage: (l: string) => void }).setLanguage('en-GB')
  }

  const setInk = (c: readonly [number, number, number]) => doc.setTextColor(c[0], c[1], c[2])
  const setDraw = (c: readonly [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2])

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, H, 'F')

  // ── Frame ──
  setDraw(INK.navy)
  doc.setLineWidth(1.6)
  doc.rect(9, 9, W - 18, H - 18, 'S')
  setDraw(INK.gold)
  doc.setLineWidth(0.4)
  doc.rect(13, 13, W - 26, H - 26, 'S')

  // ── Masthead ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  setInk(INK.gold)
  doc.text('ACESS', cx, 27, { align: 'center', charSpace: 1.4 })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  setInk(INK.navy)
  doc.text('Certificate of Completion', cx, 40, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  setInk(INK.body)
  doc.text(data.institutionName, cx, 48, { align: 'center' })

  setDraw(INK.gold)
  doc.setLineWidth(0.6)
  doc.line(cx - 26, 53, cx + 26, 53)

  // ── Award ──
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  setInk(INK.body)
  doc.text('This is to certify that', cx, 65, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  const nameSize = fitText(doc, data.learnerName, W - 90, 30, 16)
  setInk(INK.ink)
  doc.setFontSize(nameSize)
  doc.text(data.learnerName, cx, 80, { align: 'center' })

  setDraw(INK.rule)
  doc.setLineWidth(0.3)
  doc.line(cx - 60, 85, cx + 60, 85)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  setInk(INK.body)
  doc.text('has successfully completed the course', cx, 95, { align: 'center' })

  // A long title wraps to two lines before it is allowed to shrink, so a
  // realistic course name stays readable instead of becoming 8pt.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  setInk(INK.blue)
  const titleLines = doc.splitTextToSize(data.courseTitle, W - 90) as string[]
  const shown = titleLines.slice(0, 2)
  if (shown.length === 1) {
    const size = fitText(doc, shown[0], W - 90, 18, 12)
    doc.setFontSize(size)
  } else {
    doc.setFontSize(15)
  }
  doc.text(shown, cx, 106, { align: 'center' })

  let y = 106 + (shown.length - 1) * 8

  // ── Course facts. Each line appears only if it is actually known. ──
  const facts: string[] = []
  if (data.courseCategory) facts.push(data.courseCategory)
  if (data.lessonCount && data.lessonCount > 0) {
    facts.push(`${data.lessonCount} ${data.lessonCount === 1 ? 'lesson' : 'lessons'}`)
  }
  if (data.courseDurationHours > 0) {
    facts.push(`${data.courseDurationHours} ${data.courseDurationHours === 1 ? 'hour' : 'hours'} of learning`)
  }
  if (facts.length > 0) {
    y += 9
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    setInk(INK.faint)
    doc.text(facts.join('   ·   '), cx, y, { align: 'center' })
  }

  if (data.skills.length > 0) {
    y += 7
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    setInk(INK.faint)
    const skills = doc.splitTextToSize(`Skills demonstrated: ${data.skills.join(', ')}`, W - 100) as string[]
    doc.text(skills.slice(0, 2), cx, y, { align: 'center' })
    y += (Math.min(skills.length, 2) - 1) * 5
  }

  // ── Details strip ──
  const stripY = H - 62
  setDraw(INK.rule)
  doc.setLineWidth(0.3)
  doc.line(28, stripY - 8, W - 28, stripY - 8)

  const details: { label: string; value: string }[] = [
    { label: 'COMPLETION DATE', value: formatDate(data.completionDate) },
    { label: 'CERTIFICATE ID', value: data.certificateCode },
  ]
  if (data.educatorName) {
    details.push({ label: (data.educatorRole || 'Course Educator').toUpperCase(), value: data.educatorName })
  }

  const colWidth = (W - 56) / details.length
  details.forEach((d, i) => {
    const x = 28 + colWidth * i
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    setInk(INK.faint)
    doc.text(d.label, x, stripY, { charSpace: 0.6 })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    setInk(INK.ink)
    doc.text(d.value || '—', x, stripY + 7)
  })

  // ── Signatures ──
  const sigY = H - 30
  setDraw(INK.ink)
  doc.setLineWidth(0.4)

  doc.line(34, sigY, 92, sigY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  setInk(INK.ink)
  doc.text('Platform Director', 63, sigY + 5.5, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  setInk(INK.faint)
  doc.text(data.institutionName, 63, sigY + 10.5, { align: 'center' })

  if (data.educatorName) {
    doc.setLineWidth(0.4)
    setDraw(INK.ink)
    doc.line(W - 92, sigY, W - 34, sigY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    setInk(INK.ink)
    doc.text(data.educatorName, W - 63, sigY + 5.5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    setInk(INK.faint)
    doc.text(data.educatorRole || 'Course Educator', W - 63, sigY + 10.5, { align: 'center' })
  }

  // ── Verification ──
  if (data.qrDataUrl) {
    try {
      doc.addImage(data.qrDataUrl, 'PNG', cx - 11, sigY - 22, 22, 22)
    } catch {
      // A QR that failed to encode must not cost the learner their PDF.
    }
  }
  if (data.verificationUrl) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    setInk(INK.faint)
    doc.text(`Verify this certificate at ${data.verificationUrl}`, cx, H - 15, { align: 'center' })
  }

  if (mode === 'blob') {
    return doc.output('blob')
  }

  const safeCourse = data.courseTitle.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 48)
  doc.save(`ACESS-Certificate-${safeCourse || 'Course'}-${data.certificateCode}.pdf`)
}

/**
 * Builds the render payload from a certificate record, including the QR code.
 *
 * Kept here so the list view, the detail view and any future caller cannot
 * assemble the same certificate differently — which they did: the list passed
 * `cert.learner_name || 'Learner'` and an already-formatted date, the detail
 * view passed `'Course Educator'` for a missing educator.
 */
export async function buildCertificateRenderData(cert: {
  learner_name?: string | null
  course_title: string
  course_category?: string | null
  educator_name?: string | null
  educator_role?: string | null
  institution_name?: string | null
  completion_date: string
  certificate_code: string
  verification_url: string
  skills_earned?: string[] | null
  course_duration_hours?: number | null
  lesson_count?: number | null
}): Promise<CertificateRenderData> {
  let qrDataUrl: string | undefined
  if (cert.verification_url) {
    try {
      qrDataUrl = await getQRCodeDataUrl(cert.verification_url)
    } catch {
      qrDataUrl = undefined
    }
  }

  return {
    learnerName: cert.learner_name || '',
    courseTitle: cert.course_title,
    courseCategory: cert.course_category || undefined,
    educatorName: cert.educator_name || '',
    educatorRole: cert.educator_role || undefined,
    institutionName: cert.institution_name || 'ACESS Platform',
    completionDate: cert.completion_date,
    certificateCode: cert.certificate_code,
    verificationUrl: cert.verification_url,
    skills: cert.skills_earned || [],
    courseDurationHours: Number(cert.course_duration_hours ?? 0),
    lessonCount: cert.lesson_count ?? undefined,
    qrDataUrl,
  }
}

export async function shareCertificate(data: {
  certificateCode: string
  verificationUrl: string
  courseTitle: string
}): Promise<'shared' | 'copied' | 'failed'> {
  const message = `I completed "${data.courseTitle}" on ACESS. Verify my certificate: ${data.verificationUrl}`

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Certificate of Completion — ${data.courseTitle}`,
        text: message,
        url: data.verificationUrl,
      })
      return 'shared'
    } catch {
      // Falls through to the clipboard; a cancelled share is not a failure
      // worth reporting, but an unavailable one should still leave the
      // learner with a link.
    }
  }

  try {
    await navigator.clipboard.writeText(message)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export function getLinkedInShareUrl(data: {
  verificationUrl: string
  courseTitle: string
}): string {
  const url = new URL('https://www.linkedin.com/sharing/share-offsite/')
  url.searchParams.set('url', data.verificationUrl)
  return url.toString()
}

export function getQRCodeDataUrl(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(text, {
        width: 256,
        margin: 1,
        color: { dark: '#172f69', light: '#ffffff' },
      }).then(resolve).catch(reject)
    }).catch(reject)
  })
}

/**
 * Sample values for the educator's certificate PREVIEW panel only.
 *
 * Never reachable from a learner's certificate: the learner paths build their
 * payload with buildCertificateRenderData() from database rows. Kept obviously
 * fictitious so a preview screenshot cannot be mistaken for a real award.
 */
export const MOCK_PREVIEW_DATA: CertificateRenderData = {
  learnerName: 'Sample Learner',
  courseTitle: 'Sample Course Title',
  educatorName: 'Sample Educator',
  educatorRole: 'Course Educator',
  institutionName: 'ACESS Platform',
  completionDate: new Date().toISOString(),
  certificateCode: 'ABCD-EFGH-IJKL',
  verificationUrl: 'https://example.invalid/verify/ABCD-EFGH-IJKL',
  skills: ['Accessibility', 'Adaptive Learning', 'Inclusive Design'],
  courseDurationHours: 40,
  lessonCount: 12,
}
