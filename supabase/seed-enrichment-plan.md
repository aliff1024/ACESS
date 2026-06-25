# Seed Enrichment Plan — ACESS

## Gap Analysis

### Critical: Pages Showing Fake / Hardcoded Data

| File | Line | Issue | Impact |
|------|------|-------|--------|
| `VisualSchedule.tsx` | 18-22 | 3 hardcoded mock schedule items shown when no `schedule` prop passed | Every learner sees fake data |
| `LearnerDashboard.tsx` | 200 | Hardcoded fallback lesson ID `'l6'` | Lesson loads wrong content silently |
| `LearnerDashboard.tsx` | 323-324 | Hardcoded `"Course"` and `"Learner"` strings on certificate modal | Bad UX on certificate generation |
| `CourseDetailPage.tsx` | 527 | Hardcoded fallback duration `'15 mins'` | Fake-looking data on every lesson |
| `EducatorDashboardOverview.tsx` | 206 | Hardcoded string `'several days ago'` instead of real calculation | Fake last-active display |
| `CourseListPage.tsx` | 516 | `(lessonCount * 20)` synthetic duration | All courses show fake 20-min-per-lesson |
| `CourseListPage.tsx` | 25-26 | Hardcoded category filter list `['All','Programming','Business',...]` | Filters don't match DB categories |

### Tables Actively Queried by UI (need enrichment, in order of priority)

| # | Table | Used By | Current Seed Data | Gap |
|---|-------|---------|-------------------|-----|
| 1 | `enrollments` | All dashboards, progress, certificates | ~30 rows, sparse timestamps | Need more learners enrolled, realistic date spread |
| 2 | `lesson_progress` | Progress tracking, analytics, reports | ~200 rows, no `progress_meta`, no `time_spent_learning` | **No `progress_meta` JSONB**, no time_spent, no `is_completed` |
| 3 | `quiz_attempts` + `quiz_answers` | Educator analytics, admin reports, learner history | ~30 attempts, no individual answers | **No `quiz_answers` rows**, no attempt variety |
| 4 | `lesson_interactive_content` | LessonViewPage, admin analytics count | ~30 rows, basic activity content | Activities have simplistic data, need realistic educational content |
| 5 | `video_questions` | LessonViewPage video overlay | 0 rows | **No video questions exist** |
| 6 | `course_accessibility_categories` | Course detail badges, filter | 0 rows | **No accessibility tagging on any course** |
| 7 | `adaptive_interactions` | Admin analytics, educator insight | ~30 rows | Too few to show patterns in analytics |
| 8 | `recommendations` | Learner recommendation widget | ~8 rows | Sparse, doesn't feel personalized |
| 9 | `notifications` | Notification bell, educator feed | ~30 rows | Missing real-world variety |
| 10 | `lesson_comments` | Discussion section on lessons | 6 rows | Too few for a "real" classroom feel |
| 11 | `course_favorites` | Favorites page | ~15 rows | Fine, but could be more varied |
| 12 | `certificates` | Learner/educator certificate pages | 14 rows | Needs more realistic date spread |
| 13 | `course_achievements` + `user_achievements` | Badge display, progress | 7 achievements, ~8 earned | Sparse |
| 14 | `learner_checkpoints` | LessonViewPage checkpoint system | 0 rows | **No checkpoint completions** |
| 15 | `user_profiles` | Profile page, accessibility | ~21 rows | Missing `age_group` on some, sparse `accessibility_prefs` |

### Tables with Lower Priority (educator/admin CRUD, rarely queried)

| Table | Used By | Why Low Priority |
|-------|---------|-----------------|
| `h5p_contents`, `h5p_responses` | H5P viewer | Confirmed: H5P is not used in the system |
| `lesson_versions` | Educator version history | Only viewed in lesson editor |
| `media_assets` | Educator media library | Only shown to educators during editing |
| `lesson_templates` | Admin template library | Rarely accessed |
| `course_milestones`, `learner_milestones` | System course progress | `fetchSystemCourseProgress` queries this — moderate priority |
| `accessibility_templates` | Educator template picker | Rarely used feature |

---

## Enrichment Plan — By Priority

### PHASE 1: Fix Fake Data (3 files, 6 edits)

These are NOT data seeding tasks — they are code fixes to remove hardcoded fallbacks.

