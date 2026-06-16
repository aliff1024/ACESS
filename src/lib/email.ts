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

export async function sendInstructorApprovalEmail(
  email: string,
  fullName: string,
  options: { password?: string; loginUrl: string }
) {
  const hasAccount = !options.password
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"ACESS" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your Educator Application Has Been Approved!',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
          <tr><td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
              <tr><td style="padding:32px 32px 0" align="center">
                <h1 style="margin:0 0 4px;font-size:20px;color:#1e3a5f">Welcome, ${fullName}!</h1>
                <p style="margin:0 0 24px;font-size:14px;color:#64748b">Your educator application has been approved</p>
              </td></tr>
              <tr><td style="padding:0 32px">
                <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6">
                  Congratulations! Your application to become an educator on ACESS has been reviewed and approved.
                  You can now create courses, manage lessons, and impact learners worldwide.
                </p>
                ${hasAccount ? `
                  <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6">
                    Sign in with your existing account using the email address <strong>${email}</strong> to access the educator dashboard.
                  </p>
                ` : `
                  <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6">
                    An account has been created for you with the email <strong>${email}</strong>.
                    Use the temporary password below to sign in. We recommend changing your password after logging in.
                  </p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:0 0 20px">
                    <tr><td align="center" style="padding:16px">
                      <p style="margin:0 0 4px;font-size:12px;color:#64748b">Temporary Password</p>
                      <p style="margin:0;font-size:18px;font-weight:700;color:#1e3a5f;font-family:monospace;letter-spacing:2px">${options.password}</p>
                    </td></tr>
                  </table>
                `}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td align="center" style="padding:8px 0 24px">
                    <a href="${options.loginUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#fff;background:#7c3aed;border-radius:8px;text-decoration:none">
                      Go to Educator Dashboard
                    </a>
                  </td></tr>
                </table>
                <p style="margin:0 0 12px;font-size:13px;color:#94a3b8;line-height:1.5">
                  Once signed in, you can start creating courses, uploading lessons, and building your educator profile.
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
