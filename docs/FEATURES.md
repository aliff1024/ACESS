# Features — Technical Reference

---

## 1. Authentication & Authorization

### 1.1 Login

**Tech:** `@supabase/supabase-js` — `supabase.auth.signInWithPassword({ email, password })`

**How it's used:**
```typescript
// src/app/login/page.tsx (client component)
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
```
- Called on form submit in the login page
- On success: reads `data.user.user_metadata.role` to determine redirect
  - `learner` → `/learner`
  - `educator` → `/educator`
  - `admin` → `/admin`
- First-time learners (no `learner_profiles` row) redirected to `/learner/onboarding`
- On error: displays message in a styled red `<AlertCircle>` alert box

**Effect:** Creates a Supabase session (access_token + refresh_token stored in cookies). User is redirected to their role-specific dashboard.

### 1.2 Signup

**Tech:** `@supabase/supabase-js` — `supabase.auth.signUp({ email, password, options: { data: { full_name, role } } })`

**How it's used:**
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name, role },  // stored in user_metadata
  },
})
```
- Called on signup form submit
- Uses `react-hook-form` with `zod` validation (email format, password min 6 chars)
- `role` selected via radio group: `learner` or `educator`
- If Supabase has `enable_confirmations: false`: session returned immediately, user logged in
- If confirmations enabled: toast says "Check your email to confirm"

**Effect:** Creates auth.users record + public.users record (via trigger). User metadata stores full_name and role.

### 1.3 Session Management

**Tech:** `AuthProvider` (React Context), `@supabase/supabase-js` — `getUser()`, `getSession()`, `onAuthStateChange()`

**How it's used:**
```typescript
// src/providers/AuthProvider.tsx
const { data: { session } } = await supabase.auth.getSession()
const { data: { user } } = await supabase.auth.getUser()

supabase.auth.onAuthStateChange((event, session) => {
  // event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED'
  setUser(session?.user ?? null)
  setIsAuthenticated(!!session)
  setIsLoading(false)
})
```
- Provider wraps entire app in `src/app/providers.tsx`
- Initializes on mount: checks existing session, sets loading state
- Listens to auth state changes for real-time updates

**Effect:** `useAuth()` hook exposes `{ user, isLoading, isAuthenticated, signOut }` app-wide. Components can conditionally render based on auth state.

### 1.4 Logout

**Tech:** `supabase.auth.signOut()`

**How it's used:**
```typescript
// src/components/auth/LogoutButton.tsx
const signOut = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}
```

**Effect:** Clears Supabase session cookies, redirects to login page. All protected routes become inaccessible.

### 1.5 Session Timeout

**Tech:** React `useEffect` with event listeners + countdown state

**How it's used:**
```typescript
// src/components/auth/SessionTimeout.tsx
// Tracks: mouse move, keydown, touch start, scroll
useEffect(() => {
  const reset = () => setLastActivity(Date.now())
  window.addEventListener('mousemove', reset)
  window.addEventListener('keydown', reset)
  // ...
  return () => { /* remove listeners */ }
}, [])

// Every 1s: check if 15min elapsed, show warning
// Warning: 30s countdown modal
// At 0: signOut()
```

**Effect:** After 15 minutes of no mouse/keyboard/touch activity, a modal appears with a 30-second countdown. User can click "Stay logged in" to reset. Otherwise, auto-logout executes.

### 1.6 Password Reset

**Tech:** `crypto.randomBytes()` for token generation, `nodemailer` for email, `createClient()` with service role key for admin password update

**Flow:** `/forgot-password` → `POST /api/auth/forgot-password` → email → `/reset-password?token=xxx&email=yyy` → `POST /api/auth/reset-password`

**Forgot password API (`src/app/api/auth/forgot-password/route.ts`):**
```typescript
// 1. Pre-check SMTP connection
await verifySmtpConnection()

// 2. Look up user in public.users table
const { data: publicUser } = await supabase
  .from('users').select('id, email')
  .eq('email', email.toLowerCase())
  .is('deleted_at', null).maybeSingle()

// 3. Fallback: search auth.users via admin API
const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const { data: authData } = await adminSupabase.auth.admin.listUsers()

// 4. Generate token
const token = crypto.randomBytes(32).toString('hex')
const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

// 5. Store in DB
await supabase.from('password_reset_tokens').insert({
  user_id: userId, email, token, expires_at: expiresAt,
})

// 6. Send email via Nodemailer
const resetLink = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(email)}`
await sendPasswordResetEmail(email, resetLink)
```

**Reset password API (`src/app/api/auth/reset-password/route.ts`):**
```typescript
// 1. Validate token exists and not used
const { data: resetToken } = await supabase
  .from('password_reset_tokens').select('*')
  .eq('token', token).eq('email', email).eq('used', false).single()

// 2. Check expiry
if (new Date(resetToken.expires_at) < new Date()) {
  return NextResponse.json({ error: 'Reset link expired' })
}

// 3. Update password via admin API (bypasses RLS)
const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
await adminSupabase.auth.admin.updateUserById(resetToken.user_id, { password })

// 4. Mark token as used
await supabase.from('password_reset_tokens').update({ used: true }).eq('id', resetToken.id)
```

**Effect:** Custom password reset flow that bypasses Supabase's built-in email system. Full control over email design and delivery via Gmail SMTP. Security: tokens expire in 1 hour, one-time use, no email enumeration (returns `{ sent: true }` even if email not found).

### 1.7 Role-Based Access (Middleware)

**Tech:** `@supabase/ssr` — `createServerClient()`, Next.js middleware pattern via `proxy.ts`

