/**
 * Deterministic accessibility auditor.
 *
 * Every rule here is a fixed threshold with a published source behind it — no
 * model, no network, no randomness. The same lesson always produces the same
 * score, which is what makes the result defensible to an educator (and citable
 * in a report).
 *
 * This module is intentionally pure and synchronous: it takes a plain object
 * and returns a plain object. That is what lets the lesson editor re-run it on
 * every edit against *unsaved* form state, while the course report runs the
 * exact same rules against rows fetched from the database. Both surfaces agree
 * by construction.
 */

export type FocusProfile = 'adhd' | 'autism' | 'dyslexia' | 'general'

export type RuleSeverity = 'required' | 'recommended'

/** `not_applicable` matters: "no video, so the transcript rule cannot fail". */
export type RuleStatus = 'pass' | 'fail' | 'not_applicable'

/** Tabs in the lesson editor, so a finding can point at the control that fixes it. */
export type AuditTab =
  | 'basics'
  | 'content'
  | 'media'
  | 'activities'
  | 'quiz'
  | 'assets'
  | 'settings'
  | 'accessibility'

// ─── Thresholds ────────────────────────────────────────────────────────
// Exported so the educator-facing guide shows the same numbers the engine
// enforces, and so there is exactly one place to tune them.

export const THRESHOLDS = {
  /** Minimum words (or a video) before a lesson counts as having content. */
  minLessonWords: 50,
  /** Word count above which a lesson is expected to use headings. */
  headingsRequiredAbove: 200,
  /** Empty paragraphs tolerated before they read as manual spacing. */
  maxSpacerParagraphs: 3,

  adhd: {
    /** Minutes. One sustained attention block. */
    maxLessonMinutes: 20,
    /** Words in a single unbroken block before a break is expected. */
    maxBlockWords: 150,
    /** Words of content per expected section break. */
    wordsPerSection: 400,
    /** Seconds of video before in-video questions are expected. */
    maxVideoSeconds: 360,
  },

  autism: {
    /** Words before a simplified summary counts as written. */
    minSummaryWords: 15,
    /** Distinct objectives expected. */
    minObjectives: 2,
  },

  dyslexia: {
    /** Words in one paragraph. */
    maxParagraphWords: 80,
    /** Words in one sentence. */
    maxSentenceWords: 30,
    /** Mean words per sentence across the lesson. */
    maxMeanSentenceWords: 20,
    /** Flesch–Kincaid grade level when the course sets no reading age. */
    defaultReadingGrade: 8,
    /** Share of body text allowed to be italic or underlined. */
    maxEmphasisRatio: 0.15,
    /** Words above which lists are expected. */
    listsExpectedAbove: 300,
    /** Consecutive ALL-CAPS words before it reads as shouting. */
    maxCapsRun: 4,
  },

  general: {
    maxParagraphWords: 120,
  },
} as const

/** Where each rule's threshold comes from. Shown in the UI and citable. */
export const RULE_SOURCES: Record<string, string> = {
  base_content: 'WCAG 2.2 — 1.3.1 Info and Relationships',
  base_alt_text: 'WCAG 2.2 — 1.1.1 Non-text Content (Level A)',
  base_headings: 'WCAG 2.2 — 2.4.6 Headings and Labels (Level AA)',
  base_transcript: 'WCAG 2.2 — 1.2.1 Audio-only and Video-only (Level A)',
  base_link_text: 'WCAG 2.2 — 2.4.4 Link Purpose in Context (Level A)',
  base_duration: 'W3C COGA — Making Content Usable, Objective 5',
  base_spacer_paragraphs: 'WCAG 2.2 — 1.3.1 Info and Relationships (Level A)',

  adhd_duration: 'W3C COGA — Pattern 5.1: Break content into short sections',
  adhd_focus_mode: 'WCAG 2.2 — 2.2.4 Interruptions (Level AAA)',
  adhd_chunking: 'W3C COGA — Pattern 4.2: Chunk information',
  adhd_active: 'W3C COGA — Objective 6: Do not rely on memory',
  adhd_block_length: 'W3C COGA — Pattern 4.2: Chunk information',
  adhd_video_len: 'W3C COGA — Objective 5: Help users focus',

  asd_summary: 'W3C COGA — Pattern 3.1: Provide a summary of the content',
  asd_objectives: 'W3C COGA — Pattern 6.1: Make expectations clear up front',
  asd_predictable: 'WCAG 2.2 — 3.2.3 Consistent Navigation (Level AA)',
  asd_literal: 'W3C COGA — Pattern 2.3: Avoid figures of speech',
  asd_notes: 'W3C COGA — Objective 8: Support adaptation',

  dys_paragraphs: 'British Dyslexia Association — Dyslexia Style Guide',
  dys_sentences: 'British Dyslexia Association — Dyslexia Style Guide',
  dys_readability: 'Kincaid et al. (1975) — Flesch–Kincaid Grade Level',
  dys_emphasis: 'British Dyslexia Association — avoid italics and underlining',
  dys_lists: 'British Dyslexia Association — prefer bullet points to prose',
  dys_caps: 'British Dyslexia Association — avoid blocks of capital letters',
  dys_tts: 'WCAG 2.2 — 1.4.5 Images of Text (Level AA)',

  gen_tts: 'WCAG 2.2 — 1.4.5 Images of Text (Level AA)',
  gen_objectives: 'W3C COGA — Pattern 6.1: Make expectations clear up front',
  gen_paragraphs: 'W3C COGA — Pattern 4.2: Chunk information',
}

// ─── Text analysis helpers ─────────────────────────────────────────────
// All of these operate on text extracted from HTML, never on the markup
// itself — otherwise tag names and attribute values pollute the counts.

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
}

function decodeEntities(input: string): string {
  return input
    .replace(/&([a-z]+);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole)
    .replace(/&#(\d+);/g, (_whole, code: string) => String.fromCharCode(Number(code)))
}

/** Visible text of an HTML fragment, whitespace-collapsed. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return ''
  const withoutCode = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  return decodeEntities(withoutCode.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu

export function extractWords(text: string): string[] {
  if (!text) return []
  return text.match(WORD_RE) ?? []
}

export function countWords(text: string): number {
  return extractWords(text).length
}

/**
 * Split into sentences. Common abbreviations are masked first so "e.g." does
 * not read as a sentence boundary and flatter the readability score.
 */
const ABBREVIATIONS = /\b(?:e\.g|i\.e|etc|vs|approx|Dr|Mr|Mrs|Ms|Prof|Fig|No|St|Jr|Sr)\./gi
const DOT_PLACEHOLDER = '\u0001'

export function splitSentences(text: string): string[] {
  if (!text) return []
  const masked = text.replace(ABBREVIATIONS, (match) => match.replace(/\./g, DOT_PLACEHOLDER))
  const pieces = masked.match(/[^.!?]+[.!?]*/g) ?? []
  return pieces
    .map((piece) => piece.split(DOT_PLACEHOLDER).join('.').trim())
    .filter((piece) => countWords(piece) > 0)
}

/**
 * Syllable estimate for English words. This is the standard vowel-group
 * heuristic used by every Flesch implementation — approximate by design, but
 * identical on every run.
 */
export function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!clean) return 0
  if (clean.length <= 3) return 1
  const trimmed = clean.replace(/(?:[^laeiouy]es|[^laeiouy]e|ed)$/, '').replace(/^y/, '')
  const groups = trimmed.match(/[aeiouy]{1,2}/g)
  return Math.max(1, groups ? groups.length : 1)
}