| # | File | Change |
|---|------|--------|
| 1 | `VisualSchedule.tsx` | Remove hardcoded mock data fallback. Show "No tasks scheduled" empty state when `schedule` is undefined/empty |
| 2 | `LearnerDashboard.tsx:200` | Replace `'l6'` with null guard; show course selection prompt when no lesson is selected |
| 3 | `LearnerDashboard.tsx:323-324` | Fetch actual `courseTitle` from selected enrollment and `learnerName` from profile |
| 4 | `CourseDetailPage.tsx:527` | Replace `'15 mins'` fallback with `"No estimated duration"` |
| 5 | `EducatorDashboardOverview.tsx:206` | Replace `'several days ago'` with `formatDistanceToNow(student.lastActive)` |
| 6 | `CourseListPage.tsx:25-26` | Fetch categories from DB instead of hardcoded list |

### PHASE 2: Fix Hardcoded Zeros in Dashboards (5 files, 5 edits)

| # | File | Change |
|---|------|--------|
| 7 | `AdminDashboard.tsx:222` | Show `"--"` instead of `0` for latency when no data |
| 8 | `AnalyticsDashboard.tsx:116,126,136` | Show `"--"` instead of `0` for metric tiles with no data |
| 9 | `EducatorAnalyticsPage.tsx:40-44` | Show `"--"` instead of `"0"` when no courses |
| 10 | `ProgressOverview.tsx:29-58` | Show `"--"` instead of `"0"` when no stats |
| 11 | `EducatorCertificateDashboard.tsx:34-41` | Show `"--"` instead of `"0"` |

### PHASE 3: Core Learning Data (7 tables, ~500 rows)

This makes the system feel realistically used.

#### 3a. `enrollments` — Add 20 more realistic enrollments

- 5 existing learners enroll in 2-3 more courses each
- Realistic date spread: Jan–Jun 2026
- Mix of statuses: 70% active, 20% completed, 10% dropped
- Learners: Leo (enrolled in Coding + Web Dev), Mia (enrolled in Web Accessibility + Physics), Emma (Coding + Digital Literacy), Alex (Shapes & Colors + Animal Adventures), Sam (Reading + Healthy Habits)

**New rows: ~20**

#### 3b. `lesson_progress` — Add `progress_meta` + `time_spent_learning` + `is_completed`

For every existing + new enrollment:
- For completed lessons: `progress_meta = {video: true, scroll: true, activity: true, quiz: true, guided_step_index: N}`, `time_spent_learning = 300-1800s`, `is_completed = true`, `is_viewed = true`, `last_viewed_at = enrollment-appropriate date`
- For in-progress lessons: `progress_meta = {video: true, scroll: true, activity: false, quiz: false}`, `time_spent_learning = 60-600s`, `is_completed = false`, `is_viewed = true`
- For untouched lessons: `progress_meta = {}`, `time_spent_learning = 0`, `is_completed = false`, `is_viewed = false`

**Updated rows: ~400**

#### 3c. `quiz_attempts` + `quiz_answers` — Add detailed quiz history

For every completed quiz in lesson_progress:
- 1-3 attempts per quiz (log-normal distribution: most pass on 1st or 2nd attempt)
- Scores: bell curve centered at 78%, range 30-100%
- `quiz_answers`: 1 row per question per attempt, with realistic answer selection (high-performers choose correct more often, at-risk learners choose randomly)
- Learner-specific patterns: Mia (avg 92%), Leo (avg 75%), Noah (avg 45%), Alex (avg 70%), Sam (avg 65%)

**New attempt rows: ~60, New answer rows: ~300**

#### 3d. `lesson_interactive_content` — Rich activity data

Replace/create ~40 realistic activities across 10 key lessons:
- Content types spread evenly: 8 flashcards, 8 drag_drop, 8 fill_blanks, 8 memory_game, 8 timeline
- Each activity has realistic educational content based on the lesson topic
- Use the existing `activity-templates.ts` template patterns but with real lesson-specific content

| Lesson | Activity Type | Topic Example |
|--------|--------------|--------------|
| Learning Numbers 1-20 Lesson 1 | flashcards | "Number 5" front, "Five apples" back |
| Learning Numbers 1-20 Lesson 3 | fill_blanks | "Count to _ by filling the missing number: 1, 2, _, 4, 5" |
| Learning Shapes & Colors Lesson 1 | drag_drop | Sort shapes into "Has 4 sides" / "Has 3 sides" / "Round" |
| Animal Adventures Lesson 1 | memory_game | Match animal names to animal pictures |
| Animal Adventures Lesson 3 | timeline | Order the life cycle of a butterfly |
| Healthy Habits Lesson 2 | drag_drop | Sort activities into "Healthy" / "Unhealthy" |
| Introduction to Reading Lesson 1 | flashcards | Letter A with "apple" image, Letter B with "ball" |
| Introduction to Coding Lesson 1 | drag_drop | Match coding terms to definitions |
| Digital Literacy Lesson 3 | timeline | Order steps to verify a news source |
| Web Development Lesson 1 | fill_blanks | "HTML stands for _ _ _ _" |

