import { NextResponse } from 'next/server'
import { verifySmtpConnection, sendInstructorApprovalEmail } from '@/lib/email'

export async function GET() {
  const logs: string[] = []

  logs.push('--- SMTP Connection Test ---')
  const smtpResult = await verifySmtpConnection()
  logs.push(`SMTP verify: ${JSON.stringify(smtpResult)}`)

  logs.push('--- Environment Check ---')
  logs.push(`SMTP_HOST: ${process.env.SMTP_HOST || '(not set)'}`)
  logs.push(`SMTP_PORT: ${process.env.SMTP_PORT || '(not set)'}`)
  logs.push(`SMTP_USER: ${process.env.SMTP_USER || '(not set)'}`)
  logs.push(`SMTP_PASS: ${process.env.SMTP_PASS ? '***set***' : '(not set)'}`)
  logs.push(`EMAIL_FROM: ${process.env.EMAIL_FROM || '(not set)'}`)

  if (smtpResult.ok) {
    logs.push('--- Sending test email ---')
    try {
      await sendInstructorApprovalEmail('test@example.com', 'Test User', {
        password: 'TestPass123',
        loginUrl: 'https://acess-tau.vercel.app/login',
        baseUrl: 'https://acess-tau.vercel.app',
      })
      logs.push('Test email sent successfully!')
    } catch (err) {
      logs.push(`Send failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ logs })
}
