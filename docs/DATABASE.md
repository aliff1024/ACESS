# Database Schema

All tables are in the `public` schema of a Supabase PostgreSQL database.

## Core Tables

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Matches `auth.users.id` |
| email | varchar UNIQUE | |
| full_name | text | |
| role | varchar | `learner` / `educator` / `admin` |
| is_active | boolean | |
| email_verified_at | timestamptz | |
| last_login_at | timestamptz | |
| created_at | timestamptz | |
| deleted_at | timestamptz | Soft delete |

### `courses`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| created_by | uuid FK→users | |
| title | varchar | |
| slug | varchar UNIQUE | |
| description | text | |
| difficulty_level | varchar | `beginner` / `intermediate` / `advanced` |
| category | text | |
| thumbnail_url | varchar | |
| status | varchar | `draft` / `pending_review` / `published` / `archived` |
| course_type | text | `educator` / `system` |
| system_course | boolean | |
| built_in_course | boolean | |
| managed_by_admin | boolean | |
| guided_learning_enabled | boolean | |
| recommended_age_group | text | |
| published_at | timestamptz | |

### `course_tags`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| course_id | uuid FK→courses CASCADE | |
| tag | varchar | UNIQUE per (course_id, tag) |

### `course_chapters`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| course_id | uuid FK→courses CASCADE | |
| title | text | |
| sequence_order | integer | UNIQUE per course |

### `course_milestones`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| course_id | uuid FK→courses CASCADE | |
| title | text | |
| required_completion_pct | integer | 0–100 |
| sequence_order | integer | |

### `enrollments`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→users CASCADE | |
| course_id | uuid FK→courses CASCADE | |
| status | varchar | `active` / `completed` / `dropped` |
| enrolled_at | timestamptz | |
| completed_at | timestamptz | |
| UNIQUE(user_id, course_id) | | |

### `course_favorites`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→users CASCADE | |
| course_id | uuid FK→courses CASCADE | |
| UNIQUE(user_id, course_id) | | |

## Content Tables

### `lessons`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| course_id | uuid FK→courses CASCADE | |
| chapter_id | uuid FK→course_chapters | |
| title | varchar | |
| content_html | text | Main lesson content |
| video_url | varchar | |
| transcript | text | |
| sequence_order | integer | UNIQUE per course |
| status | varchar | `draft` / `published` |
| prerequisite_lesson_id | uuid FK→lessons | |
| estimated_duration | integer | Minutes |
| lesson_type | text | `standard` / `video` / `quiz` / `practice` / `reading` / `assessment` |
| simplified_summary | text | |
| accessibility_notes | text | |
| learning_objectives | text | |
| checkpoint_completed | boolean | |

### `lesson_progress`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| enrollment_id | uuid FK→enrollments CASCADE | |
| lesson_id | uuid FK→lessons CASCADE | |
| is_viewed | boolean | |
| view_count | integer | |
| first_viewed_at | timestamptz | |
| last_viewed_at | timestamptz | |
| time_spent_learning | integer | Seconds |
| assisted_learning_mode | boolean | |
| UNIQUE(enrollment_id, lesson_id) | | |

### `lesson_assets`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| lesson_id | uuid FK→lessons CASCADE | |
| kind | text | File type |
| title | text | |
| url | text | |

### `lesson_templates`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| created_by | uuid FK→users CASCADE | |
| title | text | |
| description | text | |
| lesson_type | text | |
| content_html | text | |
| estimated_duration | integer | |
| is_public | boolean | |

### `lesson_checkpoints` / `learner_checkpoints`
Checkpoints within lessons (reflection, practice, quiz, activity, milestone). Learner progress tracked per enrollment.

## Quiz Tables

### `quizzes`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| lesson_id | uuid FK→lessons CASCADE UNIQUE | 1:1 with lesson |
| title | varchar | |
| time_limit_seconds | integer | 0 = unlimited |
| max_attempts | integer | 0 = unlimited |
| pass_threshold_pct | integer | Default 80 |

