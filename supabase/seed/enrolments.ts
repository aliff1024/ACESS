/**
 * Who studies what, how far they got, and when.
 *
 * Each plan is turned into a chronologically consistent chain by run.ts:
 *
 *   enrolment  →  lesson first view  →  lesson completion  →  quiz attempts
 *              →  course completion  →  achievement unlock →  certificate
 *
 * Activity for a plan is spread evenly between `firstActivity` and
 * `lastActivity`, so every learner has a different engagement pattern and the
 * admin analytics get real curves instead of one spike.
 */

export interface QuizPlan {
  /** Index of the quiz within the course, in lesson order. */
  quizIndex: number;
  /** Target percentage for each attempt, in order. The runner picks the
   *  matching number of correct options so the stored answers agree with the
   *  stored score. */
  attempts: number[];
}

export interface EnrolPlan {
  learner: string;
  course: string;
  enrolledAt: string;
  /** Number of visible lessons completed, or 'all'. */
  completed: number | 'all';
  /** Extra lessons opened but not finished, after the completed ones. */
  viewedOnly: number;
  firstActivity: string;
  lastActivity: string;
  status: 'active' | 'completed' | 'dropped';
  /** Distinct days of study — drives the 'streak' achievement rule. */
  studyDays: number;
  quizzes?: QuizPlan[];
  note: string;
}

