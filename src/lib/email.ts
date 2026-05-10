import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function verifySmtpConnection() {
  try {
    await transporter.verify()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"ACESS" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset your ACESS password',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
          <tr><td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
              <tr><td style="padding:32px 32px 0" align="center">
                <h1 style="margin:0 0 4px;font-size:20px;color:#1e3a5f">Reset your password</h1>
                <p style="margin:0 0 24px;font-size:14px;color:#64748b">ACESS Accessibility Learning Platform</p>
              </td></tr>
              <tr><td style="padding:0 32px">
                <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6">
                  We received a request to reset the password for your ACESS account.
                  Click the button below to set a new password.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td align="center" style="padding:8px 0 24px">
                    <a href="${resetLink}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#fff;background:#2563eb;border-radius:8px;text-decoration:none">
                      Reset Password
                    </a>
                  </td></tr>
                </table>
                <p style="margin:0 0 12px;font-size:13px;color:#94a3b8;line-height:1.5">
                  If you didn't request this, you can safely ignore this email. The link expires in 1 hour.
                </p>
                <p style="margin:0 0 24px;font-size:13px;color:#94a3b8">
                  Or copy this link: <span style="font-size:12px;color:#64748b;word-break:break-all">${resetLink}</span>
                </p>
              </td></tr>
              <tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0" align="center">
                <p style="margin:0;font-size:12px;color:#94a3b8">&copy; 2026 ACESS &mdash; Adaptive Cognitive &amp; Educational Skill Support Platform</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  })
}

export async function sendVerificationEmail(email: string, verifyLink: string) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"ACESS" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify your email address',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
          <tr><td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
              <tr><td style="padding:32px 32px 0" align="center">
                <h1 style="margin:0 0 4px;font-size:20px;color:#1e3a5f">Verify your email</h1>
                <p style="margin:0 0 24px;font-size:14px;color:#64748b">Welcome to ACESS!</p>
              </td></tr>
              <tr><td style="padding:0 32px">
                <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6">
                  Thanks for signing up. Click the button below to verify your email address and activate your account.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td align="center" style="padding:8px 0 24px">
                    <a href="${verifyLink}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#fff;background:#2563eb;border-radius:8px;text-decoration:none">
                      Verify Email
                    </a>
                  </td></tr>
                </table>
                <p style="margin:0 0 24px;font-size:13px;color:#94a3b8;line-height:1.5">
                  If you didn't create an account, you can safely ignore this email.
                </p>
              </td></tr>
              <tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0" align="center">
                <p style="margin:0;font-size:12px;color:#94a3b8">&copy; 2026 ACESS &mdash; Adaptive Cognitive &amp; Educational Skill Support Platform</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  })
}