/**
 * Flesch–Kincaid Grade Level (Kincaid et al., 1975).
 * Returns null when the sample is too small for the formula to mean anything.
 * The formula is calibrated on English, so the caller should say so in the UI.
 */
export function fleschKincaidGrade(text: string): number | null {
  const words = extractWords(text)
  const sentences = splitSentences(text)
  if (words.length < 30 || sentences.length === 0) return null
  const syllables = words.reduce((total, word) => total + countSyllables(word), 0)
  const grade =
    0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59
  return Math.round(Math.max(0, grade) * 10) / 10
}

export interface TextBlock {
  /** Human label used in findings, e.g. "Paragraph 3". */
  label: string
  tag: string
  text: string
  words: number
}

/**
 * Paragraph-like blocks. Falls back to treating the whole fragment as one
 * block when the content has no block markup at all (plain-text lessons).
 */
export function extractBlocks(html: string | null | undefined): TextBlock[] {
  if (!html) return []
  const blocks: TextBlock[] = []
  const counters: Record<string, number> = {}
  const labels: Record<string, string> = {
    p: 'Paragraph',
    li: 'List item',
    blockquote: 'Quote',
    td: 'Table cell',
  }
  const re = /<(p|li|blockquote|td)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    const tag = match[1].toLowerCase()
    const text = htmlToText(match[2])
    if (!text) continue
    counters[tag] = (counters[tag] ?? 0) + 1
    blocks.push({
      label: `${labels[tag] ?? tag} ${counters[tag]}`,
      tag,
      text,
      words: countWords(text),
    })
  }
  if (blocks.length === 0) {
    const text = htmlToText(html)
    if (text) blocks.push({ label: 'Lesson text', tag: 'text', text, words: countWords(text) })
  }
  return blocks
}

export interface HeadingInfo {
  level: number
  text: string
}

export function extractHeadings(html: string | null | undefined): HeadingInfo[] {
  if (!html) return []
  const out: HeadingInfo[] = []
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    const text = htmlToText(match[2])
    if (text) out.push({ level: Number(match[1]), text })
  }
  return out
}

export interface ImageInfo {
  /** null when the alt attribute is absent entirely. */
  alt: string | null
  src: string
}

export function extractImages(html: string | null | undefined): ImageInfo[] {
  if (!html) return []
  const out: ImageInfo[] = []
  const re = /<img\b[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    const tag = match[0]
    const altMatch = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag)
    const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag)
    out.push({
      alt: altMatch ? decodeEntities(altMatch[1] ?? altMatch[2] ?? altMatch[3] ?? '') : null,
      src: srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? '') : '',
    })
  }
  return out
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Writes alt text onto the nth `<img>` of a fragment, replacing any existing
 * alt attribute. Index matches the order `extractImages` returns, so the panel
 * can list undescribed images and patch the one the educator typed into.
 */
export function setImageAlt(html: string, index: number, alt: string): string {
  let seen = -1
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    seen += 1
    if (seen !== index) return tag
    const escaped = escapeAttribute(alt)
    if (/\balt\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i.test(tag)) {
      return tag.replace(/\balt\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, `alt="${escaped}"`)
    }
    return tag.replace(/^<img/i, `<img alt="${escaped}"`)
  })
}

/**
 * Learning objectives have been stored three different ways over the life of
 * this database: a real array, a JSON array serialised into the TEXT column by
 * the seed script, and plain newline-separated text from the editor. Everything
 * that reads the field goes through here so all three render the same.
 */
export function parseObjectives(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry).trim()).filter(Boolean)
  }
  const text = String(raw).trim()
  if (!text) return []
  if (text.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(text)
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry).trim()).filter(Boolean)
      }
    } catch {
      // Not valid JSON after all — fall through and treat it as plain text.
    }
  }
  return text
    .split(/\r?\n|;/)
    .map((line) => line.replace(/^[\s•*\-\d.)]+/, '').trim())
    .filter(Boolean)
}

/** Canonical storage form: one objective per line. */
export function objectivesToText(raw: unknown): string {
  return parseObjectives(raw).join('\n')
}

export interface LinkInfo {
  text: string
  href: string
}

export function extractLinks(html: string | null | undefined): LinkInfo[] {
  if (!html) return []
  const out: LinkInfo[] = []
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    const hrefMatch = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(match[1])
    out.push({
      text: htmlToText(match[2]),
      href: hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? '') : '',
    })
  }
  return out
}

/** Link text that tells the reader nothing about where it goes. */
const VAGUE_LINK_TEXT = new Set([
  'click here',
  'here',
  'this',
  'this link',
  'link',
  'read more',
  'more',
  'learn more',
  'see more',
  'go',
  'download',
  'click',
  'klik sini',
  'di sini',
  'sini',
  'baca lagi',
  'lagi',
])

export function findVagueLinks(html: string | null | undefined): LinkInfo[] {
  return extractLinks(html).filter((link) => {
    const normalised = link.text.toLowerCase().replace(/[.!?:,]+$/, '').trim()
    if (!normalised) return true
    if (VAGUE_LINK_TEXT.has(normalised)) return true
    return /^https?:\/\//i.test(normalised)
  })
}

/** Share of visible text wrapped in italic or underline markup. */
export function emphasisRatio(html: string | null | undefined): number {
  if (!html) return 0
  const total = htmlToText(html).length
  if (total === 0) return 0
  let emphasised = 0
  const re = /<(i|em|u)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    emphasised += htmlToText(match[2]).length
  }
  return Math.min(1, emphasised / total)
}

/** Runs of consecutive fully-capitalised words, e.g. "READ THIS SECTION NOW". */
export function findCapsRuns(text: string, maxRun: number): string[] {
  const tokens = text.split(/\s+/).filter(Boolean)
  const runs: string[] = []
  let current: string[] = []
  const isShout = (token: string) => {
    const letters = token.replace(/[^\p{L}]/gu, '')
    return letters.length >= 2 && letters === letters.toUpperCase() && /\p{Lu}/u.test(letters)
  }
  const flush = () => {
    if (current.length > maxRun) runs.push(current.join(' '))
    current = []
  }
  for (const token of tokens) {
    if (isShout(token)) current.push(token)
    else flush()
  }
  flush()
  return runs
}