export const ENROLMENTS: EnrolPlan[] = [
  // ══════════════ LEARNER A — Amir (advanced, active today) ══════════════
  {
    learner: 'learner_amir',
    course: 'c_foundations',
    enrolledAt: '2026-02-11T19:40:00+08:00',
    completed: 'all',
    viewedOnly: 0,
    firstActivity: '2026-02-11T19:45:00+08:00',
    lastActivity: '2026-03-02T20:30:00+08:00',
    status: 'completed',
    studyDays: 6,
    quizzes: [{ quizIndex: 0, attempts: [50, 100] }],
    note: 'First course, finished. Failed the review quiz once then aced it.',
  },
  {
    learner: 'learner_amir',
    course: 'c_adhd',
    enrolledAt: '2026-03-05T21:00:00+08:00',
    completed: 'all',
    viewedOnly: 0,
    firstActivity: '2026-03-06T20:10:00+08:00',
    lastActivity: '2026-04-12T19:20:00+08:00',
    status: 'completed',
    studyDays: 9,
    quizzes: [{ quizIndex: 0, attempts: [67, 100] }],
    note: 'Second completed course — the one matching his ADHD profile.',
  },
  {
    learner: 'learner_amir',
    course: 'c_reading',
    enrolledAt: '2026-04-20T18:15:00+08:00',
    completed: 3,
    viewedOnly: 1,
    firstActivity: '2026-04-21T19:00:00+08:00',
    lastActivity: '2026-06-15T20:45:00+08:00',
    status: 'active',
    studyDays: 5,
    quizzes: [{ quizIndex: 0, attempts: [100] }],
    note: 'In progress, 60%.',
  },
  {
    learner: 'learner_amir',
    course: 'c_maths',
    enrolledAt: '2026-05-10T17:30:00+08:00',
    completed: 2,
    viewedOnly: 1,
    firstActivity: '2026-05-11T18:20:00+08:00',
    lastActivity: '2026-07-20T21:10:00+08:00',
    status: 'active',
    studyDays: 4,
    quizzes: [{ quizIndex: 0, attempts: [67, 100] }],
    note: 'In progress, 67%.',
  },
  {
    learner: 'learner_amir',
    course: 'c_digital',
    enrolledAt: '2026-06-20T20:00:00+08:00',
    completed: 1,
    viewedOnly: 1,
    firstActivity: '2026-06-21T20:30:00+08:00',
    lastActivity: '2026-08-25T21:40:00+08:00',
    status: 'active',
    studyDays: 3,
    note: 'Most recent enrolment, still active this week.',
  },

  // ══════════════ LEARNER B — Mei (mid-progress, 20–80%) ══════════════
  {
    learner: 'learner_mei',
    course: 'c_foundations',
    enrolledAt: '2026-03-23T20:20:00+08:00',
    completed: 3,
    viewedOnly: 1,
    firstActivity: '2026-03-24T20:00:00+08:00',
    lastActivity: '2026-05-10T21:15:00+08:00',
    status: 'active',
    studyDays: 5,
    quizzes: [{ quizIndex: 0, attempts: [50, 75] }],
    note: '60% — passed the quiz on the second try.',
  },
  {
    learner: 'learner_mei',
    course: 'c_reading',
    enrolledAt: '2026-04-02T19:10:00+08:00',
    completed: 4,
    viewedOnly: 1,
    firstActivity: '2026-04-03T19:30:00+08:00',
    lastActivity: '2026-07-05T20:50:00+08:00',
    status: 'active',
    studyDays: 8,
    quizzes: [{ quizIndex: 0, attempts: [50, 100] }],
    note: '80% — her strongest course, matched to her dyslexia profile.',
  },
  {
    learner: 'learner_mei',
    course: 'c_autism',
    enrolledAt: '2026-05-15T18:40:00+08:00',
    completed: 1,
    viewedOnly: 1,
    firstActivity: '2026-05-16T19:00:00+08:00',
    lastActivity: '2026-06-20T20:05:00+08:00',
    status: 'active',
    studyDays: 3,
    note: '33% — sampled the structure course.',
  },
  {
    learner: 'learner_mei',
    course: 'c_digital',
    enrolledAt: '2026-07-01T21:00:00+08:00',
    completed: 0,
    viewedOnly: 1,
    firstActivity: '2026-07-02T21:20:00+08:00',
    lastActivity: '2026-08-24T22:10:00+08:00',
    status: 'active',
    studyDays: 2,
    note: 'Just started — 0 lessons finished, one opened. Active this week.',
  },

  // ══════════════ LEARNER C — Haziq (new, barely started, lapsed) ══════════════
  {
    learner: 'learner_haziq',
    course: 'c_foundations',
    enrolledAt: '2026-07-29T18:50:00+08:00',
    completed: 1,
    viewedOnly: 1,
    firstActivity: '2026-07-29T19:00:00+08:00',
    lastActivity: '2026-08-04T19:30:00+08:00',
    status: 'active',
    studyDays: 2,
    note: '20% — one lesson done, then stopped.',
  },
  {
    learner: 'learner_haziq',
    course: 'c_maths',
    enrolledAt: '2026-08-01T19:15:00+08:00',
    completed: 0,
    viewedOnly: 1,
    firstActivity: '2026-08-01T19:20:00+08:00',
    lastActivity: '2026-08-05T19:05:00+08:00',
    status: 'active',
    studyDays: 1,
    note: 'Opened one lesson, never completed anything. No achievements, no certificate.',
  },

  // ══════════════ Aisyah — high performer ══════════════
  {
    learner: 'learner_aisyah',
    course: 'c_foundations',
    enrolledAt: '2026-02-26T17:00:00+08:00',
    completed: 'all',
    viewedOnly: 0,
    firstActivity: '2026-02-26T17:10:00+08:00',
    lastActivity: '2026-03-15T18:40:00+08:00',
    status: 'completed',
    studyDays: 7,
    quizzes: [{ quizIndex: 0, attempts: [100] }],
    note: 'Completed, full marks first attempt.',
  },
  {
    learner: 'learner_aisyah',
    course: 'c_reading',
    enrolledAt: '2026-03-20T16:30:00+08:00',
    completed: 'all',
    viewedOnly: 0,
    firstActivity: '2026-03-21T16:45:00+08:00',
    lastActivity: '2026-05-02T18:00:00+08:00',
    status: 'completed',
    studyDays: 10,
    quizzes: [{ quizIndex: 0, attempts: [100] }],
    note: 'Completed. Received an educator certificate for this one.',
  },
  {
    learner: 'learner_aisyah',
    course: 'c_maths',
    enrolledAt: '2026-05-05T17:20:00+08:00',
    completed: 'all',
    viewedOnly: 0,
    firstActivity: '2026-05-06T17:30:00+08:00',
    lastActivity: '2026-06-18T19:00:00+08:00',
    status: 'completed',
    studyDays: 8,
    quizzes: [{ quizIndex: 0, attempts: [100] }],
    note: 'Third completed course.',
  },
  {
    learner: 'learner_aisyah',
    course: 'c_comprehension',
    enrolledAt: '2026-07-22T16:00:00+08:00',
    completed: 1,
    viewedOnly: 1,
    firstActivity: '2026-07-23T16:20:00+08:00',
    lastActivity: '2026-08-26T06:20:00+08:00',
    status: 'active',
    studyDays: 4,
    quizzes: [{ quizIndex: 0, attempts: [100] }],
    note: 'The only learner on the newest course. Active today.',
  },

  // ══════════════ Priya — steady, autism profile ══════════════
  {
    learner: 'learner_priya',
    course: 'c_foundations',
    enrolledAt: '2026-04-16T15:40:00+08:00',
    completed: 4,
    viewedOnly: 1,
    firstActivity: '2026-04-17T15:50:00+08:00',
    lastActivity: '2026-06-01T16:30:00+08:00',
    status: 'active',
    studyDays: 6,
    quizzes: [{ quizIndex: 0, attempts: [75] }],
    note: '80%, one lesson left.',
  },
  {
    learner: 'learner_priya',
    course: 'c_autism',
    enrolledAt: '2026-04-20T15:00:00+08:00',
    completed: 'all',
    viewedOnly: 0,
    firstActivity: '2026-04-21T15:10:00+08:00',
    lastActivity: '2026-06-10T16:00:00+08:00',
    status: 'completed',
    studyDays: 7,
    note: 'Completed — earns her system certificate.',
  },
  {
    learner: 'learner_priya',
    course: 'c_adhd',
    enrolledAt: '2026-06-15T14:30:00+08:00',
    completed: 1,
    viewedOnly: 1,
    firstActivity: '2026-06-16T14:40:00+08:00',
    lastActivity: '2026-08-23T15:10:00+08:00',
    status: 'active',
    studyDays: 3,
    note: '25% — recently active.',
  },

  // ══════════════ Daniel — at risk, one dropped enrolment ══════════════
  {
    learner: 'learner_daniel',
    course: 'c_foundations',
    enrolledAt: '2026-03-02T21:30:00+08:00',
    completed: 2,
    viewedOnly: 1,
    firstActivity: '2026-03-03T21:40:00+08:00',
    lastActivity: '2026-04-15T22:00:00+08:00',
    status: 'active',
    studyDays: 3,
    quizzes: [{ quizIndex: 0, attempts: [25, 50] }],
    note: 'Stalled at 40%. Failed the quiz twice — never passed.',
  },
  {
    learner: 'learner_daniel',
    course: 'c_adhd',
    enrolledAt: '2026-03-20T20:00:00+08:00',
    completed: 1,
    viewedOnly: 1,
    firstActivity: '2026-03-21T20:10:00+08:00',
    lastActivity: '2026-04-02T21:00:00+08:00',
    status: 'active',
    studyDays: 2,
    quizzes: [{ quizIndex: 0, attempts: [33] }],
    note: 'Stalled at 25% after a failed assessment.',
  },
  {
    learner: 'learner_daniel',
    course: 'c_archived',
    enrolledAt: '2026-03-10T20:40:00+08:00',
    completed: 1,
    viewedOnly: 0,
    firstActivity: '2026-03-11T20:50:00+08:00',
    lastActivity: '2026-03-25T21:20:00+08:00',
    status: 'dropped',
    studyDays: 2,
    note: 'Dropped this enrolment before the course was archived in June.',
  },
];

