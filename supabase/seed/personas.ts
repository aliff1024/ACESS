/**
 * ACESS demo personas.
 *
 * Every account has a deliberate shape — join date, activity recency,
 * accessibility profile — so that the admin analytics, the educator cohort
 * views and the learner dashboards all have something meaningful to render.
 *
 * All accounts share the password in DEMO_PASSWORD.
 */

export const DEMO_PASSWORD = 'AcessDemo#2026';

export type Role = 'admin' | 'educator' | 'learner';

export interface Persona {
  /** Stable key used by the course/enrolment tables below. */
  key: string;
  email: string;
  fullName: string;
  role: Role;
  username: string;
  bio: string;
  /** ISO date the account was created. */
  joined: string;
  /** ISO date of last sign-in — drives the "active/inactive" analytics split. */
  lastActive: string;
  birthDate: string;
  phone: string;
  country: string;
  preferredLanguage: 'en' | 'ms';
  disabilityType: string | null;
  /** Written into user_profiles.accessibility_prefs (jsonb). */
  accessibilityPrefs: Record<string, unknown>;
  notificationPrefs: Record<string, unknown>;
  /** One-line note on what this account is for, used by the docs generator. */
  scenario: string;
}

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

export const AVATAR = avatar;

const DEFAULT_NOTIFS = {
  email_enabled: true,
  course_updates: true,
  achievement_alerts: true,
  weekly_digest: false,
};

