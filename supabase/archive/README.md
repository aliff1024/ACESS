# Archived SQL

Nothing in this folder runs. It is kept for provenance only — `supabase db reset`
reads `supabase/migrations/` and never looks here.

## `migrations-legacy/` — the previous 44 migrations

These were the project's migration history up to 2026-08-25. They were retired
because **they could not rebuild the database**: not one of them contains a
`CREATE TABLE` for `users`, `courses`, `lessons`, `enrollments`,
`lesson_progress`, `quizzes`, `certificates` or `user_profiles`. Every file
assumes those tables already exist and only `ALTER`s them. The core schema had
been created out-of-band and lived only inside a `pg_dump` checked in at
`scripts/schema.sql`, so a fresh `supabase db reset` produced a broken database.

They had also drifted from the live project. `20260627000001_phase2_cleanup.sql`
drops `certificate_verifications`, but that table was still present in the live
database — so the migration history and the real schema disagreed.

The replacement baseline (`../migrations/20260826000000_baseline_schema.sql`) was
built by replaying the dump plus the eleven migrations that post-dated it
(`20260822000000` … `20260825001500`), then verified column-for-column against
the live project before any cleanup was applied.

## `superseded-sql/` — scratch and one-off SQL

Hand-run fix-ups, partial dumps and older seed data that predate the baseline:

| File | What it was |
| --- | --- |
| `schema2.sql` | `pg_dump` of the live database (schema only, UTF-16). The source the baseline was reconstructed from. |
| `schema.sql` | An older, smaller `pg_dump` of the same database. |
| `scheme_script_corrected.sql` | Early hand-written schema draft. |
| `missing_migrations.sql` | Ad-hoc catch-up script. |
| `seed-courses.sql` | Previous course seed data. |
| `system_content_migration.sql`, `01_achievements_and_assets.sql`, `create-notifications.sql`, `create-favorites.sql` | One-off data/DDL inserts folded into the baseline. |
| `fix-admin-rls.sql`, `fix-media-assets-rls.sql`, `rls-policies-lesson-assets.sql`, `upload-only-storage-policies.sql` | Hand-applied RLS patches now in the baseline. |
| `fix_storage.sql`, `fix_course_assets.sql` | Storage patches; superseded by `20260826000100_storage_buckets.sql`. The `course-files` bucket they created is not referenced anywhere in the codebase and was not recreated. |
| `add-language-column.sql`, `add-preferred-font.sql`, `pre-seed-fixes.sql` | Column patches already present in the baseline. |
| `create_achievements.sql` | Superseded by the seed script. |
| `db_backup.sql` | Empty file. |