/**
 * Figures of speech that a literal reader has to decode before they can learn
 * anything. English and Malay, because the platform ships both locales.
 */
export const IDIOMS: { phrase: string; plain: string }[] = [
  { phrase: 'in a nutshell', plain: 'in short' },
  { phrase: 'piece of cake', plain: 'easy' },
  { phrase: 'hit the ground running', plain: 'start quickly' },
  { phrase: 'break a leg', plain: 'good luck' },
  { phrase: 'under the weather', plain: 'unwell' },
  { phrase: 'on the same page', plain: 'in agreement' },
  { phrase: 'ballpark figure', plain: 'rough estimate' },
  { phrase: 'ball is in your court', plain: 'it is your turn to act' },
  { phrase: 'bite the bullet', plain: 'accept something difficult' },
  { phrase: 'cut corners', plain: 'skip important steps' },
  { phrase: 'rule of thumb', plain: 'general guideline' },
  { phrase: 'touch base', plain: 'check in' },
  { phrase: 'back to square one', plain: 'start again' },
  { phrase: 'at the end of the day', plain: 'in the end' },
  { phrase: 'food for thought', plain: 'something to think about' },
  { phrase: 'think outside the box', plain: 'try a new approach' },
  { phrase: 'the bottom line', plain: 'the main point' },
  { phrase: 'in the same boat', plain: 'in the same situation' },
  { phrase: 'get the hang of', plain: 'learn how to use' },
  { phrase: 'down the road', plain: 'later' },
  { phrase: 'a walk in the park', plain: 'easy' },
  { phrase: 'burn the midnight oil', plain: 'work late' },
  { phrase: 'ringan tulang', plain: 'rajin' },
  { phrase: 'berat tulang', plain: 'malas' },
  { phrase: 'buah tangan', plain: 'hadiah' },
  { phrase: 'buah hati', plain: 'orang yang disayangi' },
  { phrase: 'buah fikiran', plain: 'idea' },
  { phrase: 'besar kepala', plain: 'sombong' },
  { phrase: 'kepala angin', plain: 'cepat berubah perasaan' },
  { phrase: 'naik darah', plain: 'marah' },
  { phrase: 'makan hati', plain: 'sedih' },
  { phrase: 'putih mata', plain: 'kecewa' },
  { phrase: 'otak udang', plain: 'lambat faham' },
  { phrase: 'cakar ayam', plain: 'tulisan yang sukar dibaca' },
  { phrase: 'muka tembok', plain: 'tidak tahu malu' },
  { phrase: 'panjang tangan', plain: 'suka mencuri' },
  { phrase: 'lintah darat', plain: 'pemberi pinjaman haram' },
  { phrase: 'kaki bangku', plain: 'tidak mahir bersukan' },
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Runs of empty paragraphs used as vertical spacers.
 *
 * Educators reach for repeated Enter presses to push text clear of a floated
 * image. A screen reader announces each one as a blank line, and the spacing
 * breaks the moment the layout reflows — so the gap it buys is both noisy and
 * fragile.
 */
export function countSpacerParagraphs(html: string | null | undefined): number {
  if (!html) return 0
  const empties = html.match(/<p[^>]*>(?:\s|&nbsp;|<br[^>]*>)*<\/p>/gi)
  return empties ? empties.length : 0
}

/** Strips empty spacer paragraphs while leaving real content untouched. */
export function removeSpacerParagraphs(html: string): string {
  return html.replace(/<p[^>]*>(?:\s|&nbsp;|<br[^>]*>)*<\/p>/gi, '')
}

export function findIdioms(text: string): { phrase: string; plain: string }[] {
  if (!text) return []
  return IDIOMS.filter(({ phrase }) =>
    new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i').test(text),
  )
}

// ─── Audit contract ────────────────────────────────────────────────────

/** Course-level switches the lesson rules need to know about. */
export interface CourseAccessibilitySupport {
  supports_tts: boolean
  supports_focus_mode: boolean
  supports_chunked_learning: boolean
  learning_streaks_enabled: boolean
  chapter_organization_enabled: boolean
  /** Target reading age in years; the grade target is this minus 5. */
  target_reading_age: number | null
}

export const DEFAULT_COURSE_SUPPORT: CourseAccessibilitySupport = {
  supports_tts: false,
  supports_focus_mode: false,
  supports_chunked_learning: false,
  learning_streaks_enabled: false,
  chapter_organization_enabled: false,
  target_reading_age: null,
}

/**
 * Everything the engine needs about one lesson. Deliberately a plain shape
 * rather than a database row, so the editor can build it from unsaved state.
 */
export interface LessonAuditSubject {
  title: string
  content_html: string
  video_url: string
  transcript: string
  estimated_duration: number
  learning_objectives: string
  accessibility_notes: string
  simplified_summary: string
  focus_mode_enabled: boolean
  chunked_content_enabled: boolean
  has_summary_activity: boolean
  has_quiz: boolean
  /** Interactive activities attached, counted in memory before any save. */
  interactiveCount: number
  videoQuestionCount: number
  /** Known video length in seconds, when the player has reported it. */
  videoSeconds: number | null
}

export const EMPTY_SUBJECT: LessonAuditSubject = {
  title: '',
  content_html: '',
  video_url: '',
  transcript: '',
  estimated_duration: 0,
  learning_objectives: '',
  accessibility_notes: '',
  simplified_summary: '',
  focus_mode_enabled: false,
  chunked_content_enabled: false,
  has_summary_activity: false,
  has_quiz: false,
  interactiveCount: 0,
  videoQuestionCount: 0,
  videoSeconds: null,
}

/**
 * A one-click correction.
 *
 * Lesson-scoped fixes return a patch for the *form* — they never write to the
 * database, because the lesson may not be saved yet and the educator may still
 * cancel. Course-scoped fixes flip a course setting, which is a deliberate
 * immediate write and is labelled as such in the UI.
 */
export interface AuditFix {
  label: string
  scope: 'lesson' | 'course'
  /** Shown in a confirm dialog first when the fix rewrites authored content. */
  confirm?: string
  lessonPatch?: (subject: LessonAuditSubject) => Record<string, unknown>
  coursePatch?: Record<string, boolean>
}

export interface AuditRule {
  id: string
  title: string
  weight: number
  severity: RuleSeverity
  status: RuleStatus
  /** The published standard this threshold comes from. */
  source: string
  /** What the standard asks for. Shown whether the rule passes or not. */
  requirement: string
  /** The specific finding for this lesson, quoting real content. */
  detail: string
  /** Which editor tab holds the control that resolves this. */
  tab: AuditTab
  /** Measured value against its target, when the rule is numeric. */
  metric?: { value: number; target: number; unit: string; direction: 'max' | 'min' }
  fix?: AuditFix
}

export interface LessonAuditResult {
  focus: FocusProfile
  /** 0–100, weighted over applicable rules only. */
  score: number
  passed: number
  applicable: number
  rules: AuditRule[]
  failures: AuditRule[]
  requiredFailures: AuditRule[]
  /** Tabs that own at least one failing rule, for the sidebar markers. */
  tabsNeedingAttention: AuditTab[]
}

// ─── Rule construction helpers ─────────────────────────────────────────

interface RuleSeed {
  id: string
  title: string
  weight: number
  severity: RuleSeverity
  requirement: string
  tab: AuditTab
  status: RuleStatus
  detail: string
  metric?: AuditRule['metric']
  fix?: AuditFix
}

function rule(seed: RuleSeed): AuditRule {
  return { ...seed, source: RULE_SOURCES[seed.id] ?? 'Internal platform standard' }
}

/** Joins a list of offenders into a readable clause, capped so cards stay short. */
function nameList(items: string[], limit = 3): string {
  if (items.length <= limit) return items.join(', ')
  return `${items.slice(0, limit).join(', ')} and ${items.length - limit} more`
}

/**
 * Counting objectives goes through the shared parser so a lesson whose field
 * still holds a JSON array from the seed script counts as three objectives, not
 * as one unreadable line.
 */
const objectiveLines = parseObjectives

/** Builds an objectives skeleton from the lesson's own headings. */
function seedObjectives(subject: LessonAuditSubject): string {
  const headings = extractHeadings(subject.content_html).filter((h) => h.level >= 2)
  const points = headings.length > 0 ? headings.map((h) => h.text) : [subject.title || 'this topic']
  return ['By the end of this lesson you will be able to:', ...points.map((p) => `- Explain ${p}`)]
    .join('\n')
}

function seedSummary(subject: LessonAuditSubject): string {
  const headings = extractHeadings(subject.content_html).filter((h) => h.level >= 2)
  if (headings.length === 0) {
    const first = splitSentences(htmlToText(subject.content_html))[0]
    return first ? `In short: ${first}` : ''
  }
  return `This lesson covers ${nameList(headings.map((h) => h.text.toLowerCase()), 4)}.`
}

/** Words per minute used to estimate reading time. */
const READING_WPM = 200

function estimateDuration(subject: LessonAuditSubject): number {
  const words = countWords(htmlToText(subject.content_html))
  const readingMinutes = words / READING_WPM
  const videoMinutes = subject.videoSeconds ? subject.videoSeconds / 60 : 0
  return Math.max(1, Math.ceil(readingMinutes + videoMinutes))
}

/**
 * Whether an estimate would actually mean anything.
 *
 * Reading time is derived from the word count, but video length dominates any
 * lesson that has one — and the player only reports it after it has loaded. If
 * we estimated anyway we would confidently suggest "1 minute" for a ten-minute
 * video, which is worse than offering nothing.
 */
function canEstimateDuration(subject: LessonAuditSubject): boolean {
  if (!subject.video_url.trim()) return true
  return subject.videoSeconds !== null && subject.videoSeconds > 0
}

/** Strips italic and underline markup while keeping the words inside it. */
function stripEmphasis(html: string): string {
  return html.replace(/<\/?(i|em|u)\b[^>]*>/gi, '')
}

/** Rewrites shouted runs as sentence case, touching text only — never markup. */
function calmCapitals(html: string): string {
  return html
    .split(/(<[^>]*>)/)
    .map((segment) => {
      if (segment.startsWith('<')) return segment
      return segment.replace(/(\b[\p{Lu}][\p{Lu}’']{1,}\b(?:\s+\b[\p{Lu}][\p{Lu}’']{1,}\b){4,})/gu, (run) =>
        run
          .toLowerCase()
          .replace(/^(\s*)(\p{Ll})/u, (_m, space: string, letter: string) => space + letter.toUpperCase()),
      )
    })
    .join('')
}

