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

export async function sendPasswordResetEmail(email: string, resetLink: string, baseUrl: string) {
  const logoUrl = `${baseUrl}/light_logo.png`
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"ACESS" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset your ACESS password',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px">
          <tr><td align="center">
            <table role="presentation" width="500" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -1px rgba(0,0,0,.06)">
              <tr><td style="padding:40px 40px 0" align="center">
                <img src="${logoUrl}" alt="ACESS Logo" width="120" style="display:block;margin:0 auto 24px;" />
                <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a">Password Reset</h1>
                <p style="margin:0 0 32px;font-size:15px;color:#64748b">ACESS Learning Platform</p>
              </td></tr>
              <tr><td style="padding:0 40px">
                <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6">
                  Hello,<br><br>We received a request to reset the password for your ACESS account associated with <strong>${email}</strong>.
                </p>
                <div style="background:#f1f5f9;border-left:4px solid #3b82f6;padding:16px;margin-bottom:24px;border-radius:0 8px 8px 0;">
                  <p style="margin:0;font-size:14px;color:#475569;line-height:1.5">
                    Click the secure button below to choose a new password and regain access to your dashboard and learning materials.
                  </p>
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td align="center" style="padding:8px 0 32px">
                    <a href="${resetLink}" style="display:inline-block;padding:16px 36px;font-size:16px;font-weight:600;color:#fff;background:#3b82f6;border-radius:10px;text-decoration:none;box-shadow:0 2px 4px rgba(59, 130, 246, 0.3)">
                      Reset My Password
                    </a>
                  </td></tr>
                </table>
                <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.5">
                  If you didn't request a password reset, you can safely ignore this email. Your account remains secure.
                </p>
                <p style="margin:0 0 32px;font-size:13px;color:#94a3b8;line-height:1.5">
                  Having trouble with the button? Copy and paste this link into your browser:<br>
                  <a href="${resetLink}" style="color:#3b82f6;word-break:break-all;text-decoration:underline;">${resetLink}</a>
                </p>
              </td></tr>
              <tr><td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0" align="center">
                <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:500">The ACESS Support Team</p>
                <p style="margin:0;font-size:12px;color:#94a3b8">&copy; ${new Date().getFullYear()} ACESS Platform. All rights reserved.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  })
}

export async function sendInstructorApprovalEmail(
  email: string,
  fullName: string,
  options: { password?: string; loginUrl: string; baseUrl: string }
) {
  const hasAccount = !options.password
  const logoUrl = `${options.baseUrl}/light_logo.png`
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"ACESS" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Welcome to ACESS! Your Educator Application is Approved',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px">
          <tr><td align="center">
            <table role="presentation" width="500" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -1px rgba(0,0,0,.06)">
              <tr><td style="padding:40px 40px 0" align="center">
                <img src="${logoUrl}" alt="ACESS Logo" width="120" style="display:block;margin:0 auto 24px;" />
                <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a">Application Approved!</h1>
                <p style="margin:0 0 32px;font-size:15px;color:#64748b">Welcome to the ACESS Educator Community</p>
              </td></tr>
              <tr><td style="padding:0 40px">
                <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6">
                  Hello <strong>${fullName}</strong>,<br><br>
                  We are thrilled to inform you that your application to become an educator on ACESS has been reviewed and fully approved!
                </p>
                <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px;margin-bottom:24px;border-radius:0 8px 8px 0;">
                  <p style="margin:0;font-size:14px;color:#166534;line-height:1.5">
                    <strong>Your Educator privileges are active.</strong> You can now access the Educator Dashboard to create accessible courses, manage lessons, and start impacting learners worldwide.
                  </p>
                </div>
                ${hasAccount ? `
                  <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.6">
                    Your existing account has been upgraded. Please sign in with your email address <strong>${email}</strong>.
                  </p>
                ` : `
                  <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6">
                    We've automatically created an educator account for you under <strong>${email}</strong>.
                  </p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;margin:0 0 24px">
                    <tr><td align="center" style="padding:20px">
                      <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600">Your Temporary Password</p>
                      <p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;font-family:monospace;letter-spacing:2px">${options.password}</p>
                    </td></tr>
                  </table>
                  <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.5;text-align:center;">
                    <em>(Please change this password immediately after your first login.)</em>
                  </p>
                `}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td align="center" style="padding:8px 0 32px">
                    <a href="${options.loginUrl}" style="display:inline-block;padding:16px 36px;font-size:16px;font-weight:600;color:#fff;background:#22c55e;border-radius:10px;text-decoration:none;box-shadow:0 2px 4px rgba(34, 197, 94, 0.3)">
                      Access Educator Dashboard
                    </a>
                  </td></tr>
                </table>
              </td></tr>
              <tr><td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0" align="center">
                <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:500">The ACESS Educator Team</p>
                <p style="margin:0;font-size:12px;color:#94a3b8">&copy; ${new Date().getFullYear()} ACESS Platform. All rights reserved.</p>
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