**New rows: ~40**

#### 3e. `video_questions` — Add timestamped questions

For 10 lessons that have `has_video = true`:
- 3-5 questions per video lesson
- Timestamps spread evenly across video duration
- 4 options each, one correct
- Questions test comprehension of the video content at that moment

Example (Learning Numbers 1-20 Video Lesson 5 "Even and Odd Numbers"):
| Timestamp | Question | Options |
|-----------|----------|---------|
| 0:15 | "What is an even number?" | "A number that can be divided by 2" (correct), "A number that ends in 0", "A number with 3 digits", "A number that is very large" |
| 1:30 | "Which of these is an odd number?" | "7" (correct), "4", "10", "2" |
| 2:45 | "What do you get when you add two odd numbers together?" | "An even number" (correct), "An odd number", "Zero", "A decimal" |

**New rows: ~40**

### PHASE 4: Support System Data (6 tables, ~200 rows)

#### 4a. `course_accessibility_categories` — Tag all 15 courses

| Course | Tags |
|--------|------|
| Learning Numbers 1-20 | cognitive, adhd, dyslexia |
| Learning Shapes & Colors | cognitive, adhd, asd, visual |
| Animal Adventures | cognitive, adhd, asd |
| My First Science Experiments | cognitive, adhd |
| Healthy Habits for Kids | cognitive, asd |
| Introduction to Reading | dyslexia, cognitive |
| Fun With Nature | cognitive, adhd, asd |
| Introduction to Coding | adhd, asd, visual |
| Digital Literacy & Internet Safety | adhd, dyslexia, visual |
| Problem Solving Skills | cognitive, adhd |
| Web Development Fundamentals | visual, motor |
| Mastering Web Accessibility | visual, hearing, motor, cognitive |
| Introduction to Physics for Kids | cognitive |
| Platform Orientation Guide | cognitive, visual |
| ACESS Community Guidelines | cognitive |

**New rows: ~35**

#### 4b. `adaptive_interactions` — Realistic usage patterns

For the 3 accessibility learners (Alex ADHD, Sam Dyslexia, Jordan Visual):
- Alex (ADHD): 60 interactions — heavy on `focus_mode` (40%), `chunked_content` (25%), `guided_mode` (15%)
- Sam (Dyslexia): 50 interactions — heavy on `tts` (35%), `simplified_summary` (25%), `reading_spotlight` (20%)
- Jordan (Visual): 40 interactions — heavy on `tts` (40%), `captions` (30%), `slideshow` (20%)
- Each interaction has a realistic `duration_seconds` (30-600s)
- Spread across their enrolled lessons over the past 90 days

**New rows: ~150**

#### 4c. `recommendations` — Personalized learning paths

For 8 active learners:
- 2-4 recommendations each
- Cross-course: "Since you enjoyed Animal Adventures, try Fun With Nature"
- Revision: "Review Numbers 6-10 — you scored 60% on the quiz"
- Remedial: "Try the flashcards activity for Lesson 4 again"

**New rows: ~25**

#### 4d. `notifications` — Realistic notification feed

For 10 learners + 3 educators:
- Enrollment confirmations (20)
- Quiz results with scores (30)
- Badge earned (15)
- Course published (5 for educators)
- New student enrolled (5 for educators)
- Certificate issued (10)
- Each with realistic timestamps spread over 90 days

**New rows: ~85**

#### 4e. `lesson_comments` — Threaded discussion

For 6 popular lessons:
- 3-5 top-level comments per lesson
- 1-2 replies per comment (educator replies)
- Realistic student questions and educator answers

Example (Number 1-20 Lesson 1):
- Leo: "Why does 5 come after 4?"
- Dr. Chen: "Great question, Leo! Think of it like climbing stairs — you take one step at a time. After step 4 comes step 5!"
- Mia: "I like counting by 2s better. 2, 4, 6, 8!"

**New rows: ~25**

#### 4f. `course_favorites` — More favorites

Add favorites for the remaining learners who have none or few:
- Noah: {0, 5} (Learning Numbers, Introduction to Reading)
- Alex: {1, 6} (Shapes & Colors, Fun With Nature)
- Jordan: {10, 11} (Web Development, Web Accessibility)
- Oliver: {2, 3} (Animal Adventures, Science Experiments)

**New rows: ~8**

### PHASE 5: Achievement & Progress Data (3 tables, ~30 rows)

#### 5a. `course_achievements` — Add 8 more achievements