// ── Favourites ────────────────────────────────────────────────────────────
export const FAVOURITES: { learner: string; course: string; at: string }[] = [
  { learner: 'learner_amir', course: 'c_adhd', at: '2026-03-06T20:15:00+08:00' },
  { learner: 'learner_amir', course: 'c_digital', at: '2026-06-21T20:35:00+08:00' },
  { learner: 'learner_mei', course: 'c_reading', at: '2026-04-03T19:35:00+08:00' },
  { learner: 'learner_aisyah', course: 'c_comprehension', at: '2026-07-23T16:25:00+08:00' },
  { learner: 'learner_aisyah', course: 'c_reading', at: '2026-03-21T16:50:00+08:00' },
  { learner: 'learner_priya', course: 'c_autism', at: '2026-04-21T15:15:00+08:00' },
  { learner: 'learner_haziq', course: 'c_foundations', at: '2026-07-29T19:05:00+08:00' },
];

// ── Certificates issued by educators (metadata.is_custom = true) ──────────
export const CUSTOM_CERTIFICATES: {
  learner: string;
  course: string;
  educator: string;
  title: string;
  skills: string[];
  issuedAt: string;
  revokedAt?: string;
  revokeReason?: string;
}[] = [
  {
    learner: 'learner_amir',
    course: 'c_adhd',
    educator: 'edu_siti',
    title: 'Outstanding Peer Mentor — Focus & Study Skills',
    skills: ['Peer mentoring', 'Attention management', 'Study systems'],
    issuedAt: '2026-04-18T10:30:00+08:00',
  },
  {
    learner: 'learner_aisyah',
    course: 'c_reading',
    educator: 'edu_siti',
    title: 'Excellence in Reading Fluency',
    skills: ['Decoding', 'Repeated reading', 'Fluency'],
    issuedAt: '2026-05-06T09:15:00+08:00',
  },
  {
    learner: 'learner_mei',
    course: 'c_reading',
    educator: 'edu_siti',
    title: 'Reading Fluency — Participation',
    skills: ['Decoding'],
    issuedAt: '2026-06-02T11:00:00+08:00',
    revokedAt: '2026-06-04T14:20:00+08:00',
    revokeReason: 'Issued in error — the learner had not yet completed the required fluency lessons.',
  },
];
