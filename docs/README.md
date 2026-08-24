# ACESS Platform

Adaptive Cognitive & Educational Skill Support Platform — an accessibility-first learning management system.

**Live:** https://acess-tau.vercel.app

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2.3 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + shadcn/ui (radix-nova) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Email | Nodemailer (Gmail SMTP) |
| Icons | Lucide React |
| Charts | Recharts |
| Animation | Framer Motion |
| Forms | React Hook Form |
| Toasts | Sonner |
| Carousel | Embla Carousel |

## Project Structure

```
src/
├── app/           Next.js pages + API routes
├── components/    UI, feature, and layout components
├── lib/           API clients, helpers, utilities
├── providers/     React contexts (Auth, Accessibility, Language)
├── locales/       en.ts, ms.ts — i18n translations
├── proxy.ts       Auth middleware
proxy.ts           Middleware entry point
scripts/           SQL migration files
supabase/          Supabase local config + migrations
public/            Static assets (logos, favicons)
```

## Environment Variables

See `.env.local` for values. Required vars:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin) |
| `SMTP_HOST` | SMTP server (smtp.gmail.com) |
| `SMTP_PORT` | SMTP port (587) |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Gmail App Password (16 chars) |
| `EMAIL_FROM` | Sender address |
| `GEMINI_API_KEY` | Google Gemini API key, powers the AI Lesson Assistant (summary + Q&A) |
| `GEMINI_MODEL` | Gemini model id (optional, defaults to `gemini-flash-latest`) |

To get a free Gemini API key: go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey),
sign in with a Google account, click "Create API key", and add it to `.env.local` as
`GEMINI_API_KEY=...`. Without this key set, the AI Lesson Assistant shows a
configuration error but the rest of the app is unaffected.

## Quick Start

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint
```

## Documentation

| Doc | Covers |
|-----|--------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System structure |
| [DATABASE.md](DATABASE.md) | Schema and migrations |
| [FEATURES.md](FEATURES.md) | Feature inventory |
| [SETUP.md](SETUP.md) | Local setup |
| [Accessibility.md](Accessibility.md) | Original accessibility preset specification (statement of intent) |
| [accessibility/](accessibility/README.md) | **Accessibility deep-dive** — learning-disability standards, per-setting reference + conflict matrix, and the preset redesign plan |

## Roles

- **Learner** — Browse/enroll in courses, take quizzes, earn certificates
- **Educator** — Create/manage courses, lessons, quizzes; view student progress
- **Admin** — System courses, users, certificates, analytics, reports
