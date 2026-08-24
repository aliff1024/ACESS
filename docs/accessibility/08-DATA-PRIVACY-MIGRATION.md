# Data, Persistence, Privacy & Migration Plan

**Where settings live, how they survive, who may see them, and how existing learners move to the new model without their interface changing under them.**

- **Scope:** `user_accessibility_settings`, the client cache, and the privacy rules around disability data.
- **Depends on:** [02 §8](02-SETTINGS-REFERENCE.md) (the resolver), [05](05-CUSTOMIZATION-UX.md) (what the learner sees)
- **Unblocks:** Phase 2 of [00 §4](00-PROGRAM-PLAN.md)

---

## 1. Why this is not a schema chore

Two of the rules in [01 §9](01-LEARNING-STANDARDS.md) are data problems wearing a policy hat:

- *"A preset is a starting template, never a lock"* means the system must be able to tell **learner intent** apart from **preset default**. A flat table of values cannot — once a preset writes `font_size_px = 18`, nothing records whether the learner chose 18 or merely accepted it. Every "reset to preset", "what did I change", and "should the new default apply to me" question depends on this distinction, and it is currently unrepresentable.
- *"Never expose disability data"* means the access rules must be explicit, not implied by whichever query happens to run.

---

## 2. Current state

**Storage.** `public.user_accessibility_settings`, one row per user, extended by
`supabase/migrations/20260624000000_add_accessibility_presets.sql`. Typed as
`AccessibilitySettingsData` ([learner-api.ts:1768](../../src/lib/learner-api.ts:1768)) —
~35 nullable columns.

**Cache.** `localStorage['acess_accessibility_settings']`, read synchronously on mount
([AccessibilityProvider.tsx](../../src/providers/AccessibilityProvider.tsx)) to avoid a
flash of unstyled content — the right instinct.

**Problems**

| # | Problem | Consequence |
|---|---|---|
| 1 | **Intent is not recorded** | Cannot distinguish "learner chose this" from "preset set this"; makes per-setting reset and safe default upgrades impossible |
| 2 | **Legacy and modern fields both live and both written** | `preferred_font_size` + `font_size_px`; `line_spacing` + `line_spacing_multiplier`; `preferred_font` + `font_family`; `dyslexia_friendly_font`. Three sources for two values, and lesson rendering reads the *legacy* ones ([02 §2.2](02-SETTINGS-REFERENCE.md)) |
| 3 | **Deprecated columns still written** | `low_contrast` drives both `data-soft-bg` and the deprecated `data-low-contrast` contrast filter; `screen_reader_optimized` is marked deprecated in the type and still present |
| 4 | **Cache has no version or conflict rule** | A stale `localStorage` blob from before a schema change is parsed and applied as-is, and last-write-wins across devices |
| 5 | **Units baked into storage** | `word_spacing_pct` stores a percentage of an arbitrary 0.3em scale ([02 §2.4](02-SETTINGS-REFERENCE.md)). The stored number is meaningless without the code that renders it |
| 6 | **`disability_type` sits in the same row as everything else** | Sensitive data co-located with routine preferences means every query that reads settings reads a disability |
| 7 | **No audit of change** | No way to answer "when did this learner's interface change, and who changed it" |

---

## 3. Target model

### 3.1 Separate intent from value

Add one column, and the ambiguity disappears:

```sql
ALTER TABLE public.user_accessibility_settings
  ADD COLUMN explicit_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;
```

`explicit_overrides` holds only keys the learner changed **themselves**, with when and
from where:

```json
{
  "font_size_px":    { "value": 21, "at": "2026-08-14T09:12:00Z", "via": "reading_toolbar" },
  "reading_spotlight": { "value": false, "at": "2026-08-14T09:13:10Z", "via": "settings_panel" }
}
```

Rules:

- Applying a preset writes the value columns and **does not touch** `explicit_overrides`
- A learner change writes both the column and the override entry
- Per-setting **Reset** deletes the override entry and restores the preset's value
- `base_preset` + `explicit_overrides` is the complete description of a learner's configuration; the value columns become a materialised convenience
- **A new preset default only applies to keys with no override.** This is what makes the D8 migration safe

`via` also feeds [09](09-MEASUREMENT-PLAN.md)'s "where do learners actually adjust settings" question, which decides whether Tier 1 quick controls were worth building.

### 3.2 Store real units

| Now | Target | Why |
|---|---|---|
| `word_spacing_pct` 0–50 | `word_spacing_em` numeric(4,3) | The stored value means something on its own; the WCAG floor of 0.16 is directly comparable |
| — | `letter_spacing_em` numeric(4,3) | Currently only hardcoded preset CSS; needs to be a setting ([02 §2.4](02-SETTINGS-REFERENCE.md)) |
| — | `paragraph_spacing_em` numeric(4,3) | WCAG 1.4.12 requires ≥ 2em and nothing controls it |
| `line_spacing_multiplier` | keep | already unitless and meaningful |