**Implementation:**
```typescript
// src/proxy.ts
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/access-denied',
  '/forgot-password', '/reset-password',
  '/api/auth/forgot-password', '/api/auth/reset-password']

const ROLE_PREFIXES = {
  '/learner': 'learner',
  '/educator': 'educator',
  '/admin': 'admin',
}

export async function proxy(request: NextRequest) {
  // 1. Check public routes → skip auth
  if (PUBLIC_ROUTES.includes(pathname)) return NextResponse.next()

  // 2. Create server client with cookie handling
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: { getAll() { return request.cookies.getAll() }, setAll(...) { ... } }
  })

  // 3. Get user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  // 4. Check role
  const role = user.user_metadata?.role || 'learner'
  for (const [prefix, requiredRole] of Object.entries(ROLE_PREFIXES)) {
    if (pathname.startsWith(prefix)) {
      if (role === 'admin') continue  // admin bypass
      if (role !== requiredRole) return NextResponse.redirect(new URL('/access-denied', request.url))
    }
  }
}
```

**Matcher config** (root `proxy.ts`):
```typescript
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
}
```

**Effect:** Every request (except static assets) is intercepted. Unauthenticated users are redirected to login. Users on wrong role paths get "access denied". Admin can access everything. New public routes must be added to the `PUBLIC_ROUTES` array.

---

## 2. Accessibility

### 2.1 Settings Provider

**Tech:** React Context + `@supabase/supabase-js` queries + CSS data attributes

**How it's used:**
```typescript
// src/providers/AccessibilityProvider.tsx
interface AccessibilitySettingsData {
  preferred_font_size: 'small' | 'medium' | 'large' | 'xlarge'
  preferred_theme: 'light' | 'dark' | 'high_contrast' | 'soft'
  line_spacing: 'normal' | 'relaxed' | 'loose'
  preferred_font: 'default' | 'serif' | 'sans_serif' | 'dyslexia'
  reduced_motion: boolean
  simplified_ui: boolean
  tts_enabled: boolean
  // ... more settings
}

// Load on mount:
const { data } = await supabase.from('user_accessibility_settings')
  .select('*').eq('user_id', userId).maybeSingle()

// Apply to DOM:
useEffect(() => {
  document.documentElement.setAttribute('data-font-size', settings.preferred_font_size)
  document.documentElement.setAttribute('data-theme', settings.preferred_theme)
  document.documentElement.setAttribute('data-line-spacing', settings.line_spacing)
  document.documentElement.setAttribute('data-font-type', settings.preferred_font)
  if (settings.reduced_motion) {
    document.documentElement.setAttribute('data-reduced-motion', 'true')
  } else {
    document.documentElement.removeAttribute('data-reduced-motion')
  }
  // ... simplified_ui similarly
}, [settings])
```

**Effect:** Settings are saved to DB and applied as CSS data attributes on `<html>`. Any CSS rule using `[data-font-size="xlarge"]` or `[data-theme="high_contrast"]` takes effect globally.

### 2.2 CSS Theme Overrides

**Tech:** Tailwind CSS v4 + CSS custom properties with attribute selectors

**How it's used (globals.css):**
```css
/* Font sizes */
[data-font-size="small"] { --font-size-base: 14px; }
[data-font-size="medium"] { --font-size-base: 16px; }
[data-font-size="large"] { --font-size-base: 18px; }
[data-font-size="xlarge"] { --font-size-base: 20px; }

/* Themes */
[data-theme="dark"] {
  --color-bg: #111827; --color-text: #f3f4f6; --color-primary: #60a5fa;
}
[data-theme="high_contrast"] {
  --color-bg: #000000; --color-text: #ffd700; --color-primary: #00e5ff;
}
[data-theme="soft"] {
  --color-bg: #faf8f5; --color-text: #5c4a3a; --color-primary: #6b8cae;
}

/* Line spacing */
[data-line-spacing="relaxed"] { --line-height: 1.8; }
[data-line-spacing="loose"] { --line-height: 2.2; }

/* Font types */
[data-font-type="serif"] { --font-family: 'Georgia', 'Times New Roman', serif; }
[data-font-type="dyslexia"] {
  --font-family: 'Trebuchet MS', 'Chalkboard SE', sans-serif;
  letter-spacing: 0.05em; word-spacing: 0.15em;
}

/* Reduced motion */
[data-reduced-motion="true"] *, [data-reduced-motion="true"] *::before, [data-reduced-motion="true"] *::after {
  transition: none !important;
  animation: none !important;
}

/* Simplified UI — hides elements with .simplifiable class */
[data-simplified-ui="true"] .simplifiable { display: none !important; }
```

**Effect:** Changing a setting in the modal instantly updates the entire UI. No page reload needed. The `high_contrast` theme uses black background with yellow text for maximum visibility. The `soft` theme uses warm, muted colors to reduce visual stress.

### 2.3 Settings UI

**Tech:** React `useState` + `useEffect`, CSS `overflow-y-auto` modal

**How it's used:**
```typescript
// src/components/learner/AccessibilitySettingsModal.tsx
// Each setting is a card:
<div className="border rounded-xl p-4">
  <div className="flex items-center justify-between mb-2">
    <label className="font-semibold">Font Size</label>
    <span className="text-sm text-gray-500">{fontSizeLabels[settings.preferred_font_size]}</span>
  </div>
  <RadioGroup value={settings.preferred_font_size} onValueChange={handleChange('preferred_font_size')}>
    {['small', 'medium', 'large', 'xlarge'].map(size => (
      <RadioGroupItem key={size} value={size} label={size.charAt(0).toUpperCase() + size.slice(1)} />
    ))}
  </RadioGroup>
</div>
```

**Effect:** User can customize 10+ accessibility parameters in a scrollable modal. Changes are applied immediately and persisted to DB on next login.

---

## 3. Language / i18n

### 3.1 Translation Provider

**Tech:** React Context with locale files lookup

