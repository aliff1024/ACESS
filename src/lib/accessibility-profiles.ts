/**
 * Educator-facing guidance for each accessibility focus profile.
 *
 * This is the "why" behind the audit. The engine in `accessibility-audit.ts`
 * tells an educator *what* failed; this module explains what the learner
 * actually experiences and what to do differently next time. The numbers here
 * are read from THRESHOLDS so the guide can never drift out of step with the
 * rules that are enforced.
 */

import { THRESHOLDS, type FocusProfile } from '@/lib/accessibility-audit'

export interface ProfileNeed {
  /** The barrier, named from the learner's side. */
  barrier: string
  /** What that feels like in a lesson that ignores it. */
  experience: string
  /** Concrete authoring moves that remove the barrier. */
  practices: string[]
  /** Rule ids in the audit that enforce this need. */
  enforcedBy: string[]
}

export interface ProfileGuide {
  id: FocusProfile
  label: string
  /** One line an educator can hold in their head while writing. */
  principle: string
  /** Palette key used by the UI. */
  tone: 'amber' | 'sky' | 'indigo' | 'slate'
  needs: ProfileNeed[]
  references: { label: string; url: string }[]
}

const adhd: ProfileGuide = {
  id: 'adhd',
  label: 'ADHD',
  principle: 'Short, active, and impossible to lose your place in.',
  tone: 'amber',
  needs: [
    {
      barrier: 'Sustained attention is expensive',
      experience: `A lesson that runs past ${THRESHOLDS.adhd.maxLessonMinutes} minutes usually gets abandoned partway, and the learner returns having lost the thread rather than resuming it.`,
      practices: [
        `Keep each lesson at ${THRESHOLDS.adhd.maxLessonMinutes} minutes or under — split rather than stretch.`,
        `Break the text every ${THRESHOLDS.adhd.wordsPerSection} words or so with a heading or divider.`,
        `Keep videos under ${Math.round(THRESHOLDS.adhd.maxVideoSeconds / 60)} minutes, or embed questions to reset attention.`,
      ],
      enforcedBy: ['adhd_duration', 'adhd_chunking', 'adhd_video_len'],
    },
    {
      barrier: 'Passive reading does not stick',
      experience:
        'Eyes move down the page while nothing is retained. The learner finishes the lesson and cannot say what it covered.',
      practices: [
        'Put at least one thing to *do* in every lesson — a quiz, an activity, an in-video question, or a summary task.',
        'Place the activity partway through, not only at the end.',
        'Prefer several small checks over one large assessment.',
      ],
      enforcedBy: ['adhd_active'],
    },
    {
      barrier: 'Everything on screen competes',
      experience:
        'Sidebars, progress widgets and navigation all pull equally hard. Getting back to the sentence you were reading costs real effort.',
      practices: [
        'Turn on focus mode so the lesson fills the screen alone.',
        `Never let a paragraph run past ${THRESHOLDS.adhd.maxBlockWords} words — long blocks are where people lose their line.`,
        'Bold the key term in a paragraph so re-entry after a distraction is fast.',
      ],
      enforcedBy: ['adhd_focus_mode', 'adhd_block_length'],
    },
  ],
  references: [
    {
      label: 'W3C — Making Content Usable for People with Cognitive Disabilities',
      url: 'https://www.w3.org/TR/coga-usable/',
    },
    { label: 'WCAG 2.2 — 2.2.4 Interruptions', url: 'https://www.w3.org/WAI/WCAG22/quickref/#interruptions' },
  ],
}