### 3.3 New fields

| Field | Type | Replaces / adds |
|---|---|---|
| `sequencer` | `'none' \| 'focus' \| 'guided'` | collapses `step_by_step_enabled` + focus mode ([03 §7.1](03-PRESET-REDESIGN-PLAN.md)) |
| `explicitness` | `'standard' \| 'reduced' \| 'explicit'` | renames `structure_mode` to what it means ([02 §4.1](02-SETTINGS-REFERENCE.md)) |
| `tts_autoplay` | boolean, default **false** | splits availability from autoplay ([02 §2.6](02-SETTINGS-REFERENCE.md)) |
| `browse_pagination` | boolean | decouples course browsing from lesson `layout_mode` ([04 §4.2](04-DISPLAY-SPEC.md)) |
| `transition_announcements` | boolean | implied true when `animation_level = 'none'` |
| `quiz_timer_visible` | boolean, default false | learner opt-in per [07 §3](07-ASSESSMENT-POLICY.md) |
| `modifiers` | `text[]` | preset composition ([05 §7](05-CUSTOMIZATION-UX.md)) |
| `settings_version` | int | cache and migration guard |

### 3.4 Deprecation schedule

| Column | Action | Timing |
|---|---|---|
| `preferred_font_size`, `line_spacing`, `preferred_font`, `dyslexia_friendly_font` | **Stop reading** immediately (Phase 1); keep writing as a mirror | Phase 1 |
| Same four | Stop writing; keep the columns | Phase 3 |
| Same four | Drop | after one release with no reads |
| `word_spacing_pct` | Backfill to `word_spacing_em`, then drop | Phase 2 |
| `low_contrast` | Keep, but stop emitting `data-low-contrast`; delete the contrast filter rule | Phase 1 |
| `screen_reader_optimized` | Drop — already marked deprecated and unread | Phase 2 |
| `structure_mode` | Rename to `explicitness` with a compatibility view | Phase 2 |
| `chunked_content_mode` | Derive from `layout_mode`; stop storing | Phase 2 |

**Rule:** never drop a column in the same release that stops reading it. One release of
overlap, always.

---

## 4. Migration of existing learners

The governing constraint from [00 §3](00-PROGRAM-PLAN.md) D8:

> **Nobody's interface changes without them accepting it.** For an autistic learner, an
> interface that silently rearranges itself is precisely the harm the preset exists to
> prevent. A migration that "improves" their settings overnight is a bug.

### 4.1 Two-stage migration

**Stage 1 — Value-preserving backfill (silent, safe).**
Convert stored values so rendering is *pixel-identical* to before.

```
word_spacing_em    := word_spacing_pct / 100 * 0.3     -- reproduces today's render exactly
letter_spacing_em  := 0.10 if base_preset = 'dyslexia' else 0   -- was hardcoded CSS
paragraph_spacing_em := 1.0                                     -- was the implicit default
sequencer          := 'guided' if step_by_step_enabled else 'none'
explicitness       := structure_mode
tts_autoplay       := false                             -- never migrate autoplay ON
browse_pagination  := (layout_mode = 'slide' OR chunked_content_mode)
explicit_overrides := '{}'                              -- unknown provenance; assume preset
settings_version   := 2
```

Note `tts_autoplay := false` regardless of prior state — this is the one deliberate
behaviour change, because autoplay was never consented to and violates WCAG 3.2.5.
It removes something unrequested rather than adding something unexpected.

**Stage 2 — Offer the improved defaults (explicit, opt-in).**
On next sign-in, once, non-blocking:

```
┌───────────────────────────────────────────────────────────┐
│  We've improved the Dyslexia settings                     │
│                                                           │
│  Nothing has changed yet. You can keep your current        │
│  setup, or try the updated version.                       │
│                                                           │
│  Word spacing      0.06em  →  0.16em                      │
│  Letter spacing    0.10em  →  0.12em                      │
│  Reading width     wide    →  62 characters               │
│  Read aloud        starts by itself → starts when you ask │
│                                                           │
│  [ Keep my current settings ]   [ Preview ]   [ Update ]  │
└───────────────────────────────────────────────────────────┘
```

- Dismissible; reappears at most once more, then never
- Reuses the Preset Details dialog ([03 §8](03-PRESET-REDESIGN-PLAN.md)) — the same component, in a migration frame
- **Keys with an `explicit_overrides` entry are never offered for change**, because the learner already decided
- Choosing "Keep" is recorded so the prompt does not return

### 4.2 Roll-back

Keep the pre-migration row in `user_accessibility_settings_v1_backup` for one release. A
learner who says "everything looks wrong" gets a one-click restore from support, not a
reconstruction.