**How it's used:**
```typescript
// src/providers/LanguageProvider.tsx
const [locale, setLocale] = useState<'en' | 'ms'>(() => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('preferred_language') as 'en' | 'ms') || 'en'
  }
  return 'en'
})

// Translation function
const t = (key: string, params?: Record<string, string>): string => {
  let text = translations[locale]?.[key] ?? key
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v)
    })
  }
  return text
}
```

**Locale files:**
```typescript
// src/locales/en.ts — 155 keys
export const en = {
  'nav.dashboard': 'Dashboard',
  'nav.courses': 'Courses',
  'nav.progress': 'Progress',
  'nav.certificates': 'Certificates',
  'accessibility.fontSize': 'Font Size',
  'accessibility.theme': 'Theme',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  // ... 150 more
}

// src/locales/ms.ts — same keys, Malay values
export const ms = {
  'nav.dashboard': 'Papan Pemuka',
  'nav.courses': 'Kursus',
  'nav.progress': 'Kemajuan',
  // ...
}
```

**Usage in components:**
```typescript
import { useTranslation } from '@/lib/useTranslation'
const { t, locale, setLocale } = useTranslation()
return <h1>{t('nav.dashboard')}</h1>
// With params: {t('progress.count', { completed: '5', total: '10' })}
```

**Effect:** All UI text goes through `t()`. Switching locale instantly re-renders all text. Locale persists in localStorage and syncs to `user_accessibility_settings.preferred_language`. Currently supports English and Malay.

### 3.2 Persistence

```typescript
// Sync to DB when auth state changes
useEffect(() => {
  if (user && locale) {
    supabase.from('user_accessibility_settings')
      .upsert({ user_id: user.id, preferred_language: locale })
  }
}, [locale, user])
```

---

## 4. Theming

### 4.1 System Preference Detection

**Tech:** `next-themes` library

**How it's used:**
```typescript
// Layout or provider
import { ThemeProvider } from 'next-themes'
;<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

**Effect:** Automatically detects `prefers-color-scheme` from the OS/browser. The `data-theme` attribute on `<html>` is set to either `light` or `dark` based on system preference when the user selects "System" (default).

### 4.2 Custom Themes

**Tech:** `data-theme` CSS attribute selectors

**Four themes:**
| `data-theme` | Background | Text | Primary | Use Case |
|-------------|-----------|------|---------|----------|
| `light` (default) | `#ffffff` | `#111827` | `#2563eb` | Standard use |
| `dark` | `#111827` | `#f3f4f6` | `#60a5fa` | Low-light environments |
| `soft` | `#faf8f5` | `#5c4a3a` | `#6b8cae` | Visual sensitivity, ADHD |
| `high_contrast` | `#000000` | `#ffd700` | `#00e5ff` | Visual impairment |

**Effect:** Theme switch is immediate via CSS attribute — no page reload, no layout shift.

---

## 5. Course Management

### 5.1 Data Access Patterns

**Tech:** Direct Supabase queries via `educator-api.ts` / `learner-api.ts`

**Fetching enrolled courses:**
```typescript
// src/lib/learner-api.ts — fetchEnrolledCourses()
const { data: enrollments } = await supabase
  .from('enrollments')
  .select(`id, status, course_id, courses!inner(id, title, description, ...)`)
  .eq('user_id', userId)
  .neq('status', 'dropped')

// Then for each course, count lessons and viewed lessons:
const { data: lessons } = await supabase
  .from('lessons').select('id, course_id')
  .in('course_id', courseIds).eq('status', 'published')

const { data: lp } = await supabase
  .from('lesson_progress').select('lesson_id, enrollment_id, is_viewed')
  .in('enrollment_id', enrollmentIds)

// Progress = viewed / total * 100
```

**Effect:** Learner sees a list of enrolled courses with title, progress bar, and thumbnail. Progress is calculated as `(viewed lessons / total lessons) * 100`.

### 5.2 Course Detail with Lesson Status

```typescript
// src/lib/learner-api.ts — fetchCourseDetail(courseId)
const { data: lessons } = await supabase
  .from('lessons').select('id, title, sequence_order')
  .eq('course_id', courseId).eq('status', 'published')
  .order('sequence_order', { ascending: true })

// Determine status:
lessons.map((l, i) => ({
  ...l,
  status: completedSet.has(l.id) ? 'completed'
    : (i === 0 || completedSet.has(lessons[i-1].id)) ? 'current'
    : 'locked'
}))
```

**Effect:** Lesson tree shows: green = completed, blue = current/unlocked, gray = locked (prerequisite not met). Locked lessons cannot be accessed.

### 5.3 Educator Course CRUD

**Tech:** `educator-api.ts` — `fetchEducatorCourses()`, `createCourse()`, `updateCourse()`

```typescript
// Create course with tags
const { data: course } = await supabase
  .from('courses').insert({ title, slug, description, ... }).select().single()

await supabase.from('course_tags').insert(tags.map(tag => ({ course_id: course.id, tag })))
```

**Effect:** Educators can create courses with title, description, difficulty level, category, tags, and thumbnail. Courses start as `draft` and must be published to be visible to learners.

---

## 6. Quiz System

### 6.1 Quiz Data Loading

**Tech:** `educator-api.ts` quiz builder + `learner-api.ts` quiz taker

**Fetching quiz for a lesson:**
```typescript
// src/lib/learner-api.ts — fetchQuizData(lessonId)
const { data: quiz } = await supabase
  .from('quizzes').select('id, title, time_limit_seconds, max_attempts, pass_threshold_pct')
  .eq('lesson_id', lessonId).maybeSingle()

const { data: questions } = await supabase
  .from('quiz_questions').select('id, question_text, question_type, sequence_order')
  .eq('quiz_id', quiz.id).order('sequence_order')

const { data: options } = await supabase
  .from('quiz_options').select('id, question_id, option_text, is_correct, sequence_order')
  .in('question_id', questionIds).order('sequence_order')

// Group options by question
const optionsByQuestion = new Map()
for (const opt of options) {
  (optionsByQuestion.get(opt.question_id) || []).push(opt)
}
```

