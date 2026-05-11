# Setup Guide

## Local Development

### Prerequisites
- Node.js 18+
- npm
- Supabase project (free tier works)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
# Copy from .env.local or create with these keys:
# NEXT_PUBLIC_SUPABASE_URL=       https://<project>.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=  <anon key>
# SUPABASE_SERVICE_ROLE_KEY=      <service role key>
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=<your-gmail>
# SMTP_PASS=<16-char-gmail-app-password>
# EMAIL_FROM="ACESS" <your-gmail>

# 3. Run database migrations
# Open Supabase SQL Editor and run scripts in order:
#   scripts/scheme_script_corrected.sql
#   scripts/create-notifications.sql
#   scripts/create-favorites.sql
#   scripts/fix-admin-rls.sql
#   scripts/system_content_migration.sql
#   supabase/migrations/20260510_password_reset_tokens.sql
#   supabase/migrations/20260510_add_chapters_templates_checkpoints.sql
#   supabase/migrations/20260510_add_system_courses.sql

# 4. Start dev server
npm run dev
```

## Gmail App Password Setup

Required for SMTP email sending:

1. Go to Google Account → Security → 2-Step Verification → enable it
2. Go to Security → App passwords → "Other" → generate
3. Copy the 16-character password → set as `SMTP_PASS`
4. Set `SMTP_USER` to your Gmail address

## Deployment (Vercel)

### Automatic

```bash
# Install Vercel CLI
npm install -g vercel

# Login and link
vercel login
vercel link --project "acess"

# Set environment variables (repeat for each var)
vercel env add SMTP_HOST production --value "smtp.gmail.com" --yes
vercel env add SMTP_PASS production --value "<app-password>" --yes
# ... etc for all env vars

# Deploy
vercel deploy --prod --yes
```

### Manual (Vercel Dashboard)

1. Push to GitHub
2. Import repo in Vercel → auto-deploys from `main`
3. Set all env vars in Project Settings → Environment Variables
4. Redeploy if needed

## Key Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/kdlryupwmydirgvxuixd
- **Vercel Dashboard:** https://vercel.com/aliff1024s-projects/acess
- **Deployed Site:** https://acess-tau.vercel.app
- **GitHub Repo:** https://github.com/aliff1024/ACESS

## Troubleshooting

### Build fails with "Can't resolve 'nodemailer'"
```bash
npm install
```

### SMTP not sending emails
- Verify SMTP_PASS is the App Password (not Gmail login password)
- Check that 2-Step Verification is enabled for the Gmail account
- Test with `verifySmtpConnection()` in `src/lib/email.ts`

### Auth middleware blocking public routes
- Add new public routes to `PUBLIC_ROUTES` array in `src/proxy.ts`
- The middleware matcher regex in `proxy.ts` (root) catches all non-static routes

### forgot-password / reset-password not working
- Ensure `password_reset_tokens` table exists (run the migration)
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set (needed for admin password updates)
- Check that `/forgot-password`, `/reset-password`, and their API routes are in `PUBLIC_ROUTES`
