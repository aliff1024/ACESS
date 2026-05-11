# Architecture

## Overview

Next.js 16 App Router with Supabase for auth + database. Three React contexts manage global state. Custom API modules wrap Supabase queries. Middleware handles route-level auth gating.

## Data Flow

```
Browser                Next.js Server           Supabase
  │                        │                       │
  ├─ Page request ────────►├─ Middleware ──────────► getUser()
  │                        │◄──── session ────────┤
  │                        ├─ Allow/Redirect ─────►│
  │◄── HTML ──────────────┤                       │
  │                        │                       │
  ├─ Client action ───────►├─ API Route ──────────►│
  │ (fetch/click)          │  (learner-api.ts etc.)│
  │◄──── data ────────────┤◄────── data ──────────┤
```

## Provider Nesting

```
AuthProvider          — Supabase session, user metadata, preview mode
└── AccessibilityProvider  — Font size, theme, TTS, etc. → CSS data attributes on <html>
    └── LanguageProvider   — en/ms locale, t() function, persists to DB
        └── SessionTimeout — 15-min inactivity → 30s warning → auto-logout
            └── {children}
```

## Route Architecture

### Public Routes (bypass auth middleware)
`/`, `/login`, `/signup`, `/access-denied`, `/forgot-password`, `/reset-password`
`/api/auth/forgot-password`, `/api/auth/reset-password`

### Protected Routes (require auth + role check)
| Prefix | Role | Admin override |
|--------|------|----------------|
| `/learner` | learner | admin can access |
| `/educator` | educator | admin can access |
| `/admin` | admin | — |
| `/profile` | any authenticated | — |
| `/api/*` | any authenticated | — |

## API Modules

Three client-side modules wrap all Supabase queries. Each follows the same pattern:

```typescript
// Pattern
async function fetchSomething(): Promise<Type> {
  const userId = await ensureUserId()
  const { data, error } = await supabase
    .from('table')
    .select('...')
    .eq('user_id', userId)
  if (error) throw error
  return data
}
```

| Module | Lines | Purpose |
|--------|-------|---------|
| `src/lib/learner-api.ts` | ~1270 | Learner data (profile, courses, lessons, quizzes, progress, certs, recs, favorites, settings) |
| `src/lib/educator-api.ts` | ~838 | Course/lesson/quiz CRUD, students, analytics, uploads |
| `src/lib/admin-api.ts` | ~851 | System courses, chapters, milestones, templates, users, analytics, certs |

## Server-Side Clients

| File | Client | Usage |
|------|--------|-------|
| `src/lib/supabase.ts` | `createBrowserClient()` | Browser-side (anon key, respects RLS) |
| `src/lib/supabase-server.ts` | `createServerClient()` via `@supabase/ssr` | Server components + API routes (anon key) |
| `src/lib/recommendation-engine.ts` | `createClient()` with service role key | Bypasses RLS for cross-user operations |

## Key Design Decisions

- **No React Query / SWR** — Direct Supabase calls with `useState` + `useEffect`
- **No Server Actions** — All mutations via client-side Supabase calls
- **Service role for admin operations** — Password resets, recommendation generation
- **CSS data attributes for themes** — Accessibility settings applied via `data-*` attrs on `<html>`
- **Custom SMTP** — Bypasses Supabase email for password resets (more control)