**Effect:** Returns a complete quiz object with all questions and their options, ready for the UI to render one question at a time.

### 6.2 Attempt Limit Check

```typescript
// src/lib/learner-api.ts — checkQuizAttempts(lessonId, courseId)
const { count } = await supabase
  .from('quiz_attempts').select('*', { count: 'exact', head: true })
  .eq('enrollment_id', enrollment.id)
  .eq('quiz_id', quiz.id)

const canAttempt = (count ?? 0) < maxAttempts
```

**Effect:** Prevents learners from taking a quiz if they've exhausted all allowed attempts. Shows a message like "You have used all 3 allowed attempts."

### 6.3 Quiz UI

**Tech:** React state (`useState`, `useRef`, `useEffect`) + timer using `setInterval`

```typescript
// src/components/courses/QuizPage.tsx
// Timer effect:
useEffect(() => {
  if (!timeLimit || timeLimit <= 0) return
  const interval = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        clearInterval(interval)
        handleAutoSubmit()  // auto-submit when timer hits 0
        return 0
      }
      return prev - 1
    })
  }, 1000)
  return () => clearInterval(interval)
}, [timeLimit])

// Flag for review (local state, not persisted):
const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set())

// Sidebar question indicators:
// green = answered, amber = flagged, gray = unanswered, blue = current
const getQuestionColor = (qId: string, index: number) => {
  if (currentIndex === index) return 'bg-blue-500'
  if (answeredQuestions.has(qId)) return 'bg-green-500'
  if (flaggedQuestions.has(qId)) return 'bg-amber-500'
  return 'bg-gray-300'
}
```

**Effect:** Learner sees one question at a time. Left sidebar shows all questions with status colors. Timer counts down at top-right. Auto-submit fires when time runs out (uses `answersRef.current` to avoid stale closures). "Flag for Review" toggles a visual marker — purely a local UI concern, not stored in DB.

### 6.4 Quiz Submission

```typescript
// src/lib/learner-api.ts — submitQuizAttempt({ quizId, courseId, answers })
// 1. Get enrollment
const { data: enrollment } = await supabase
  .from('enrollments').select('id').eq('user_id', userId).eq('course_id', courseId).single()

// 2. Determine attempt number
const { data: existingAttempts } = await supabase
  .from('quiz_attempts').select('attempt_number')
  .eq('enrollment_id', enrollment.id).eq('quiz_id', quizId)
  .order('attempt_number', { ascending: false }).limit(1)
const attemptNumber = (existingAttempts?.[0]?.attempt_number || 0) + 1

// 3. Calculate score (check each answer against quiz_options.is_correct)
let correctCount = 0
for (const answer of params.answers) {
  const { data: opt } = await supabase
    .from('quiz_options').select('is_correct').eq('id', answer.selectedOptionId).single()
  if (opt?.is_correct) correctCount++
}
const score = Math.round((correctCount / totalQuestions) * 100)
const passed = (quiz?.pass_threshold_pct ?? 80) <= score

// 4. Insert attempt record
const { data: attempt } = await supabase
  .from('quiz_attempts').insert({ enrollment_id, quiz_id, attempt_number, score_pct: score, result: passed ? 'pass' : 'fail' })
  .select().single()

// 5. Insert answer records
const answerRows = params.answers.map(a => ({ attempt_id: attempt.id, question_id: a.questionId, selected_option_id: a.selectedOptionId }))
await supabase.from('quiz_answers').insert(answerRows)
```

**Effect:** Each attempt is recorded with a sequential attempt number, score percentage, and pass/fail result. All individual answers are stored for later review. The quiz attempts feed into the recommendation engine (failed quizzes trigger revision recommendations).

### 6.5 Quiz Builder (Educator)

**Tech:** `educator-api.ts` — `createQuiz()`, `updateQuiz()`, `addQuestion()`

```typescript
// src/components/educator/QuizBuilderModal.tsx
// Quiz creation calls:
const quiz = await createQuiz(lessonId, { title, timeLimit, maxAttempts, passThreshold })
for (const q of questions) {
  const question = await addQuestion(quiz.id, { text, type, order })
  for (const opt of q.options) {
    await addOption(question.id, { text, isCorrect, order })
  }
}
```

**Effect:** Educators build quizzes through a modal. Each question can have multiple options with correct/incorrect marking. Quizzes are linked 1:1 to lessons.

---

## 7. Certificate System

### 7.1 Certificate Data

**Tech:** `learner-api.ts` — `fetchCertificates()`

```typescript
// Join: enrollments → certificates, enrollments → courses
const { data: enrollments } = await supabase
  .from('enrollments').select('id, course_id')
  .eq('user_id', userId).eq('status', 'completed')

const { data: certs } = await supabase
  .from('certificates').select('id, enrollment_id, reference_code, issued_at')
  .in('enrollment_id', enrollmentIds).eq('status', 'issued')

// Score: best quiz score across all attempts
const { data: attempts } = await supabase
  .from('quiz_attempts').select('enrollment_id, score_pct')
  .in('enrollment_id', enrollmentIds)
```

**Effect:** Certificates are issued when a course is completed. Each certificate has a unique `reference_code`. The best quiz score across all attempts is shown on the certificate. Status can be `issued` or `revoked` by admin.

### 7.2 Admin Certificate Management

```typescript
// src/lib/admin-api.ts — revokeCertificate(certId, reason)
await supabase.from('certificates')
  .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoke_reason: reason })
  .eq('id', certId)
```

**Effect:** Admin can revoke certificates with a reason. Revoked certificates are no longer shown as valid.

---