// ─── Rule sets ─────────────────────────────────────────────────────────

function baselineRules(
  subject: LessonAuditSubject,
  text: string,
  blocks: TextBlock[],
): AuditRule[] {
  const words = countWords(text)
  const hasVideo = Boolean(subject.video_url.trim())
  const images = extractImages(subject.content_html)
  const headings = extractHeadings(subject.content_html)
  const vagueLinks = findVagueLinks(subject.content_html)
  const rules: AuditRule[] = []

  rules.push(
    rule({
      id: 'base_content',
      title: 'Lesson has teachable content',
      weight: 10,
      severity: 'required',
      requirement: `At least ${THRESHOLDS.minLessonWords} words of text, or a video.`,
      tab: 'content',
      status: words >= THRESHOLDS.minLessonWords || hasVideo ? 'pass' : 'fail',
      detail:
        words >= THRESHOLDS.minLessonWords || hasVideo
          ? `${words} words${hasVideo ? ' plus a video' : ''}.`
          : `Only ${words} words and no video. Learners have nothing to work from yet.`,
      metric: { value: words, target: THRESHOLDS.minLessonWords, unit: 'words', direction: 'min' },
    }),
  )

  const missingAlt = images.filter((img) => img.alt === null || img.alt.trim() === '')
  rules.push(
    rule({
      id: 'base_alt_text',
      title: 'Images have alternative text',
      weight: 12,
      severity: 'required',
      requirement: 'Every image carries a short description of what it shows.',
      tab: 'content',
      status: images.length === 0 ? 'not_applicable' : missingAlt.length === 0 ? 'pass' : 'fail',
      detail:
        images.length === 0
          ? 'This lesson has no images.'
          : missingAlt.length === 0
            ? `All ${images.length} image${images.length === 1 ? '' : 's'} described.`
            : `${missingAlt.length} of ${images.length} image${images.length === 1 ? '' : 's'} ${missingAlt.length === 1 ? 'has' : 'have'} no description. A screen reader announces these as "image" and nothing else.`,
    }),
  )

  const skips: string[] = []
  let previous = 0
  for (const heading of headings) {
    if (previous > 0 && heading.level > previous + 1) {
      skips.push(`h${previous} jumps to h${heading.level} at "${heading.text}"`)
    }
    previous = heading.level
  }
  const needsHeadings = words > THRESHOLDS.headingsRequiredAbove
  const headingStatus: RuleStatus =
    !needsHeadings && headings.length === 0
      ? 'not_applicable'
      : headings.length > 0 && skips.length === 0
        ? 'pass'
        : 'fail'
  rules.push(
    rule({
      id: 'base_headings',
      title: 'Logical heading structure',
      weight: 10,
      severity: 'required',
      requirement: `Content over ${THRESHOLDS.headingsRequiredAbove} words uses headings, and heading levels never skip.`,
      tab: 'content',
      status: headingStatus,
      detail:
        headingStatus === 'not_applicable'
          ? 'This lesson is short enough not to need headings.'
          : headings.length === 0
            ? `${words} words with no headings. Learners cannot skim or navigate the lesson.`
            : skips.length > 0
              ? `Heading levels skip: ${nameList(skips)}.`
              : `${headings.length} heading${headings.length === 1 ? '' : 's'}, no skipped levels.`,
    }),
  )

  const hasTranscript = countWords(subject.transcript) > 0
  rules.push(
    rule({
      id: 'base_transcript',
      title: 'Video has a transcript',
      weight: 12,
      severity: 'required',
      requirement: 'Any video is accompanied by a text transcript.',
      tab: 'media',
      status: !hasVideo ? 'not_applicable' : hasTranscript ? 'pass' : 'fail',
      detail: !hasVideo
        ? 'This lesson has no video.'
        : hasTranscript
          ? `Transcript present (${countWords(subject.transcript)} words).`
          : 'This lesson has a video but no transcript. Learners who cannot use audio get nothing from it.',
    }),
  )

  const links = extractLinks(subject.content_html)
  rules.push(
    rule({
      id: 'base_link_text',
      title: 'Links describe where they go',
      weight: 8,
      severity: 'recommended',
      requirement: 'Link text makes sense on its own, without the sentence around it.',
      tab: 'content',
      status: links.length === 0 ? 'not_applicable' : vagueLinks.length === 0 ? 'pass' : 'fail',
      detail:
        links.length === 0
          ? 'This lesson has no links.'
          : vagueLinks.length === 0
            ? `All ${links.length} link${links.length === 1 ? '' : 's'} are self-describing.`
            : `${vagueLinks.length} vague link${vagueLinks.length === 1 ? '' : 's'}: ${nameList(vagueLinks.map((l) => `"${l.text || l.href}"`))}.`,
    }),
  )

  rules.push(
    rule({
      id: 'base_duration',
      title: 'Estimated time is set',
      weight: 8,
      severity: 'recommended',
      requirement: 'Learners can see how long the lesson takes before they start.',
      tab: 'settings',
      status: subject.estimated_duration > 0 ? 'pass' : 'fail',
      detail:
        subject.estimated_duration > 0
          ? `${subject.estimated_duration} minutes.`
          : canEstimateDuration(subject)
            ? 'No estimated time set, so learners cannot plan a session around this lesson.'
            : 'No estimated time set. The video length is still loading, so enter the time yourself.',
      fix:
        subject.estimated_duration > 0 || !canEstimateDuration(subject)
          ? undefined
          : {
              label: 'Estimate it',
              scope: 'lesson',
              lessonPatch: (s) => ({ estimated_duration: estimateDuration(s) }),
            },
    }),
  )

  const spacers = countSpacerParagraphs(subject.content_html)
  rules.push(
    rule({
      id: 'base_spacer_paragraphs',
      title: 'Spacing comes from layout, not blank lines',
      weight: 8,
      severity: 'recommended',
      requirement: `Fewer than ${THRESHOLDS.maxSpacerParagraphs} empty paragraphs used as vertical spacers.`,
      tab: 'content',
      status: spacers < THRESHOLDS.maxSpacerParagraphs ? 'pass' : 'fail',
      detail:
        spacers < THRESHOLDS.maxSpacerParagraphs
          ? spacers === 0
            ? 'No empty spacer paragraphs.'
            : `${spacers} empty paragraph${spacers === 1 ? '' : 's'} — within tolerance.`
          : `${spacers} empty paragraphs are being used to push content around. A screen reader reads each as a blank line, and the spacing collapses as soon as the layout reflows.`,
      metric: {
        value: spacers,
        target: THRESHOLDS.maxSpacerParagraphs,
        unit: 'blank paragraphs',
        direction: 'max',
      },
      fix:
        spacers < THRESHOLDS.maxSpacerParagraphs
          ? undefined
          : {
              label: 'Remove blank lines',
              scope: 'lesson',
              confirm:
                'This removes the empty paragraphs being used as spacers. Your text and images stay exactly as they are. Continue?',
              lessonPatch: (s) => ({ content_html: removeSpacerParagraphs(s.content_html) }),
            },
    }),
  )

  void blocks
  return rules
}