const autism: ProfileGuide = {
  id: 'autism',
  label: 'Autism',
  principle: 'Say exactly what you mean, and say what is coming next.',
  tone: 'sky',
  needs: [
    {
      barrier: 'Figurative language has to be decoded first',
      experience:
        '"We will hit the ground running" stops the reader cold. Working out the metaphor costs the attention that should have gone to the actual content.',
      practices: [
        'Write literally. "Start quickly" instead of "hit the ground running".',
        'Define a term the first time it appears, in the same sentence.',
        'Avoid sarcasm, rhetorical questions, and humour that depends on subtext.',
      ],
      enforcedBy: ['asd_literal'],
    },
    {
      barrier: 'Unstated expectations create anxiety, not curiosity',
      experience:
        'Starting a lesson without knowing its length, its shape, or what counts as finishing is genuinely stressful — and the stress displaces learning.',
      practices: [
        `State at least ${THRESHOLDS.autism.minObjectives} learning objectives before the content begins.`,
        `Write a plain-language summary of at least ${THRESHOLDS.autism.minSummaryWords} words that says what the lesson covers.`,
        'Say how the lesson will be assessed, in the lesson.',
      ],
      enforcedBy: ['asd_objectives', 'asd_summary'],
    },
    {
      barrier: 'Inconsistent structure has to be re-learned every time',
      experience:
        'When lesson three is laid out differently from lessons one and two, the learner spends the first minutes working out the format instead of the material.',
      practices: [
        'Use the same heading pattern in every lesson of the course.',
        'End every lesson the same way — a summary, or an explicit next step.',
        'Keep the order of media, text, and activity consistent across lessons.',
      ],
      enforcedBy: ['asd_predictable'],
    },
    {
      barrier: 'Accommodations get lost between people',
      experience:
        'A support worker or a covering educator delivers the lesson without knowing which adjustments the learner relies on.',
      practices: [
        'Record accommodations in the lesson accessibility notes, not in your head.',
        'Note anything in the lesson that has previously caused difficulty.',
      ],
      enforcedBy: ['asd_notes'],
    },
  ],
  references: [
    {
      label: 'W3C — Making Content Usable, Pattern 2.3: Use Clear Words',
      url: 'https://www.w3.org/TR/coga-usable/#use-clear-words',
    },
    {
      label: 'WCAG 2.2 — 3.1.3 Unusual Words',
      url: 'https://www.w3.org/WAI/WCAG22/quickref/#unusual-words',
    },
  ],
}

const dyslexia: ProfileGuide = {
  id: 'dyslexia',
  label: 'Dyslexia',
  principle: 'Every sentence should be easy to re-enter after looking away.',
  tone: 'indigo',
  needs: [
    {
      barrier: 'Decoding takes effort that is then unavailable for comprehension',
      experience:
        'A dense paragraph is read twice — once to decode the words, once to understand them. Long sentences run out of working memory before the verb arrives.',
      practices: [
        `Keep paragraphs under ${THRESHOLDS.dyslexia.maxParagraphWords} words.`,
        `Keep the average sentence under ${THRESHOLDS.dyslexia.maxMeanSentenceWords} words, and none over ${THRESHOLDS.dyslexia.maxSentenceWords}.`,
        `Aim for a Flesch–Kincaid grade of ${THRESHOLDS.dyslexia.defaultReadingGrade} or below unless the course sets a reading age.`,
      ],
      enforcedBy: ['dys_paragraphs', 'dys_sentences', 'dys_readability'],
    },
    {
      barrier: 'Losing your line mid-paragraph',
      experience:
        'In a wall of prose there is no landmark to return to. The reader re-reads the same line, or skips one without noticing.',
      practices: [
        `Break content over ${THRESHOLDS.dyslexia.listsExpectedAbove} words into bulleted or numbered lists.`,
        'One idea per paragraph — the paragraph break is the landmark.',
        'Use headings as signposts, not decoration.',
      ],
      enforcedBy: ['dys_lists', 'dys_paragraphs'],
    },
    {
      barrier: 'Some styling actively blurs letters together',
      experience:
        'Italics lean the letterforms into each other and underlines cut through descenders. Long runs of capitals remove the word-shape cue that fluent reading depends on.',
      practices: [
        `Keep italic and underlined text under ${Math.round(THRESHOLDS.dyslexia.maxEmphasisRatio * 100)}% of the lesson — use bold for emphasis instead.`,
        `Never run more than ${THRESHOLDS.dyslexia.maxCapsRun} words in capitals.`,
        'Left-align body text. Justified text creates uneven word gaps that form distracting "rivers".',
      ],
      enforcedBy: ['dys_emphasis', 'dys_caps'],
    },
    {
      barrier: 'Reading is not always the best channel',
      experience:
        'The same learner who struggles with a page of text may follow the identical content easily as audio — but only if the platform can actually read it aloud.',
      practices: [
        'Enable text-to-speech on the course.',
        'Never leave explanatory text inside an image — a screen reader and a TTS engine both skip it.',
        'Describe every image, so the audio version of the lesson is complete.',
      ],
      enforcedBy: ['dys_tts', 'base_alt_text'],
    },
  ],
  references: [
    {
      label: 'British Dyslexia Association — Dyslexia Style Guide',
      url: 'https://www.bdadyslexia.org.uk/advice/employers/creating-a-dyslexia-friendly-workplace/dyslexia-friendly-style-guide',
    },
    {
      label: 'WCAG 2.2 — 1.4.8 Visual Presentation',
      url: 'https://www.w3.org/WAI/WCAG22/quickref/#visual-presentation',
    },
  ],
}