## 8. Recommendation Engine

### 8.1 Core Engine

**Tech:** `createClient()` with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS), batch Supabase operations

**Full algorithm (`src/lib/recommendation-engine.ts`):**

```typescript
export async function generateRecommendations(userId: string): Promise<void> {
  // Admin client bypasses RLS — needed to read/write recommendations table
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  // STEP 1: Get active enrollments
  const { data: enrollments } = await admin
    .from('enrollments').select('id, course_id')
    .eq('user_id', userId).neq('status', 'dropped')

  // STEP 2: Get courses with tags and lessons
  const { data: courses } = await admin
    .from('courses').select('id, title, category, course_tags(tag), lessons(id, title, sequence_order)')
    .in('id', courseIds)

  // STEP 3: Get lesson progress
  const { data: lessonProgress } = await admin
    .from('lesson_progress').select('enrollment_id, lesson_id, is_viewed')
    .in('enrollment_id', enrollmentIds)

  // Build viewed set per enrollment
  const viewedMap = new Map<string, Set<string>>()
  for (const lp of lessonProgress || []) {
    if (!lp.is_viewed) continue
    const set = viewedMap.get(lp.enrollment_id) || new Set()
    set.add(lp.lesson_id)
    viewedMap.set(lp.enrollment_id, set)
  }

  // STEP 4: Get failed quiz attempts
  // First get quizzes → lesson mapping
  const { data: quizzes } = await admin
    .from('quizzes').select('id, lesson_id').in('lesson_id', allLessonIds)

  // Then get failed attempts
  const { data: attempts } = await admin
    .from('quiz_attempts').select('enrollment_id, quiz_id, score_pct')
    .in('enrollment_id', enrollmentIds).in('quiz_id', quizIds)
    .eq('result', 'fail')

  // Build failed quiz map per enrollment
  const failedQuizMap = new Map<string, Map<string, number>>()
  for (const a of attempts || []) {
    const lessonId = quizToLesson.get(a.quiz_id)
    if (!lessonId) continue
    const map = failedQuizMap.get(a.enrollment_id) || new Map()
    const existing = map.get(lessonId) ?? 100
    if ((a.score_pct ?? 0) < existing) map.set(lessonId, a.score_pct ?? 0)
    failedQuizMap.set(a.enrollment_id, map)
  }

  // STEP 5: Generate recommendations for each enrollment
  const allRecs: GeneratedRec[] = []

  // 5a. Revision: failed quiz lessons
  for (const lesson of lessons) {
    const score = failedQuizMap.get(enrollment.id)?.get(lesson.id)
    if (score !== undefined) {
      allRecs.push({
        enrollment_id: enrollment.id,
        recommended_lesson_id: lesson.id,
        difficulty_tier: 'revision',
        trigger_reason: `You scored ${score}% on the "${lesson.title}" quiz. Review the material and try again.`,
      })
    }
  }

  // 5b. Standard: next incomplete lesson
  const nextLesson = lessons.find(l => !viewedSet.has(l.id))
  if (nextLesson && !failedSet.has(nextLesson.id)) {
    allRecs.push({
      enrollment_id: enrollment.id,
      recommended_lesson_id: nextLesson.id,
      difficulty_tier: 'standard',
      trigger_reason: `Continue your learning — "${nextLesson.title}" is up next in ${course.title}.`,
    })
  }

  // 5c. Advanced: near completion (≥80%)
  if (progress >= 80 && lessons.length > 0) {
    allRecs.push({
      enrollment_id: enrollment.id,
      recommended_lesson_id: lessons[lessons.length - 1].id,
      difficulty_tier: 'advanced',
      trigger_reason: `You're almost done with ${course.title}! Review the final lesson.`,
    })
  }

  // STEP 6: Cross-course recommendations (tag matching)
  // Get all published courses user isn't enrolled in
  const { data: allCourseIds } = await admin
    .from('courses').select('id').eq('status', 'published').is('deleted_at', null)
  const unenrolledIds = allCourseIds.filter(id => !enrolledCourseIds.includes(id))

  // Score by tag overlap (+2 per matching tag, +1 for matching category)
  const scored = []
  for (const c of unenrolledCourses) {
    let score = 0
    for (const tag of c.tags) if (allUserTags.has(tag)) score += 2
    if (c.category && userCategories.has(c.category)) score += 1
    if (score > 0) scored.push({ course: c, score })
  }
  scored.sort((a, b) => b.score - a.score)

  // Recommend first lesson of top 2 matching courses
  for (const { course } of scored.slice(0, 2)) {
    allRecs.push({
      enrollment_id: enrollmentIds[0],
      recommended_lesson_id: firstLesson.id,
      difficulty_tier: 'advanced',
      trigger_reason: `Based on your interest in "${matchTags[0]}", check out "${course.title}"`,
    })
  }

  // STEP 7: Replace old recommendations
  if (allRecs.length > 0) {
    await admin.from('recommendations').delete().in('enrollment_id', enrollmentIds)
    // Insert in batches of 10
    for (let i = 0; i < allRecs.length; i += 10) {
      await admin.from('recommendations').insert(allRecs.slice(i, i + 10))
    }
  }
}
```

**Effect:** Whenever `fetchRecommendations()` is called from the learner dashboard, the engine:
1. Scans all active enrollments
2. Finds failed quizzes → creates "revision" recommendations
3. Finds next unviewed lesson → creates "standard" recommendations
4. Finds near-complete courses → creates "advanced" recommendations
5. Finds similar unenrolled courses by tag overlap → cross-course recommendations
6. Replaces all old recommendations with fresh ones

### 8.2 API Route

```typescript
// POST /api/recommendations/generate
export async function POST() {
  // Auth check via supabase-server
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Generate
  await generateRecommendations(user.id)

  // Fetch and return the top 3
  const { data: recs } = await supabase
    .from('recommendations')
    .select(`id, difficulty_tier, trigger_reason, recommended_lesson_id, lessons!inner(id, title, course_id)`)
    .in('enrollment_id', enrollmentIds)
    .eq('is_acknowledged', false)
    .order('created_at', { ascending: false })
    .limit(3)

  return NextResponse.json({ success: true, recommendations: recs.map(formatRec) })
}
```

**Effect:** Single POST endpoint generates + returns recommendations. No separate fetch needed. The response includes `lesson_id`, `lesson_title`, `course_id`, `difficulty_tier`, and `trigger_reason`.

### 8.3 UI Integration

```typescript
// src/components/learner/AdaptiveRecommendations.tsx
// On mount:
const res = await fetch('/api/recommendations/generate', { method: 'POST' })
const data = await res.json()
setRecommendations(data.recommendations || [])