export const PERSONAS: Persona[] = [
  // ─────────────────────────── Admins ───────────────────────────
  {
    key: 'admin_aliff',
    email: 'aliff.admin@acess.edu.my',
    fullName: 'Aliff Affandi',
    role: 'admin',
    username: 'aliff.admin',
    bio: 'Platform administrator. Oversees course approvals, educator onboarding and the accessibility compliance dashboard.',
    joined: '2026-01-15T09:12:00+08:00',
    lastActive: '2026-08-26T08:40:00+08:00',
    birthDate: '1994-03-22',
    phone: '+60 12-330 4471',
    country: 'Malaysia',
    preferredLanguage: 'en',
    disabilityType: null,
    accessibilityPrefs: { active_preset: 'none', font_family: 'arial', font_size_px: 16 },
    notificationPrefs: { ...DEFAULT_NOTIFS, weekly_digest: true },
    scenario: 'Primary admin. Created the platform, approves courses and educators.',
  },
  {
    key: 'admin_nurul',
    email: 'nurul.admin@acess.edu.my',
    fullName: 'Nurul Izzah Rahman',
    role: 'admin',
    username: 'nurul.admin',
    bio: 'Accessibility compliance lead. Reviews lesson audit scores and follows up with educators on partially compliant content.',
    joined: '2026-02-02T10:05:00+08:00',
    lastActive: '2026-08-25T17:22:00+08:00',
    birthDate: '1990-11-08',
    phone: '+60 13-887 2210',
    country: 'Malaysia',
    preferredLanguage: 'ms',
    accessibilityPrefs: { active_preset: 'none', font_family: 'verdana', font_size_px: 17, high_contrast: true },
    disabilityType: null,
    notificationPrefs: { ...DEFAULT_NOTIFS, weekly_digest: true },
    scenario: 'Second admin, joined later. Focused on accessibility reporting.',
  },
  {
    key: 'admin_rajesh',
    email: 'rajesh.admin@acess.edu.my',
    fullName: 'Rajesh Kumar Menon',
    role: 'admin',
    username: 'rajesh.admin',
    bio: 'Content operations. Handles contact-form triage, instructor applications and archived course housekeeping.',
    joined: '2026-04-10T14:30:00+08:00',
    lastActive: '2026-08-21T11:03:00+08:00',
    birthDate: '1987-06-30',
    phone: '+60 16-224 9903',
    country: 'Malaysia',
    preferredLanguage: 'en',
    disabilityType: null,
    accessibilityPrefs: { active_preset: 'none', font_family: 'calibri', font_size_px: 16 },
    notificationPrefs: DEFAULT_NOTIFS,
    scenario: 'Newest admin. Demonstrates a staggered admin join date.',
  },

  // ────────────────────────── Educators ─────────────────────────
  {
    key: 'edu_siti',
    email: 'siti.educator@acess.edu.my',
    fullName: 'Dr. Siti Aminah Yusof',
    role: 'educator',
    username: 'dr.siti',
    bio: 'Special education researcher (UTeM). Designs reading and study-skills courses for learners with dyslexia, ADHD and autism.',
    joined: '2026-01-20T08:45:00+08:00',
    lastActive: '2026-08-26T07:55:00+08:00',
    birthDate: '1982-09-14',
    phone: '+60 12-661 8842',
    country: 'Malaysia',
    preferredLanguage: 'en',
    disabilityType: null,
    accessibilityPrefs: { active_preset: 'none', font_family: 'atkinson_hyperlegible', font_size_px: 17 },
    notificationPrefs: { ...DEFAULT_NOTIFS, weekly_digest: true },
    scenario: 'Senior educator. Owns five published courses and issues custom certificates.',
  },
  {
    key: 'edu_marcus',
    email: 'marcus.educator@acess.edu.my',
    fullName: 'Marcus Tan Wei Jie',
    role: 'educator',
    username: 'marcus.tan',
    bio: 'Numeracy specialist and former secondary school teacher. Builds practical mathematics courses for daily living.',
    joined: '2026-03-05T09:20:00+08:00',
    lastActive: '2026-08-24T16:10:00+08:00',
    birthDate: '1991-01-27',
    phone: '+60 17-450 1187',
    country: 'Malaysia',
    preferredLanguage: 'en',
    disabilityType: null,
    accessibilityPrefs: { active_preset: 'none', font_family: 'arial', font_size_px: 16 },
    notificationPrefs: DEFAULT_NOTIFS,
    scenario: 'Mid-tenure educator. Owns a popular course, an empty course and an archived one.',
  },
  {
    key: 'edu_farah',
    email: 'farah.educator@acess.edu.my',
    fullName: 'Farah Nadhirah Idris',
    role: 'educator',
    username: 'farah.idris',
    bio: 'Assistive technology trainer. Recently approved as an ACESS educator and still preparing her first courses.',
    joined: '2026-06-18T13:00:00+08:00',
    lastActive: '2026-08-19T09:47:00+08:00',
    birthDate: '1996-04-05',
    phone: '+60 11-2280 5514',
    country: 'Malaysia',
    preferredLanguage: 'ms',
    disabilityType: null,
    accessibilityPrefs: { active_preset: 'none', font_family: 'verdana', font_size_px: 16 },
    notificationPrefs: DEFAULT_NOTIFS,
    scenario: 'Newest educator, promoted from an approved instructor application. Has a draft and a pending-review course, no learners yet.',
  },

  // ─────────────────────────── Learners ─────────────────────────
  {
    key: 'learner_amir', // ── Learner A: active / advanced
    email: 'amir.learner@acess.edu.my',
    fullName: 'Amir Hakim bin Rosli',
    role: 'learner',
    username: 'amirhakim',
    bio: 'Form 5 student. Uses chunked lessons and distraction-free mode to manage ADHD while studying.',
    joined: '2026-02-10T19:30:00+08:00',
    lastActive: '2026-08-26T07:10:00+08:00',
    birthDate: '2009-05-18',
    phone: '+60 19-772 3318',
    country: 'Malaysia',
    preferredLanguage: 'en',
    disabilityType: 'adhd',
    accessibilityPrefs: {
      active_preset: 'adhd',
      base_preset: 'adhd',
      chunked_content_mode: true,
      distraction_free_mode: true,
      layout_mode: 'chunked',
      structure_mode: 'checklist',
      task_checklist_enabled: true,
      step_by_step_enabled: true,
      animation_level: 'low',
      font_family: 'arial',
      font_size_px: 18,
      line_spacing_multiplier: 1.4,
      background_tint: 'pale_blue',
      tts_enabled: true,
      tts_rate: 1.0,
    },
    notificationPrefs: { ...DEFAULT_NOTIFS, achievement_alerts: true },
    scenario:
      'LEARNER A — advanced. 5 enrolments, 2 courses completed, both certificate types, rich achievement and quiz history, active today.',
  },
  {
    key: 'learner_mei', // ── Learner B: active / mid-progress
    email: 'mei.learner@acess.edu.my',
    fullName: 'Chong Mei Ling',
    role: 'learner',
    username: 'meiling',
    bio: 'Polytechnic student. Reads with the OpenDyslexic font and a cream background, and relies on text-to-speech for longer passages.',
    joined: '2026-03-22T20:15:00+08:00',
    lastActive: '2026-08-25T21:05:00+08:00',
    birthDate: '2007-12-02',
    phone: '+60 14-338 7726',
    country: 'Malaysia',
    preferredLanguage: 'en',
    disabilityType: 'dyslexia',
    accessibilityPrefs: {
      active_preset: 'dyslexia',
      base_preset: 'dyslexia',
      dyslexia_friendly_font: true,
      font_family: 'opendyslexic',
      preferred_font: 'dyslexia',
      font_size_px: 19,
      line_spacing_multiplier: 1.6,
      word_spacing_pct: 12,
      background_tint: 'cream',
      reading_spotlight: true,
      tts_enabled: true,
      tts_rate: 0.9,
      preferred_reading_level: 'simplified',
    },
    notificationPrefs: DEFAULT_NOTIFS,
    scenario:
      'LEARNER B — mid-progress. 4 enrolments between 20% and 80%, mixed lesson completion, several quiz attempts, a few achievements, no course finished yet.',
  },
  {
    key: 'learner_haziq', // ── Learner C: new / barely started
    email: 'haziq.learner@acess.edu.my',
    fullName: 'Haziq Danial bin Zainal',
    role: 'learner',
    username: 'haziqdanial',
    bio: 'Just joined ACESS. Still exploring which courses to follow.',
    joined: '2026-07-28T18:40:00+08:00',
    lastActive: '2026-08-05T19:12:00+08:00',
    birthDate: '2011-08-09',
    phone: '+60 18-909 4432',
    country: 'Malaysia',
    preferredLanguage: 'ms',
    disabilityType: null,
    accessibilityPrefs: { active_preset: 'none', font_family: 'arial', font_size_px: 16 },
    notificationPrefs: { ...DEFAULT_NOTIFS, achievement_alerts: false },
    scenario:
      'LEARNER C — beginner / lapsed. Joined a month ago, 2 enrolments barely started, no achievements, no certificates, last seen three weeks ago.',
  },
  {
    key: 'learner_aisyah',
    email: 'aisyah.learner@acess.edu.my',
    fullName: 'Aisyah Nabila binti Kamal',
    role: 'learner',
    username: 'aisyahnabila',
    bio: 'Consistent high achiever. Finishes courses end to end and retakes quizzes until she scores full marks.',
    joined: '2026-02-25T17:05:00+08:00',
    lastActive: '2026-08-26T06:30:00+08:00',
    birthDate: '2006-02-11',
    phone: '+60 12-556 2094',
    country: 'Malaysia',
    preferredLanguage: 'en',
    disabilityType: null,
    accessibilityPrefs: { active_preset: 'none', font_family: 'calibri', font_size_px: 17, line_spacing_multiplier: 1.3 },
    notificationPrefs: { ...DEFAULT_NOTIFS, weekly_digest: true },
    scenario: 'High performer. Three completed courses, top quiz scores — anchors the upper end of the analytics.',
  },
  {
    key: 'learner_priya',
    email: 'priya.learner@acess.edu.my',
    fullName: 'Priya Devi a/p Ramesh',
    role: 'learner',
    username: 'priyadevi',
    bio: 'Prefers predictable structure, muted colours and a visual schedule for every lesson.',
    joined: '2026-04-15T15:25:00+08:00',
    lastActive: '2026-08-23T14:50:00+08:00',
    birthDate: '2008-10-24',
    phone: '+60 16-771 6650',
    country: 'Malaysia',
    preferredLanguage: 'en',
    disabilityType: 'autism',
    accessibilityPrefs: {
      active_preset: 'autism',
      base_preset: 'autism',
      muted_colors: true,
      low_contrast: true,
      animation_level: 'none',
      structure_mode: 'full',
      visual_schedule_enabled: true,
      step_by_step_enabled: true,
      auto_save_enabled: true,
      background_tint: 'soft_green',
      font_family: 'verdana',
      font_size_px: 17,
      layout_mode: 'scroll',
    },
    notificationPrefs: DEFAULT_NOTIFS,
    scenario: 'Steady autistic learner. One completed course, two in progress — exercises the autism audit profile.',
  },
  {
    key: 'learner_daniel',
    email: 'daniel.learner@acess.edu.my',
    fullName: 'Daniel Lim Jun Hao',
    role: 'learner',
    username: 'danieljh',
    bio: 'Started strongly in March then drifted. Has one dropped enrolment and two stalled courses.',
    joined: '2026-03-01T21:00:00+08:00',
    lastActive: '2026-07-30T22:18:00+08:00',
    birthDate: '2007-07-19',
    phone: '+60 13-402 7781',
    country: 'Malaysia',
    preferredLanguage: 'en',
    disabilityType: null,
    accessibilityPrefs: { active_preset: 'none', font_family: 'arial', font_size_px: 16 },
    notificationPrefs: { ...DEFAULT_NOTIFS, email_enabled: false },
    scenario: 'At-risk learner. Failed quiz attempts, a dropped enrolment and a four-week gap — drives the risk analytics.',
  },
];

export const byKey = (key: string): Persona => {
  const p = PERSONAS.find((x) => x.key === key);
  if (!p) throw new Error(`Unknown persona: ${key}`);
  return p;
};