function adhdRules(
  subject: LessonAuditSubject,
  text: string,
  blocks: TextBlock[],
  support: CourseAccessibilitySupport,
): AuditRule[] {
  const t = THRESHOLDS.adhd
  const words = countWords(text)
  const headings = extractHeadings(subject.content_html)
  const sectionBreaks = headings.length + (subject.content_html.match(/<hr\b/gi) ?? []).length
  const expectedBreaks = Math.floor(words / t.wordsPerSection)
  const longBlocks = blocks.filter((b) => b.tag !== 'li' && b.words > t.maxBlockWords)
  const activeCount =
    subject.interactiveCount +
    (subject.has_quiz ? 1 : 0) +
    (subject.has_summary_activity ? 1 : 0) +
    subject.videoQuestionCount
  const hasVideo = Boolean(subject.video_url.trim())

  return [
    rule({
      id: 'adhd_duration',
      title: 'Fits one attention session',
      weight: 14,
      severity: 'required',
      requirement: `Lessons run ${t.maxLessonMinutes} minutes or less.`,
      tab: 'settings',
      status:
        subject.estimated_duration <= 0
          ? 'fail'
          : subject.estimated_duration <= t.maxLessonMinutes
            ? 'pass'
            : 'fail',
      detail:
        subject.estimated_duration <= 0
          ? 'No estimated time set, so this cannot be checked.'
          : subject.estimated_duration <= t.maxLessonMinutes
            ? `${subject.estimated_duration} minutes — within one focus session.`
            : `${subject.estimated_duration} minutes is past the point where attention typically drops. Consider splitting this into two lessons.`,
      metric: {
        value: subject.estimated_duration,
        target: t.maxLessonMinutes,
        unit: 'min',
        direction: 'max',
      },
    }),
    rule({
      id: 'adhd_focus_mode',
      title: 'Distraction-free focus mode',
      weight: 10,
      severity: 'required',
      requirement: 'Focus mode is on, so the lesson hides sidebars and other pull-aways.',
      tab: 'settings',
      status: subject.focus_mode_enabled ? 'pass' : 'fail',
      detail: subject.focus_mode_enabled
        ? support.supports_focus_mode
          ? 'On for this lesson, and enabled on the course.'
          : 'On for this lesson, but the course-level switch is still off — turn it on in course settings for it to take effect.'
        : 'Off. Learners see the full interface, including everything competing for their attention.',
      fix: subject.focus_mode_enabled
        ? undefined
        : {
            label: 'Turn on',
            scope: 'lesson',
            lessonPatch: () => ({ focus_mode_enabled: true }),
          },
    }),
    rule({
      id: 'adhd_chunking',
      title: 'Content broken into chunks',
      weight: 12,
      severity: 'required',
      requirement: `Chunked view is on and there is a section break roughly every ${t.wordsPerSection} words.`,
      tab: 'content',
      status:
        subject.chunked_content_enabled && sectionBreaks >= expectedBreaks ? 'pass' : 'fail',
      detail: !subject.chunked_content_enabled
        ? 'Chunked view is off, so the whole lesson arrives as one scroll.'
        : sectionBreaks >= expectedBreaks
          ? `Chunked view on, ${sectionBreaks} section break${sectionBreaks === 1 ? '' : 's'} across ${words} words.`
          : `${words} words but only ${sectionBreaks} section break${sectionBreaks === 1 ? '' : 's'}. Add headings or dividers to reach about ${expectedBreaks}.`,
      metric: { value: sectionBreaks, target: expectedBreaks, unit: 'breaks', direction: 'min' },
      fix: subject.chunked_content_enabled
        ? undefined
        : {
            label: 'Turn on',
            scope: 'lesson',
            lessonPatch: () => ({ chunked_content_enabled: true }),
          },
    }),
    rule({
      id: 'adhd_active',
      title: 'Something to do, not just read',
      weight: 14,
      severity: 'required',
      requirement: 'At least one quiz, activity, in-video question, or summary task.',
      tab: 'activities',
      status: activeCount > 0 ? 'pass' : 'fail',
      detail:
        activeCount > 0
          ? `${activeCount} active element${activeCount === 1 ? '' : 's'} in this lesson.`
          : 'Passive reading only. Attention holds far better when learners have to act on the material.',
    }),
    rule({
      id: 'adhd_block_length',
      title: 'No unbroken wall of text',
      weight: 10,
      severity: 'recommended',
      requirement: `No single paragraph runs past ${t.maxBlockWords} words.`,
      tab: 'content',
      status: blocks.length === 0 ? 'not_applicable' : longBlocks.length === 0 ? 'pass' : 'fail',
      detail:
        blocks.length === 0
          ? 'No text content to check.'
          : longBlocks.length === 0
            ? `Longest paragraph is ${Math.max(0, ...blocks.map((b) => b.words))} words.`
            : `${nameList(longBlocks.map((b) => `${b.label} (${b.words} words)`))} — over the ${t.maxBlockWords}-word limit.`,
    }),
    rule({
      id: 'adhd_video_len',
      title: 'Video holds attention',
      weight: 8,
      severity: 'recommended',
      requirement: `Video runs under ${Math.round(t.maxVideoSeconds / 60)} minutes, or has questions embedded in it.`,
      tab: 'media',
      status: !hasVideo
        ? 'not_applicable'
        : subject.videoSeconds === null
          ? 'not_applicable'
          : subject.videoSeconds <= t.maxVideoSeconds || subject.videoQuestionCount > 0
            ? 'pass'
            : 'fail',
      detail: !hasVideo
        ? 'This lesson has no video.'
        : subject.videoSeconds === null
          ? 'Video length is not known yet, so this cannot be checked.'
          : subject.videoSeconds <= t.maxVideoSeconds
            ? `${Math.round(subject.videoSeconds / 60)} minutes — short enough to watch in one go.`
            : subject.videoQuestionCount > 0
              ? `${Math.round(subject.videoSeconds / 60)} minutes, broken up by ${subject.videoQuestionCount} in-video question${subject.videoQuestionCount === 1 ? '' : 's'}.`
              : `${Math.round(subject.videoSeconds / 60)} minutes with nothing to do along the way. Add in-video questions to break it up.`,
    }),
  ]
}