// Render: 3-card grid
// Each card: icon (based on tier), title, reason, "Start Lesson" button
// Tier config:
const tierConfig = {
  revision: { label: 'Easy', icon: RotateCcw, color: 'orange' },
  standard: { label: 'Medium', icon: Book, color: 'blue' },
  advanced: { label: 'Hard', icon: TrendingUp, color: 'purple' },
}

// onStartLesson(lessonId, courseId) → navigates to the lesson
```

**Effect:** Dashboard loads with personalized recommendations. Each card has a colored difficulty badge, descriptive reason, and a button that navigates directly to that lesson.

---

## 9. Notification System

### 9.1 Database Triggers

**Tech:** PostgreSQL functions + triggers, `SECURITY DEFINER` for cross-user insert

```sql
-- SECURITY DEFINER function allows inserting notifications for other users
CREATE FUNCTION public.create_notification(
  p_user_id UUID, p_type TEXT, p_title TEXT, p_body TEXT, p_metadata JSONB DEFAULT '{}'
) RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (p_user_id, p_type, p_title, p_body, p_metadata);
END;
$$;

-- Example trigger: notify educator on enrollment
CREATE FUNCTION public.notify_on_enrollment()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  educator_id UUID;
  course_title TEXT;
BEGIN
  SELECT created_by, title INTO educator_id, course_title
  FROM public.courses WHERE id = NEW.course_id;

  PERFORM public.create_notification(
    educator_id,
    'enrollment',
    'New Enrollment',
    format('A new learner enrolled in "%s"', course_title),
    jsonb_build_object('enrollment_id', NEW.id, 'course_id', NEW.course_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_enrollment_notify
  AFTER INSERT ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_enrollment();
```

**Five database triggers fire automatically:**
| Trigger | Event | Action |
|---------|-------|--------|
| `on_enrollment_notify` | INSERT enrollment | Notify course creator |
| `on_lesson_progress_notify` | INSERT lesson_progress (first view) | Notify educator |
| `on_quiz_attempt_notify` | INSERT quiz_attempts | Notify educator |
| `on_lesson_added_notify` | INSERT lessons | Notify all enrolled learners |
| `on_course_published_notify` | UPDATE courses (→ published) | Notify all enrolled learners |

**Effect:** Notifications are created automatically at the database level — no application code needed to trigger them. They fire on INSERT/UPDATE regardless of which client (web, API, direct DB) made the change.

### 9.2 Client Fetching

```typescript
// src/lib/notifications.ts
export async function fetchNotifications(limit = 20) {
  const userId = await ensureUserId()
  const { data } = await supabase
    .from('notifications').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(limit)
  return data || []
}

export async function getUnreadCount() {
  const userId = await ensureUserId()
  const { count } = await supabase
    .from('notifications').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('is_read', false)
  return count ?? 0
}

export async function markAsRead(id: string) {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
}

export async function markAllAsRead() {
  const userId = await ensureUserId()
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
}
```

**Effect:** UI displays unread count as a badge on the bell icon. Clicking opens a dropdown with recent notifications. Each notification shows type-specific icon, title, body, and time-ago. "Mark all as read" clears the badge.

---

## 10. Email System

### 10.1 SMTP Transport

**Tech:** `nodemailer` with Gmail SMTP

```typescript
// src/lib/email.ts
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',  // Gmail SMTP server
  port: Number(process.env.SMTP_PORT) || 587,        // TLS port
  secure: false,                                       // false for 587
  auth: {
    user: process.env.SMTP_USER,                      // Full Gmail address
    pass: process.env.SMTP_PASS,                      // 16-char App Password
  },
})
```

**Why Gmail SMTP over Resend:** Resend's free tier (`onboarding@resend.dev`) can only send to the registered email address, blocking delivery to other recipients for testing. Gmail SMTP + App Password works with any recipient.

**Pre-requisite:** Gmail account must have 2-Step Verification enabled, and an App Password must be generated at Google Account → Security → App passwords.

### 10.2 Email Functions

```typescript
// Verify SMTP connectivity
export async function verifySmtpConnection() {
  try {
    await transporter.verify()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, resetLink: string) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"ACESS" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset your ACESS password',
    html: `<!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,...">
        <!-- White card (480px) on gray background -->
        <!-- Title: "Reset your password" -->
        <!-- Subtitle: "ACESS Accessibility Learning Platform" -->
        <!-- Body: "We received a request..." -->
        <!-- Blue button: "Reset Password" linking to ${resetLink} -->
        <!-- Footer: "If you didn't request this, ignore. Link expires in 1 hour." -->
        <!-- Plain text fallback: ${resetLink} -->
      </body></html>`,
  })
}