const general: ProfileGuide = {
  id: 'general',
  label: 'General accessibility',
  principle: 'Meet the baseline for everyone, then pick a focus to go deeper.',
  tone: 'slate',
  needs: [
    {
      barrier: 'Content that only works in one medium',
      experience:
        'A video with no transcript is empty for anyone who cannot use audio. An undescribed image is empty for anyone who cannot see it.',
      practices: [
        'Every video gets a transcript.',
        'Every image gets a description of what it shows.',
        'Enable text-to-speech so text has an audio path.',
      ],
      enforcedBy: ['base_transcript', 'base_alt_text', 'gen_tts'],
    },
    {
      barrier: 'Structure that exists visually but not semantically',
      experience:
        'Text that merely looks like a heading cannot be navigated to. Learners using assistive technology cannot skim the lesson at all.',
      practices: [
        'Use real heading levels, in order, without skipping.',
        'Write link text that makes sense read on its own.',
      ],
      enforcedBy: ['base_headings', 'base_link_text'],
    },
    {
      barrier: 'No way to plan around the lesson',
      experience:
        'Without a stated duration or objective, a learner cannot judge whether they have the time or the energy for this lesson right now.',
      practices: [
        'Set an estimated duration on every lesson.',
        'State what the learner will be able to do afterwards.',
      ],
      enforcedBy: ['base_duration', 'gen_objectives'],
    },
    {
      barrier: 'A generic course helps no one in particular',
      experience:
        'Baseline compliance clears the legal bar but does not adapt to how any specific learner actually struggles.',
      practices: [
        'Set a Primary Accessibility Focus on the course to unlock the targeted standards for ADHD, autism or dyslexia.',
      ],
      enforcedBy: [],
    },
  ],
  references: [
    { label: 'WCAG 2.2 quick reference', url: 'https://www.w3.org/WAI/WCAG22/quickref/' },
    {
      label: 'W3C — Making Content Usable for People with Cognitive Disabilities',
      url: 'https://www.w3.org/TR/coga-usable/',
    },
  ],
}

export const PROFILE_GUIDES: Record<FocusProfile, ProfileGuide> = {
  adhd,
  autism,
  dyslexia,
  general,
}

/** Normalises whatever is stored on the course into a known profile. */
export function resolveFocus(raw: string | null | undefined): FocusProfile {
  const value = (raw ?? '').toLowerCase().trim()
  if (value === 'adhd') return 'adhd'
  if (value === 'autism' || value === 'asd') return 'autism'
  if (value === 'dyslexia') return 'dyslexia'
  return 'general'
}

export function getProfileGuide(raw: string | null | undefined): ProfileGuide {
  return PROFILE_GUIDES[resolveFocus(raw)]
}