function autismRules(
  subject: LessonAuditSubject,
  text: string,
  blocks: TextBlock[],
): AuditRule[] {
  const t = THRESHOLDS.autism
  const summaryWords = countWords(subject.simplified_summary)
  const objectives = objectiveLines(subject.learning_objectives)
  const headings = extractHeadings(subject.content_html)
  const idioms = findIdioms(text)
  const lastBlock = blocks[blocks.length - 1]
  const closesCleanly = Boolean(
    subject.simplified_summary.trim() ||
      /summary|recap|next|what you learned|ringkasan|seterusnya/i.test(
        `${headings.map((h) => h.text).join(' ')} ${lastBlock?.text ?? ''}`,
      ),
  )

  return [
    rule({
      id: 'asd_summary',
      title: 'Plain-language summary',
      weight: 14,
      severity: 'required',
      requirement: `A concrete summary of at least ${t.minSummaryWords} words, written in plain language.`,
      tab: 'basics',
      status: summaryWords >= t.minSummaryWords ? 'pass' : 'fail',
      detail:
        summaryWords >= t.minSummaryWords
          ? `${summaryWords}-word summary present.`
          : summaryWords === 0
            ? 'No simplified summary. Learners have to infer the point of the lesson from the lesson itself.'
            : `Summary is only ${summaryWords} words — too short to set expectations.`,
      metric: { value: summaryWords, target: t.minSummaryWords, unit: 'words', direction: 'min' },
      fix:
        summaryWords >= t.minSummaryWords
          ? undefined
          : {
              label: 'Draft from headings',
              scope: 'lesson',
              lessonPatch: (s) => ({ simplified_summary: seedSummary(s) }),
            },
    }),
    rule({
      id: 'asd_objectives',
      title: 'Explicit learning objectives',
      weight: 14,
      severity: 'required',
      requirement: `At least ${t.minObjectives} stated objectives, so nothing about the lesson is implied.`,
      tab: 'basics',
      status: objectives.length >= t.minObjectives ? 'pass' : 'fail',
      detail:
        objectives.length >= t.minObjectives
          ? `${objectives.length} objectives stated.`
          : objectives.length === 0
            ? 'No learning objectives. The learner cannot tell what success looks like before starting.'
            : `Only ${objectives.length} objective stated — list at least ${t.minObjectives}.`,
      metric: {
        value: objectives.length,
        target: t.minObjectives,
        unit: 'objectives',
        direction: 'min',
      },
      fix:
        objectives.length >= t.minObjectives
          ? undefined
          : {
              label: 'Draft from headings',
              scope: 'lesson',
              lessonPatch: (s) => ({ learning_objectives: seedObjectives(s) }),
            },
    }),
    rule({
      id: 'asd_literal',
      title: 'Literal language',
      weight: 12,
      severity: 'required',
      requirement: 'No idioms or figures of speech that have to be decoded before the content makes sense.',
      tab: 'content',
      status: idioms.length === 0 ? 'pass' : 'fail',
      detail:
        idioms.length === 0
          ? 'No figures of speech detected.'
          : `${nameList(idioms.map((i) => `"${i.phrase}" (say "${i.plain}")`), 2)}.`,
    }),
    rule({
      id: 'asd_predictable',
      title: 'Predictable structure',
      weight: 10,
      severity: 'recommended',
      requirement: 'The lesson uses headings and ends with a summary or a clear next step.',
      tab: 'content',
      status: headings.length > 0 && closesCleanly ? 'pass' : 'fail',
      detail:
        headings.length === 0
          ? 'No headings, so the shape of the lesson is not visible in advance.'
          : closesCleanly
            ? 'Headings throughout and a clear closing section.'
            : 'The lesson stops without a summary or a stated next step, which leaves the ending ambiguous.',
    }),
    rule({
      id: 'asd_notes',
      title: 'Notes for support staff',
      weight: 6,
      severity: 'recommended',
      requirement: 'Accessibility notes record how this lesson should be facilitated.',
      tab: 'accessibility',
      status: subject.accessibility_notes.trim() ? 'pass' : 'fail',
      detail: subject.accessibility_notes.trim()
        ? 'Support notes recorded.'
        : 'No support notes. Anyone else delivering this lesson has to guess at the accommodations.',
    }),
  ]
}