---

## 5. Client cache and offline

### 5.1 Cache contract

```ts
{ settings_version: 2, updated_at: ISO8601, user_id: uuid, data: {...} }
```

| Rule | Detail |
|---|---|
| **Version gate** | Mismatched `settings_version` → discard and refetch, never parse-and-apply |
| **User gate** | Mismatched `user_id` → discard. Shared devices are common in schools |
| **Sign-out** | Clear the cache (already done) |
| **Conflict** | Server `updated_at` wins on load; local changes made while offline are queued and replayed, then re-fetched |
| **Never cache** | `disability_type` and `custom_notes` — sensitive, and not needed for rendering |

### 5.2 Offline behaviour

- Settings apply from cache with no network — this is why they are cached at all
- A change made offline applies immediately and is queued; the UI says "Saved on this device. Will sync when you're back online"
- **Never silently drop a change.** If a sync conflict occurs, the local change wins for settings (the learner made it most recently and deliberately) and the fact is stated

### 5.3 First paint

The cache exists to prevent a flash of default styling. Two additions:

- Emit the critical `data-*` attributes and CSS variables **server-side or in an inline head script**, so the first paint is already correct rather than corrected
- Under `animation_level: none`, a settings-driven repaint must not animate — a "correction flash" is itself an unannounced change

---

## 6. Privacy of disability data

### 6.1 Classification

| Data | Class | Rule |
|---|---|---|
| `disability_type`, `custom_notes` | **Sensitive** | Learner and system only. Never in exports, analytics, educator views, or logs |
| `base_preset`, `modifiers` | **Sensitive by inference** — a preset implies a condition | Same handling as above |
| Individual settings (font size, tint) | Preference | Routine; safe to log in aggregate |
| `explicit_overrides` | Preference | Routine |
| Usage events (`adaptive_interactions`) | Behavioural | Aggregate only; never joined to `disability_type` without separate consent |

**The important consequence:** `base_preset` must be treated as sensitive. It is tempting
to expose it to educators as "helpful context"; a learner using the Dyslexia preset has
effectively disclosed a condition to anyone who can read that field.

### 6.2 Access rules

| Actor | May read |
|---|---|
| The learner | Everything of their own |
| Educator | **Nothing** individual. Aggregate only, minimum cohort size 5, and only where it drives a real decision |
| Admin | Nothing individual without a logged, purpose-stated access |
| Analytics | Preference fields and events, never `disability_type`, never per-learner preset |
| Exports / reports | Never sensitive fields |

**Verify RLS on `user_accessibility_settings` explicitly.** Sibling tables in
`20260618000001_accessibility_engine.sql` have policies; confirm this table has an
owner-only policy for select, insert, and update, and add a regression test — a
privacy rule that is not tested is a privacy rule that will regress.

### 6.3 Consent and control

- Providing `disability_type` is **optional**, always, and never a precondition for support ([05 §6.1](05-CUSTOMIZATION-UX.md))
- The learner can **view, export, and delete** their accessibility data independently of their account
- Deleting it must not delete their settings — the preferences are theirs to keep
- Any future feature that shares this data requires a **separate, specific opt-in**; a general terms acceptance is not consent for disability disclosure
- The privacy notice must say in plain language what is collected, why, and who can see it

### 6.4 Logging

- `disability_type` and `custom_notes` never enter application logs, error reports, or third-party telemetry
- Settings changes are logged **by key, not by value**, when the value could be sensitive
- Error reports scrub the settings object before transmission

---

## 7. Audit trail

Add `user_accessibility_settings_history`: `user_id`, `changed_at`, `changed_by`,
`source` (`onboarding` / `preset` / `settings_panel` / `quick_control` / `migration`),
`changes` jsonb, `settings_version`.

Purposes: answer "why does my screen look different"; make migration effects auditable;
supply [09](09-MEASUREMENT-PLAN.md) with churn data. Retain 12 months, then aggregate.

---

## 8. Migration checklist

- [ ] `explicit_overrides`, unit columns, and new fields added with defaults
- [ ] Stage 1 backfill verified **pixel-identical** on a sample of real rows before running in production
- [ ] `tts_autoplay` forced false for everyone, and this is the only intentional behaviour change
- [ ] Backup table created and retained for one release
- [ ] Cache versioned; stale and cross-user caches discarded rather than parsed
- [ ] First paint correct without a correction flash
- [ ] RLS on `user_accessibility_settings` confirmed owner-only, with a test
- [ ] `disability_type` and `base_preset` absent from every export, educator view, log, and analytics payload
- [ ] Stage 2 prompt shown once, dismissible, never for overridden keys
- [ ] Roll-back path documented and tested
- [ ] History table recording source of every change
- [ ] No column dropped in the same release it stopped being read