// Send verification email (similar template, different copy)
export async function sendVerificationEmail(email: string, verifyLink: string) { ... }
```

### 10.3 Integration

**Password reset flow:**
```typescript
// POST /api/auth/forgot-password
// 1. Verify SMTP: await verifySmtpConnection()
// 2. Generate token: crypto.randomBytes(32).toString('hex')
// 3. Store in password_reset_tokens
// 4. Build link: ${origin}/reset-password?token=${token}&email=${email}
// 5. Send: await sendPasswordResetEmail(email, resetLink)
```

**Effect:** Branded HTML emails with responsive design. Blue call-to-action button. Plain text fallback for email clients that block images. 1-hour token expiry mentioned in the email.

---

## 11. Quiz UI Components

### 11.1 Left Sidebar (Question Navigator)

**Tech:** React `useState` with `Set<string>` for tracking answered/flagged questions

```typescript
// Color coding:
// Green  → answered
// Amber  → flagged for review
// Gray   → unanswered
// Blue   → current question

const getDotColor = (qId: string, index: number) => {
  if (index === currentIndex) return 'bg-blue-500 ring-2 ring-blue-300'
  if (answers.some(a => a.questionId === qId)) return 'bg-green-500'
  if (flagged.has(qId)) return 'bg-amber-400'
  return 'bg-gray-300'
}
```

**Effect:** Learner can see at a glance which questions are answered, flagged, or skipped. Clicking a dot jumps to that question. The current question is highlighted with a ring.

### 11.2 Timer

**Tech:** `useEffect` with `setInterval`, `useRef` for stale closure prevention

```typescript
const timerRef = useRef<NodeJS.Timeout | null>(null)
const autoSubmitRef = useRef(handleAutoSubmit)
autoSubmitRef.current = handleAutoSubmit  // Always current

useEffect(() => {
  if (!timeLimit || timeLimit <= 0) return
  timerRef.current = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        clearInterval(timerRef.current!)
        autoSubmitRef.current()  // Auto-submit
        return 0
      }
      return prev - 1
    })
  }, 1000)
  return () => clearInterval(timerRef.current!)
}, [timeLimit])
```

**Effect:** Timer counts down from the quiz's `time_limit_seconds`. When it reaches 0, the quiz is automatically submitted using the current answers. The `useRef` pattern ensures the auto-submit callback always has access to the latest answers (avoids stale closure bug).

---

## 12. Logo & Favicon

### 12.1 Logo Component

**Tech:** `next/image` with `next-themes` theme detection

```typescript
// src/components/ui/Logo.tsx
import { useTheme } from 'next-themes'

export function Logo({ size = 'md', href, showSubtitle = false }: LogoProps) {
  const { resolvedTheme } = useTheme()  // 'light' or 'dark'
  const logoSrc = resolvedTheme === 'dark' ? '/dark_logo.png' : '/light_logo.png'

  const sizes = { sm: 'h-6', md: 'h-8', lg: 'h-10', xl: 'h-12' }
  const Wrapper = href ? 'a' : 'div'

  return (
    <Wrapper href={href} className="flex items-center gap-2">
      <Image src={logoSrc} alt="ACESS" width={2312} height={628}
        className={`w-auto ${sizes[size]} object-contain`} />
      {showSubtitle && <span className="text-sm text-gray-500">Adaptive Learning</span>}
    </Wrapper>
  )
}
```

**Role-based routing on click:**
```typescript
const getDashboardLink = (role?: string) => {
  switch (role) {
    case 'admin': return '/admin'
    case 'educator': return '/educator'
    case 'learner': return '/learner'
    default: return '/'
  }
}
```

**Effect:** Logo automatically switches between light and dark variants based on the current theme. Clicking navigates to the user's role-appropriate dashboard. Size adapts to container via `h-*` classes.

### 12.2 Favicon Switching

**Tech:** Next.js metadata `icons` array with `media` attribute

```typescript
// src/app/layout.tsx
export const metadata = {
  icons: [
    { rel: 'icon', url: '/light-favicon.png', media: '(prefers-color-scheme: light)' },
    { rel: 'icon', url: '/dark-favicon.png', media: '(prefers-color-scheme: dark)' },
    { rel: 'icon', url: '/icon.png' },  // Fallback
  ],
}
```

**Effect:** Browser automatically selects the correct favicon based on OS/browser theme preference. No JavaScript required — pure HTML/CSS media query approach.

---

## 13. Storage & Assets

### 13.1 File Uploads

**Tech:** Supabase Storage bucket `course-assets` with upload-only policy

```typescript
// src/lib/educator-api.ts
export async function uploadCourseAsset(lessonId: string, file: File) {
  const userId = await ensureUserId()
  const path = `${userId}/${lessonId}/${file.name}`

  const { data, error } = await supabase.storage
    .from('course-assets')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  // Record in lesson_assets table
  await supabase.from('lesson_assets').insert({
    lesson_id: lessonId,
    kind: file.type,
    title: file.name,
    url: data.path,
  })

  return data
}
```

**Storage policy:** Upload-only — files can be uploaded but not read or deleted by users. This prevents unauthorized access to course materials.

### 13.2 Image with Fallback

```typescript
// src/components/figma/ImageWithFallback.tsx
export function ImageWithFallback({ src, fallback = '/placeholder.jpg', ...props }) {
  const [imgSrc, setImgSrc] = useState(src)
  return (
    <Image
      src={imgSrc}
      onError={() => setImgSrc(fallback)}
      {...props}
    />
  )
}
```

**Effect:** If an image fails to load (broken URL, deleted file), a placeholder image is shown instead of the broken image icon.

---

## 14. UI Components (shadcn/ui)

### 14.1 Component Stack

**Underlying tech:** Radix UI primitives + Tailwind CSS + `class-variance-authority` + `clsx` + `tailwind-merge`

```typescript
// Example: Button component pattern
// src/components/ui/button.tsx
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border-2 border-gray-300 bg-white hover:bg-gray-50',
        ghost: 'hover:bg-gray-100',
        link: 'text-blue-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)