function dyslexiaRules(
  subject: LessonAuditSubject,
  text: string,
  blocks: TextBlock[],
  support: CourseAccessibilitySupport,
): AuditRule[] {
  const t = THRESHOLDS.dyslexia
  const words = countWords(text)
  const prose = blocks.filter((b) => b.tag !== 'li')
  const longParagraphs = prose.filter((b) => b.words > t.maxParagraphWords)
  const sentences = splitSentences(text)
  const sentenceLengths = sentences.map((s) => countWords(s))
  const meanSentence =
    sentenceLengths.length > 0
      ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
      : 0
  const longSentences = sentenceLengths.filter((n) => n > t.maxSentenceWords)
  const grade = fleschKincaidGrade(text)
  const targetGrade = support.target_reading_age
    ? Math.max(1, support.target_reading_age - 5)
    : t.defaultReadingGrade
  const ratio = emphasisRatio(subject.content_html)
  const hasLists = /<(ul|ol)\b/i.test(subject.content_html)
  const capsRuns = findCapsRuns(text, t.maxCapsRun)
  const images = extractImages(subject.content_html)
  const undescribed = images.filter((img) => img.alt === null || img.alt.trim() === '')

  return [
    rule({
      id: 'dys_paragraphs',
      title: 'Short paragraphs',
      weight: 14,
      severity: 'required',
      requirement: `No paragraph runs past ${t.maxParagraphWords} words.`,
      tab: 'content',
      status: prose.length === 0 ? 'not_applicable' : longParagraphs.length === 0 ? 'pass' : 'fail',
      detail:
        prose.length === 0
          ? 'No prose paragraphs to check.'
          : longParagraphs.length === 0
            ? `Longest paragraph is ${Math.max(0, ...prose.map((b) => b.words))} words.`
            : `${nameList(longParagraphs.map((b) => `${b.label} runs ${b.words} words`))} — the limit is ${t.maxParagraphWords}. Long blocks make it easy to lose your place mid-line.`,
    }),
    rule({
      id: 'dys_sentences',
      title: 'Short sentences',
      weight: 10,
      severity: 'required',
      requirement: `Average sentence under ${t.maxMeanSentenceWords} words, and none over ${t.maxSentenceWords}.`,
      tab: 'content',
      status:
        sentences.length === 0
          ? 'not_applicable'
          : meanSentence <= t.maxMeanSentenceWords && longSentences.length === 0
            ? 'pass'
            : 'fail',
      detail:
        sentences.length === 0
          ? 'No sentences to check.'
          : meanSentence <= t.maxMeanSentenceWords && longSentences.length === 0
            ? `Average ${meanSentence.toFixed(1)} words per sentence.`
            : `Average ${meanSentence.toFixed(1)} words per sentence${longSentences.length > 0 ? `, with ${longSentences.length} sentence${longSentences.length === 1 ? '' : 's'} over ${t.maxSentenceWords} words (longest ${Math.max(...sentenceLengths)})` : ''}.`,
      metric: {
        value: Math.round(meanSentence * 10) / 10,
        target: t.maxMeanSentenceWords,
        unit: 'words/sentence',
        direction: 'max',
      },
    }),
    rule({
      id: 'dys_readability',
      title: 'Reading level on target',
      weight: 12,
      severity: 'required',
      requirement: `Flesch–Kincaid grade ${targetGrade} or below${support.target_reading_age ? ` (course reading age ${support.target_reading_age})` : ' (platform default)'}.`,
      tab: 'content',
      status: grade === null ? 'not_applicable' : grade <= targetGrade ? 'pass' : 'fail',
      detail:
        grade === null
          ? 'Not enough English text yet to compute a reliable grade (needs about 30 words).'
          : grade <= targetGrade
            ? `Grade ${grade.toFixed(1)} — at or below the target of ${targetGrade}.`
            : `Grade ${grade.toFixed(1)} against a target of ${targetGrade}. Shorter sentences and plainer words bring this down. Note this formula is calibrated for English.`,
      metric:
        grade === null
          ? undefined
          : { value: grade, target: targetGrade, unit: 'grade', direction: 'max' },
    }),
    rule({
      id: 'dys_emphasis',
      title: 'Low visual noise',
      weight: 10,
      severity: 'recommended',
      requirement: `Italic and underlined text stays under ${Math.round(t.maxEmphasisRatio * 100)}% of the lesson.`,
      tab: 'content',
      status: ratio <= t.maxEmphasisRatio ? 'pass' : 'fail',
      detail:
        ratio <= t.maxEmphasisRatio
          ? `${Math.round(ratio * 100)}% italic or underlined.`
          : `${Math.round(ratio * 100)}% of this lesson is italic or underlined. Slanted and underlined letters run together and slow decoding — use bold instead.`,
      metric: {
        value: Math.round(ratio * 100),
        target: Math.round(t.maxEmphasisRatio * 100),
        unit: '%',
        direction: 'max',
      },
      fix:
        ratio <= t.maxEmphasisRatio
          ? undefined
          : {
              label: 'Remove italics',
              scope: 'lesson',
              confirm:
                'This removes all italic and underline formatting from the lesson content. The words stay; only the styling is dropped. Continue?',
              lessonPatch: (s) => ({ content_html: stripEmphasis(s.content_html) }),
            },
    }),
    rule({
      id: 'dys_lists',
      title: 'Long content uses lists',
      weight: 8,
      severity: 'recommended',
      requirement: `Content over ${t.listsExpectedAbove} words breaks some of it into bullet or numbered lists.`,
      tab: 'content',
      status: words <= t.listsExpectedAbove ? 'not_applicable' : hasLists ? 'pass' : 'fail',
      detail:
        words <= t.listsExpectedAbove
          ? 'This lesson is short enough to read as prose.'
          : hasLists
            ? 'Lists used to break up the prose.'
            : `${words} words of continuous prose with no lists. Bulleted steps are markedly easier to track.`,
    }),
    rule({
      id: 'dys_caps',
      title: 'No shouting',
      weight: 6,
      severity: 'recommended',
      requirement: `No run of more than ${t.maxCapsRun} words in capital letters.`,
      tab: 'content',
      status: capsRuns.length === 0 ? 'pass' : 'fail',
      detail:
        capsRuns.length === 0
          ? 'No blocks of capitals.'
          : `${nameList(capsRuns.map((r) => `"${r.slice(0, 40)}${r.length > 40 ? '…' : ''}"`), 2)}. Capitals remove the word shapes readers rely on.`,
      fix:
        capsRuns.length === 0
          ? undefined
          : {
              label: 'Use sentence case',
              scope: 'lesson',
              confirm:
                'This rewrites long runs of capital letters in the lesson content as sentence case. Continue?',
              lessonPatch: (s) => ({ content_html: calmCapitals(s.content_html) }),
            },
    }),
    rule({
      id: 'dys_tts',
      title: 'Ready for text-to-speech',
      weight: 10,
      severity: 'required',
      requirement: 'The course offers audio playback, and no text is trapped inside images.',
      tab: 'accessibility',
      status: support.supports_tts && undescribed.length === 0 ? 'pass' : 'fail',
      detail: !support.supports_tts
        ? 'Text-to-speech is switched off for this course, so learners cannot listen to this lesson.'
        : undescribed.length === 0
          ? 'Audio playback is on and all images are described.'
          : `Audio playback is on, but ${undescribed.length} image${undescribed.length === 1 ? '' : 's'} ${undescribed.length === 1 ? 'is' : 'are'} undescribed — anything written inside them is silent.`,
      fix: support.supports_tts
        ? undefined
        : {
            label: 'Enable audio for course',
            scope: 'course',
            coursePatch: { supports_tts: true },
          },
    }),
  ]
}