| Course | Name | Type | Threshold |
|--------|------|------|-----------|
| Learning Shapes & Colors | Shape Master | progress | 100% |
| My First Science Experiments | Little Scientist | lesson | 8 |
| Healthy Habits for Kids | Health Champion | progress | 100% |
| Fun With Nature | Nature Explorer | progress | 100% |
| Digital Literacy & Internet Safety | Digital Citizen | quiz | 90% |
| Problem Solving Skills | Problem Solver | progress | 100% |
| Web Development Fundamentals | HTML Hero | lesson | 10 |
| Mastering Web Accessibility | A11y Advocate | engagement | 15 (adaptive interactions) |

**New rows: 8**

#### 5b. `user_achievements` — Award earned badges

Award achievements to learners who meet thresholds based on their progress data:
- Leo: Number Whiz, Counting Star, Shape Master, Bookworm
- Mia: Number Whiz, Counting Star, Shape Master, Little Scientist, Health Champion, Nature Explorer, Code Master, Problem Solver
- Emma: Number Whiz, Shape Master, Little Scientist
- Sophia: Number Whiz, Counting Star, Animal Expert, Bookworm, Little Scientist

**New rows: ~20**

#### 5c. `learner_checkpoints` — Checkpoint completions

For 5 lessons that have checkpoints, create completion records for active learners:
- Leo: 80% completion rate
- Mia: 100% completion rate
- Emma: 70% completion rate
- Alex: 60% completion rate
- Sam: 50% completion rate
- Noah: 20% completion rate

**New rows: ~40**

### PHASE 6: Profile & Settings Data

#### 6a. `user_profiles` — Fill in missing fields

Update all 21 user profiles with:
- `age_group`: Match existing (6-12, 13-17, 18+)
- `accessibility_prefs`: Realistic settings for each learner type
- `country`: Malaysia for all (consistent with the existing data)
- `preferred_language`: Mix of 'en' and 'ms' (8 en, 5 ms)

Accessibility prefs per learner type:
| Learner | Key Settings |
|---------|-------------|
| Leo (active) | standard settings, medium font |
| Mia (high performer) | standard settings, compact mode |
| Noah (at-risk) | simplified_ui=true, chunked_content_mode=true, font_size_px=20 |
| Alex (ADHD) | distraction_free_mode=true, focus_mode_auto=true, animation_level='reduced' |
| Sam (dyslexia) | dyslexia_friendly_font=true, font_size_px=22, line_spacing_multiplier=1.8, word_spacing_pct=20 |
| Jordan (visual) | font_size_px=28, tts_enabled=true, high_contrast=true |

**Updated rows: ~12**

---

## Implementation Strategy

### Run Order

1. **Phase 0**: Run the existing `seed-comprehensive.ts` to create base data
2. **Phases 1-2**: Apply code fixes to remove hardcoded fallbacks (these are code changes, not data)
3. **Phases 3-6**: Run `seed-enriched.ts` — a non-destructive script that adds data on top of the base seed

### Script Structure (`supabase/seed-enriched.ts`)

```
seed-enriched.ts:
├── Section 1: Helper functions (resolve IDs, random date, shuffle)
├── Section 2: Enrollments (extend existing)
├── Section 3: Lesson Progress + progress_meta + time_spent + is_completed
├── Section 4: Quiz Attempts + Quiz Answers
├── Section 5: Interactive Activities (40 realistic activities)
├── Section 6: Video Questions (40 timestamped questions)
├── Section 7: Course Accessibility Categories (35 tags)
├── Section 8: Adaptive Interactions (150 usage records)
├── Section 9: Recommendations (25 personalized suggestions)
├── Section 10: Notifications (85 notification records)
├── Section 11: Lesson Comments (25 threaded discussions)
├── Section 12: Course Favorites (8 more)
├── Section 13: Achievements + User Achievements (28 records)
├── Section 14: Learner Checkpoints (40 completion records)
└── Section 15: User Profile updates (12 profiles)
```

### Total New Rows: ~1,100 across 16 tables

### Design Principles

1. **Non-destructive**: Uses `INSERT` and `UPDATE` only — never `DELETE`
2. **Idempotent**: Each section checks for existing data before inserting
3. **ID resolution**: All lookups by email/title — no hardcoded UUIDs
4. **Realistic distributions**: Bell curves for scores, log-normal for time spent
5. **Timestamps**: Spread across Jan–Jun 2026 with realistic week patterns (more active weekdays)
6. **Learner personas**: Consistent behavior per persona (Mia always scores high, Noah struggles)
7. **Service role**: Uses Supabase service-role client to bypass RLS
8. **No H5P**: Uses only native `lesson_interactive_content` table with the 5 existing activity types
