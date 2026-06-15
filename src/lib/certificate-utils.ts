'use client';

import { jsPDF } from 'jspdf';

export interface CertificateRenderData {
  learnerName: string
  courseTitle: string
  educatorName: string
  institutionName: string
  completionDate: string
  certificateCode: string
  verificationUrl: string
  skills: string[]
  courseDurationHours: number
  logo?: string
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
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

export async function generatePDFCertificate(
  data: CertificateRenderData,
  mode: 'download' | 'blob' = 'download'
): Promise<Blob | void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Colors
  const primaryBlue = [30, 64, 175]
  const lightBlue = [59, 130, 246]
  const gold = [245, 158, 11]
  const gray800 = [31, 41, 55]
  const gray600 = [75, 85, 99]
  const gray400 = [156, 163, 175]

  // Background - white with subtle border
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Decorative border
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2])
  doc.setLineWidth(2)
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S')

  // Inner border
  doc.setDrawColor(lightBlue[0], lightBlue[1], lightBlue[2])
  doc.setLineWidth(0.5)
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24, 'S')

  // Top decorative line
  doc.setDrawColor(gold[0], gold[1], gold[2])
  doc.setLineWidth(1)
  doc.line(40, 28, pageWidth - 40, 28)

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2])
  doc.text('Certificate of Completion', pageWidth / 2, 42, { align: 'center' })

  // Institution name
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(gray600[0], gray600[1], gray600[2])
  doc.text(data.institutionName, pageWidth / 2, 51, { align: 'center' })

  // Subtitle
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(gray600[0], gray600[1], gray600[2])
  doc.text('This certificate is proudly awarded to', pageWidth / 2, 66, { align: 'center' })

  // Learner name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(32)
  doc.setTextColor(gray800[0], gray800[1], gray800[2])
  doc.text(data.learnerName, pageWidth / 2, 84, { align: 'center' })

  // For completing
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(gray600[0], gray600[1], gray600[2])
  doc.text('for successfully completing the course', pageWidth / 2, 96, { align: 'center' })

  // Course title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(lightBlue[0], lightBlue[1], lightBlue[2])
  doc.text(data.courseTitle, pageWidth / 2, 110, { align: 'center' })

  // Duration
  if (data.courseDurationHours > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(gray600[0], gray600[1], gray600[2])
    doc.text(`Course Duration: ${data.courseDurationHours} hours`, pageWidth / 2, 122, { align: 'center' })
  }

  // Skills
  if (data.skills.length > 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(gray400[0], gray400[1], gray400[2])
    doc.text(`Skills: ${data.skills.join(', ')}`, pageWidth / 2, 132, { align: 'center' })
  }

  // Bottom decorative line
  doc.setDrawColor(gold[0], gold[1], gold[2])
  doc.setLineWidth(1)
  doc.line(40, 142, pageWidth - 40, 142)

  // Details section
  const detailY = 155
  const detailColWidth = (pageWidth - 60) / 3

  // Completion Date
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(gray800[0], gray800[1], gray800[2])
  doc.text('COMPLETION DATE', 30, detailY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(gray600[0], gray600[1], gray600[2])
  doc.text(formatDate(data.completionDate), 30, detailY + 6)

  // Certificate Code
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(gray800[0], gray800[1], gray800[2])
  doc.text('CERTIFICATE CODE', 30 + detailColWidth, detailY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(gray600[0], gray600[1], gray600[2])
  doc.text(data.certificateCode, 30 + detailColWidth, detailY + 6)

  // Educator
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(gray800[0], gray800[1], gray800[2])
  doc.text('EDUCATOR', 30 + detailColWidth * 2, detailY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(gray600[0], gray600[1], gray600[2])
  doc.text(data.educatorName || 'Course Educator', 30 + detailColWidth * 2, detailY + 6)

  // Signature lines
  const sigY = pageHeight - 45
  doc.setDrawColor(gray400[0], gray400[1], gray400[2])
  doc.setLineWidth(0.5)

  // Left signature
  doc.line(30, sigY, 80, sigY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(gray800[0], gray800[1], gray800[2])
  doc.text('Platform Director', 55, sigY + 6, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(gray400[0], gray400[1], gray400[2])
  doc.text(data.institutionName, 55, sigY + 12, { align: 'center' })

  // Right signature
  doc.line(pageWidth - 80, sigY, pageWidth - 30, sigY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(gray800[0], gray800[1], gray800[2])
  doc.text('Education Lead', pageWidth - 55, sigY + 6, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(gray400[0], gray400[1], gray400[2])
  doc.text(data.institutionName, pageWidth - 55, sigY + 12, { align: 'center' })

  // Verification URL
  if (data.verificationUrl) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(gray400[0], gray400[1], gray400[2])
    doc.text(`Verify at: ${data.verificationUrl}`, pageWidth / 2, pageHeight - 18, { align: 'center' })
  }

  if (mode === 'blob') {
    return doc.output('blob')
  }

  doc.save(`${data.certificateCode}-certificate.pdf`)
}

export async function shareCertificate(data: {
  certificateCode: string
  verificationUrl: string
  courseTitle: string
}) {
  const shareData = {
    title: `Certificate of Completion - ${data.courseTitle}`,
    text: `I earned my certificate for "${data.courseTitle}"! Verify at: ${data.verificationUrl}`,
    url: data.verificationUrl,
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(shareData)
      return true
    } catch {
      return false
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(
      `I earned my certificate for "${data.courseTitle}"! Verify: ${data.verificationUrl}`
    )
    return true
  } catch {
    return false
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
        width: 200,
        margin: 2,
        color: { dark: '#1e40af', light: '#ffffff' },
      }).then(resolve).catch(reject)
    }).catch(reject)
  })
}

export const MOCK_PREVIEW_DATA: CertificateRenderData = {
  learnerName: 'John Doe',
  courseTitle: 'Sample Course Title',
  educatorName: 'Dr. Educator',
  institutionName: 'ACESS Platform',
  completionDate: new Date().toISOString(),
  certificateCode: 'ABCD-EFGH-IJKL',
  verificationUrl: 'https://acess.example.com/verify/ABCD-EFGH-IJKL',
  skills: ['Accessibility', 'Adaptive Learning', 'Inclusive Design'],
  courseDurationHours: 40,
}