### `quiz_questions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| quiz_id | uuid FK→quizzes CASCADE | |
| question_text | text | |
| question_type | varchar | `multiple_choice` / `scenario` |
| sequence_order | integer | UNIQUE per quiz |

### `quiz_options`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| question_id | uuid FK→quiz_questions CASCADE | |
| option_text | text | |
| is_correct | boolean | |
| sequence_order | integer | |

### `quiz_attempts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| enrollment_id | uuid FK→enrollments CASCADE | |
| quiz_id | uuid FK→quizzes CASCADE | |
| attempt_number | integer | Auto-increments |
| score_pct | integer | 0–100 |
| result | varchar | `pass` / `fail` / `in_progress` |

### `quiz_answers`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| attempt_id | uuid FK→quiz_attempts CASCADE | |
| question_id | uuid FK→quiz_questions CASCADE | |
| selected_option_id | uuid FK→quiz_options | |
| is_correct | boolean | Computed |
| UNIQUE(attempt_id, question_id) | | |

## Feature Tables

### `recommendations`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| enrollment_id | uuid FK→enrollments CASCADE | |
| recommended_lesson_id | uuid FK→lessons CASCADE | |
| difficulty_tier | varchar | `revision` / `standard` / `advanced` |
| trigger_reason | text | Why recommended |
| is_acknowledged | boolean | |
| created_at | timestamptz | |

### `certificates`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| enrollment_id | uuid FK→enrollments UNIQUE | One cert per completion |
| reference_code | varchar UNIQUE | |
| pdf_url | varchar | |
| status | varchar | `issued` / `revoked` |

### `notifications`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→users CASCADE | |
| type | text | `enrollment`, `lesson_completed`, `quiz_completed`, `lesson_added`, `course_published` |
| title | text | |
| body | text | |
| metadata | jsonb | |
| is_read | boolean | |

## Accessibility Tables

### `user_accessibility_settings`
| Column | Notes |
|--------|-------|
| user_id | uuid FK→users UNIQUE |
| disability_type | dyslexia, adhd, mild_cognitive_impairment, other |
| preferred_font_size | small, medium, large, xlarge |
| preferred_theme | light, dark, high_contrast, soft |
| line_spacing | normal, relaxed, loose |
| tts_enabled | boolean |
| captions_enabled | boolean |
| screen_reader_optimized | boolean |
| keyboard_navigation_enabled | boolean |
| reduced_motion | boolean |
| simplified_ui | boolean |
| dyslexia_friendly_font | boolean |
| preferred_font | default, serif, sans_serif, dyslexia |
| preferred_language | en, ms |

### `user_profiles`
Extended user info: username, avatar_url, phone_number, birth_date, bio, country, preferred_language.

### `user_notification_settings`
Email/push preferences per user.

## Helper Tables

### `password_reset_tokens`
Temporary tokens for password reset flow. Columns: id, user_id, email, token (UNIQUE), expires_at, used, created_at.

### `child_accounts`
Links guardian (educator/parent) to child learner for progress monitoring.

## RLS Policies

- Authenticated users can read their own data
- Educators can CRUD their own courses/lessons/quizzes
- Admins can read/update all users and manage system courses
- Service role bypasses all RLS (used for password resets + recommendations)

## Database Triggers (Notifications)

| Trigger | Event | Fires When |
|---------|-------|------------|
| `notify_on_enrollment` | INSERT on enrollments | Learner enrolls → notify course creator |
| `notify_on_lesson_progress` | INSERT on lesson_progress | First view → notify educator |
| `notify_on_quiz_attempt` | INSERT on quiz_attempts | Quiz attempted → notify educator |
| `notify_on_lesson_added` | INSERT on lessons | New lesson → notify enrolled learners |
| `notify_on_course_published` | UPDATE on courses | Course published → notify enrolled learners |

## Storage Buckets

| Bucket | Policy |
|--------|--------|
| `course-assets` | Upload-only for educators, no public read/delete |
