# ACESS — User Acceptance Testing (UAT) Package

Six friends, each role-playing one persona. One shared Google Form, branching by role.
Everything below is ready to copy straight into Google Forms and into your messages to each friend.

---

## 1. Recruit and assign

Pick six friends, one persona each:

1. Learner — Dyslexia preset
2. Learner — ADHD preset
3. Learner — Autism preset
4. Learner — Baseline (no preset)
5. Educator
6. Administrator

Send each friend **only their own persona brief** (Section 3 below) before they touch the app — they should react as that persona, not as themselves exploring freely.

---

## 2. Build the Google Form

Go to forms.google.com → Blank form.

**Title:** ACESS User Acceptance Testing

**Description:** "Thanks for helping test ACESS. You'll be asked which role you were given, then a short set of questions about that experience. Please complete the tasks in your brief first, then fill this in."

### Section 1 — Role select (top of form, before any branching)
Add one question:
- Type: **Multiple choice**
- Question: "Which persona were you asked to role-play?"
- Options (one per line): `Learner – Dyslexia`, `Learner – ADHD`, `Learner – Autism`, `Learner – Baseline (no preset)`, `Educator`, `Administrator`
- Click the **⋮** (three dots) on this question → **"Go to section based on answer"** → set each option to jump to its matching section (you'll create these next).

### Sections 2–7 — one per persona
Add six new sections (**+ Add section** button). Name each after its persona, e.g. "Learner – Dyslexia". In each section:

1. A **Paragraph text (read-only reminder)** — actually just use a **Section description** field to paste that persona's task list from Section 3 below, so they see it again right before answering.
2. The four Likert questions from Section 4 below (same four questions, every section — this is what makes personas comparable).
3. At the bottom of the section, set **"After section" → "Go to section 8"** (the shared closing section) for all six sections.

### Section 8 — Closing (shared)
One question:
- Type: **Paragraph**
- Question: "What felt missing, or could be improved, for someone in your assigned role?"
- Not required (leave optional — some people won't have anything to add)

---

## 3. Persona task briefs (send each friend only theirs)

**Learner – Dyslexia**
1. Apply the Dyslexia accessibility preset from your profile settings.
2. Open any lesson and read through it under the applied preset.
3. Use the Listen (text-to-speech) control to hear part of the lesson read aloud.
4. Adjust one individual setting (e.g. font size or word spacing) after the preset is applied, and confirm it takes effect immediately.

**Learner – ADHD**
1. Apply the ADHD accessibility preset.
2. Enrol in a course and open a lesson; notice the distraction-free, chunked view.
3. Work through a lesson's task checklist step by step.
4. Take that lesson's quiz and notice the visible timer.

**Learner – Autism**
1. Apply the Autism accessibility preset.
2. Before opening a lesson, review its visual schedule.
3. Navigate between two lessons in the same course and compare their layout and structure.
4. Complete a lesson and check your progress on the Progress page.

**Learner – Baseline (no preset)**
1. Browse the course catalogue and enrol in a course with no accessibility preset active.
2. Complete a full lesson.
3. Take that lesson's quiz.
4. View your certificate or a newly earned achievement.

**Educator**
1. Create a new course (title, description, difficulty level).
2. Author a lesson that includes an image, then run the accessibility compliance auditor on it before publishing and address at least one flagged issue.
3. Open your course analytics dashboard.
4. Issue or review a certificate for a learner in one of your courses.

**Administrator**
1. Review a pending instructor application and approve or reject it.
2. Moderate a course awaiting review (approve or reject its publication).
3. Open the platform-wide analytics view, including accessibility adoption figures.
4. Review and respond to a contact-form enquiry.

---

## 4. Likert questions (identical in every persona section — 5-point Strongly Disagree → Strongly Agree)

| # | Statement |
|---|---|
| L1 | I was able to complete the tasks in this brief. |
| L2 | Finding what I needed in the interface was easy. |
| L3 | The accessibility settings or tools available met my needs for these tasks. |
| L4 | I felt confident using the features specific to this role. |

---

## 5. Message templates — ready to send, one demo account per friend

I checked your repo: the deployed app is live at **https://acess-tau.vercel.app**, and your seeded demo accounts are documented in `docs/SEED_CREDENTIALS.md`. I've assigned a different account to each friend so two people are never logged into the same account at once (that would corrupt each other's enrollment/progress state mid-test).

**⚠️ Before sending anything:** your local seed file describes the *local* Docker Supabase data. Your repo also has `scripts/sync-local-to-remote.ts`, which suggests the remote/deployed project's data may or may not currently match. Log into each account below yourself first and confirm it looks like a normal, populated account — cheap 5-minute check that saves a friend hitting a broken/empty state mid-task.

---

**To your Learner–Dyslexia friend:**
> Hey! Quick favour for my final year project, ~15 min.
> You're playing: a learner who has dyslexia and uses accessibility settings.
> Log in at https://acess-tau.vercel.app/login — email `learner1@test.com`, password `Learn@123`.
> Tasks: (1) Apply the Dyslexia accessibility preset from your profile settings. (2) Open any lesson and read through it under the preset. (3) Use the Listen (text-to-speech) control on part of the lesson. (4) Adjust one individual setting (e.g. font size) after the preset is applied and confirm it updates immediately.
> Then fill in this form (2 min): [Google Form link] — pick "Learner – Dyslexia" when it asks your role.
> Thanks!

**To your Learner–ADHD friend:**
> Hey! Quick favour for my final year project, ~15 min.
> You're playing: a learner with ADHD.
> Log in at https://acess-tau.vercel.app/login — email `learner2@test.com`, password `Learn@123`.
> Tasks: (1) Apply the ADHD accessibility preset. (2) Enrol in a course and open a lesson; notice the distraction-free, chunked view. (3) Work through the lesson's task checklist step by step. (4) Take that lesson's quiz and notice the visible timer.
> Then fill in this form (2 min): [Google Form link] — pick "Learner – ADHD".
> Thanks!

**To your Learner–Autism friend:**
> Hey! Quick favour for my final year project, ~15 min.
> You're playing: a learner with autism.
> Log in at https://acess-tau.vercel.app/login — email `learner3@test.com`, password `Learn@123`.
> Tasks: (1) Apply the Autism accessibility preset. (2) Before opening a lesson, review its visual schedule. (3) Navigate between two lessons in the same course and compare their layout/structure. (4) Complete a lesson and check the Progress page.
> Then fill in this form (2 min): [Google Form link] — pick "Learner – Autism".
> Thanks!

**To your Learner–Baseline friend:**
> Hey! Quick favour for my final year project, ~15 min.
> You're playing: a regular learner, no accessibility settings turned on.
> Log in at https://acess-tau.vercel.app/login — email `learner4@test.com`, password `Learn@123`.
> Tasks: (1) Browse the course catalogue and enrol in a course, no preset active. (2) Complete a full lesson. (3) Take that lesson's quiz. (4) View your certificate or a newly earned achievement.
> Then fill in this form (2 min): [Google Form link] — pick "Learner – Baseline (no preset)".
> Thanks!

**To your Educator friend:**
> Hey! Quick favour for my final year project, ~15 min.
> You're playing: a course educator.
> Log in at https://acess-tau.vercel.app/login — email `educator1@acess.edu`, password `Educ@123`.
> Tasks: (1) Create a new course (title, description, difficulty). (2) Add a lesson with an image, run the accessibility checker on it before publishing, and fix at least one flagged issue. (3) Open your course analytics dashboard. (4) Issue or review a certificate for one of your learners.
> Then fill in this form (2 min): [Google Form link] — pick "Educator".
> Thanks!

**To your Administrator friend:**
> Hey! Quick favour for my final year project, ~15 min.
> You're playing: a platform administrator.
> Log in at https://acess-tau.vercel.app/login — email `admin@acess.edu`, password `Admin@123`.
> Tasks: (1) Review a pending instructor application and approve/reject it. (2) Moderate a course awaiting review. (3) Open the platform-wide analytics view, including accessibility adoption figures. (4) Review and respond to a contact-form enquiry.
> Then fill in this form (2 min): [Google Form link] — pick "Administrator".
> Thanks!

Fill in `[Google Form link]` once you've built the form in Section 2 above.

---

## 6. When responses come in

Google Forms → Responses tab → the little green Sheets icon exports everything to a spreadsheet, one row per respondent, columns for role + L1-L4 + the open feedback. That spreadsheet is what becomes Table 6.9/6.10-style results in Chapter 6 once all six are in — bring it back here (or to your other Claude Code session) and I'll help turn it into the Test Results write-up.