```

**45+ components available:** Accordion, Alert, AlertDialog, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Carousel, Chart, Checkbox, Command, Dialog, Drawer, DropdownMenu, Form, Input, Label, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner (Toast), Switch, Table, Tabs, Textarea, Toggle, Tooltip, etc.

**Effect:** Consistent, accessible, responsive UI across the entire application. All components support keyboard navigation, screen readers, and follow Radix UI's WAI-ARIA compliance.

### 14.2 Toast Notifications

**Tech:** `sonner` library

```typescript
import { toast } from 'sonner'

// Usage:
toast.success('Course created!', { description: 'Your course has been published.' })
toast.error('Failed to save', { description: error.message })
toast('New enrollment', { description: 'A learner joined your course.' })
```

**Effect:** Non-intrusive toast messages appear at the top-right. Auto-dismiss after a few seconds. Used for success/error feedback after mutations.

---

## 15. Favorites

### 15.1 Data Model

```sql
CREATE TABLE public.course_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id)
);
```

### 15.2 API

```typescript
// src/lib/learner-api.ts
export async function toggleFavorite(courseId: string): Promise<boolean> {
  const userId = await ensureUserId()
  const existing = await supabase
    .from('course_favorites').select('id')
    .eq('user_id', userId).eq('course_id', courseId).maybeSingle()

  if (existing) {
    await supabase.from('course_favorites').delete().eq('id', existing.id)
    return false  // unfavorited
  } else {
    await supabase.from('course_favorites').insert({ user_id: userId, course_id: courseId })
    return true   // favorited
  }
}
```

**Effect:** Learners can bookmark courses they're interested in. The heart icon toggles filled/unfilled. Favorites page shows all bookmarked courses. UNIQUE constraint prevents duplicates.

---

## 16. Provider Architecture

### 16.1 AuthProvider

**Tech:** React Context + Supabase auth listeners

```typescript
// src/providers/AuthProvider.tsx
interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  // Preview mode (landing page demo):
  preview: boolean
  enterPreview: (role: string) => void
  exitPreview: () => void
}

// Initialization:
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null)
    setIsLoading(false)
  })
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    setUser(session?.user ?? null)
  })
  return () => subscription.unsubscribe()
}, [])
```

**Preview mode:**
```typescript
const enterPreview = (role: string) => {
  // Create a fake user object with the selected role
  setUser({ user_metadata: { role } } as User)  // Cast — simplified for demo
  setPreview(true)
}
```

**Effect:** `useAuth()` provides session state app-wide. Preview mode allows landing page visitors to see role-specific dashboards without logging in. The `useRole()` hook returns the effective role (respecting preview).

### 16.2 AccessibilityProvider

See section 2.1 above.

### 16.3 LanguageProvider

See section 3.1 above.

### 16.4 Nesting Order

```typescript
// src/app/providers.tsx
<AuthProvider>
  <AccessibilityProvider>
    <LanguageProvider>
      <SessionTimeout>
        {children}
      </SessionTimeout>
    </LanguageProvider>
  </AccessibilityProvider>
</AuthProvider>
```

**Why this order:** Auth must be outermost because Accessibility and Language settings depend on the user's identity (to fetch/save settings). SessionTimeout wraps children directly as it only needs to track user activity.

---

## 17. Database Patterns

### 17.1 Soft Delete

```typescript
// All tables use deleted_at for soft delete
// Queries always filter: .is('deleted_at', null)
await supabase.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', userId)
```

**Effect:** Records are never permanently deleted. They can be restored by setting `deleted_at = null`. All queries exclude soft-deleted records by default.

### 17.2 Automatic Timestamps

```sql
-- created_at: DEFAULT now() NOT NULL
-- updated_at: Managed by trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$ BEGIN
  NEW.updated_at = now(); RETURN NEW;
END; $$ LANGUAGE plpgsql;
```

### 17.3 Enrollments UNIQUE Constraint

```sql
UNIQUE(user_id, course_id)
```

**Effect:** A learner can only enroll in a course once. Second enrollment attempt is rejected by the database.

### 17.4 Attempt Number Auto-Increment

Handled in application code (not DB sequence):
```typescript
const { data: existing } = await supabase
  .from('quiz_attempts').select('attempt_number')
  .eq('enrollment_id', enrollment.id).eq('quiz_id', quiz.id)
  .order('attempt_number', { ascending: false }).limit(1)
const attemptNumber = (existing?.[0]?.attempt_number || 0) + 1
```

---

## 18. Key Dependencies Reference

| Package | Used For | Key Functions/APIs |
|---------|----------|-------------------|
| `@supabase/supabase-js` | Database + Auth | `createClient()`, `signInWithPassword()`, `signUp()`, `signOut()`, `getUser()`, `from().select().eq().in().single()` |
| `@supabase/ssr` | Server-side auth | `createServerClient()` with cookie handlers |
| `nodemailer` | Email | `createTransport()`, `sendMail()`, `verify()` |
| `next-themes` | Theme detection | `useTheme()`, `ThemeProvider`, `resolvedTheme` |
| `sonner` | Toasts | `toast.success()`, `toast.error()`, `toast()` |
| `framer-motion` | Animations | `motion.div`, `AnimatePresence`, variants |
| `recharts` | Charts | `BarChart`, `LineChart`, `PieChart`, `ResponsiveContainer` |
| `react-hook-form` | Forms | `useForm()`, `register()`, `handleSubmit()` |
| `lucide-react` | Icons | Individual icon components |
| `class-variance-authority` | UI variants | `cva()` for component variant definitions |
| `clsx` + `tailwind-merge` | Class merging | `cn()` utility function |
| `embla-carousel-react` | Carousel | `useEmblaCarousel()` |
| `crypto` (Node built-in) | Token generation | `randomBytes().toString('hex')` |