function generalRules(
  subject: LessonAuditSubject,
  text: string,
  blocks: TextBlock[],
  support: CourseAccessibilitySupport,
): AuditRule[] {
  const objectives = objectiveLines(subject.learning_objectives)
  const prose = blocks.filter((b) => b.tag !== 'li')
  const longParagraphs = prose.filter((b) => b.words > THRESHOLDS.general.maxParagraphWords)
  void text

  return [
    rule({
      id: 'gen_objectives',
      title: 'Learning objectives stated',
      weight: 10,
      severity: 'recommended',
      requirement: 'The lesson says what the learner will be able to do afterwards.',
      tab: 'basics',
      status: objectives.length > 0 ? 'pass' : 'fail',
      detail:
        objectives.length > 0
          ? `${objectives.length} objective${objectives.length === 1 ? '' : 's'} stated.`
          : 'No learning objectives set for this lesson.',
      fix:
        objectives.length > 0
          ? undefined
          : {
              label: 'Draft from headings',
              scope: 'lesson',
              lessonPatch: (s) => ({ learning_objectives: seedObjectives(s) }),
            },
    }),
    rule({
      id: 'gen_paragraphs',
      title: 'Readable paragraph length',
      weight: 8,
      severity: 'recommended',
      requirement: `No paragraph runs past ${THRESHOLDS.general.maxParagraphWords} words.`,
      tab: 'content',
      status: prose.length === 0 ? 'not_applicable' : longParagraphs.length === 0 ? 'pass' : 'fail',
      detail:
        prose.length === 0
          ? 'No prose paragraphs to check.'
          : longParagraphs.length === 0
            ? 'All paragraphs are a comfortable length.'
            : `${nameList(longParagraphs.map((b) => `${b.label} (${b.words} words)`))} over the limit.`,
    }),
    rule({
      id: 'gen_tts',
      title: 'Audio playback available',
      weight: 10,
      severity: 'recommended',
      requirement: 'The course offers text-to-speech so learners can listen instead of read.',
      tab: 'accessibility',
      status: support.supports_tts ? 'pass' : 'fail',
      detail: support.supports_tts
        ? 'Text-to-speech is enabled for this course.'
        : 'Text-to-speech is off for this course.',
      fix: support.supports_tts
        ? undefined
        : {
            label: 'Enable audio for course',
            scope: 'course',
            coursePatch: { supports_tts: true },
          },
    }),
  ]
}

// ─── Entry point ───────────────────────────────────────────────────────

/**
 * Audits one lesson against the standards for a focus profile.
 *
 * Scoring is weighted over *applicable* rules only, so a lesson with no video
 * is not punished for having no transcript. A lesson with nothing applicable
 * scores 0 rather than a vacuous 100.
 */
export function auditLesson(
  subject: LessonAuditSubject,
  focus: FocusProfile,
  support: CourseAccessibilitySupport = DEFAULT_COURSE_SUPPORT,
): LessonAuditResult {
  const text = htmlToText(subject.content_html)
  const blocks = extractBlocks(subject.content_html)

  const rules = [...baselineRules(subject, text, blocks)]
  if (focus === 'adhd') rules.push(...adhdRules(subject, text, blocks, support))
  else if (focus === 'autism') rules.push(...autismRules(subject, text, blocks))
  else if (focus === 'dyslexia') rules.push(...dyslexiaRules(subject, text, blocks, support))
  else rules.push(...generalRules(subject, text, blocks, support))

  const applicableRules = rules.filter((r) => r.status !== 'not_applicable')
  const totalWeight = applicableRules.reduce((sum, r) => sum + r.weight, 0)
  const earnedWeight = applicableRules
    .filter((r) => r.status === 'pass')
    .reduce((sum, r) => sum + r.weight, 0)

  const failures = rules.filter((r) => r.status === 'fail')
  const tabsNeedingAttention = Array.from(new Set(failures.map((r) => r.tab)))

  return {
    focus,
    score: totalWeight === 0 ? 0 : Math.round((earnedWeight / totalWeight) * 100),
    passed: applicableRules.filter((r) => r.status === 'pass').length,
    applicable: applicableRules.length,
    rules,
    failures,
    requiredFailures: failures.filter((r) => r.severity === 'required'),
    tabsNeedingAttention,
  }
}

/** Colour band for a score, shared by every surface that renders one. */
export function scoreBand(score: number): 'critical' | 'warning' | 'good' {
  if (score < 50) return 'critical'
  if (score < 80) return 'warning'
  return 'good'
}
