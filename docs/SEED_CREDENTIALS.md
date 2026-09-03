# Seed Credentials

**Corrected 2026-09-03** (see `docs/testing-report.md`, "Stale seed docs" finding): this file previously documented 30 `learnerN@test.com` accounts and an `admin@acess.edu` account that do not exist in the seeded database — apparently left over from an earlier seed generation that was later replaced by the named-persona seed in `supabase/seed/personas.ts`, without this file being updated to match. There is no sign the 30 generic accounts were ever intentionally dropped as a deliberate reduction (no removal note, no migration referencing them) — they simply don't correspond to anything `supabase/seed/personas.ts` creates, so this file is corrected to describe only the 12 real personas, confirmed directly against the running database (`select email, role, full_name from users`).

## Login URLs
- App: `http://localhost:3000/login`
- Supabase Studio (local): `http://127.0.0.1:54323`

---

## All accounts share one password

Every seeded account uses `DEMO_PASSWORD` from `supabase/seed/personas.ts`:

```
AcessDemo#2026
```

## Admins (3)
| Email | Name | Scenario |
|---|---|---|
| `aliff.admin@acess.edu.my` | Aliff Affandi | Primary admin. Created the platform, approves courses and educators. |
| `nurul.admin@acess.edu.my` | Nurul Izzah Rahman | Second admin, joined later. Focused on accessibility reporting. |
| `rajesh.admin@acess.edu.my` | Rajesh Kumar Menon | Newest admin. Demonstrates a staggered admin join date. |

## Educators (3)
| Email | Name | Scenario |
|---|---|---|
| `siti.educator@acess.edu.my` | Dr. Siti Aminah Yusof | Senior educator. Owns five published courses and issues custom certificates. |
| `marcus.educator@acess.edu.my` | Marcus Tan Wei Jie | Mid-tenure educator. Owns a popular course, an empty course and an archived one. |
| `farah.educator@acess.edu.my` | Farah Nadhirah Idris | Newest educator, promoted from an approved instructor application. Draft + pending-review course, no learners yet. |

## Learners (6)
| Email | Name | Accessibility profile | Scenario |
|---|---|---|---|
| `amir.learner@acess.edu.my` | Amir Hakim bin Rosli | ADHD preset | Advanced. 5 enrolments, 2 courses completed, active today. |
| `mei.learner@acess.edu.my` | Chong Mei Ling | Dyslexia preset | Mid-progress. 4 enrolments 20–80% through, no course finished yet. |
| `haziq.learner@acess.edu.my` | Haziq Danial bin Zainal | None | Beginner / lapsed. Joined a month ago, 2 enrolments barely started. |
| `aisyah.learner@acess.edu.my` | Aisyah Nabila binti Kamal | None | High performer. Three completed courses, top quiz scores. |
| `priya.learner@acess.edu.my` | Priya Devi a/p Ramesh | Autism preset | Steady. One completed course, two in progress. |
| `daniel.learner@acess.edu.my` | Daniel Lim Jun Hao | None | At-risk. Failed quiz attempts, a dropped enrolment, a four-week activity gap. |

Full detail on each persona's seeded accessibility settings (font, theme, layout, TTS, etc.) is in `supabase/seed/personas.ts` — this table only summarizes the role each one plays in exercising the platform's features.

## Seed data summary (read live from the database, 2026-09-03)
- **Users:** 12 (3 admin, 3 educator, 6 learner)
- **Courses:** 10
- **Enrollments:** 21
- **Completed lessons:** 50
- **Quiz attempts:** 19
- **Certificates issued:** 7

These counts change as courses/enrollments/lessons are exercised through the app (they are not reset by simply loading the app) — re-run the query above against a live database rather than trusting this snapshot if it matters for a specific task; `npm run db:rebuild` (`supabase db reset && npm run seed`) restores the original seeded values.

## How to Log In
1. Start the dev server: `npm run dev`
2. Open http://localhost:3000/login
3. Enter the email and password from above
4. Each role sees a different dashboard:
   - Admins → `/admin`
   - Educators → `/educator`
   - Learners → `/learner`
