// Server-only. Never import this file from a 'use client' component — it
// reads GEMINI_API_KEY, which must never reach the browser bundle.
import { createHash } from 'crypto'

export interface GeminiCallOptions {
  systemInstruction: string
  userPrompt: string
  maxOutputTokens?: number
  temperature?: number
}

// If the primary model is temporarily overloaded (503), Google's own free-tier
// flash-lite model draws from a separate capacity pool and is worth one retry
// before giving up.
const FALLBACK_MODEL = 'gemini-flash-lite-latest'

async function callGeminiModel(model: string, apiKey: string, opts: GeminiCallOptions): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: opts.userPrompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          maxOutputTokens: opts.maxOutputTokens ?? 1024,
        },
      }),
    }
  )
}

export async function callGemini(opts: GeminiCallOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest'

  let res = await callGeminiModel(model, apiKey, opts)

  if (res.status === 503 && model !== FALLBACK_MODEL) {
    res = await callGeminiModel(FALLBACK_MODEL, apiKey, opts)
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${body}`)
  }

  const json = await res.json()
  const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('') ?? ''
  if (!text) throw new Error('Gemini returned no content')
  return text
}

export function hashContent(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

const MAX_CONTENT_CHARS = 15000

function truncate(text: string, max: number = MAX_CONTENT_CHARS): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

export interface AccessibilityHintInputs {
  ageGroup?: string | null
  readingLevel?: string | null
  simplifiedUi?: boolean | null
}

export function buildAccessibilityHints({ ageGroup, readingLevel, simplifiedUi }: AccessibilityHintInputs): string {
  const parts: string[] = []
  if (ageGroup === '6-12') {
    parts.push('Use very simple words, short sentences, and a friendly, encouraging tone.')
  } else if (ageGroup === '13-17') {
    parts.push('Use clear, everyday language appropriate for a teenager.')
  } else {
    parts.push('Use clear, professional language.')
  }
  if (simplifiedUi || readingLevel === 'simplified') {
    parts.push('Prefer short sentences and avoid jargon.')
  }
  return parts.join(' ')
}

export interface LessonForPrompt {
  title: string
  contentHtml: string
  transcript?: string | null
}

export interface SiblingLessonTitle {
  title: string
  sequence_order: number
}

export interface SiblingLessonWithSummary extends SiblingLessonTitle {
  summary?: string | null
}

export function buildSummaryPrompt(
  lesson: LessonForPrompt,
  siblingLessons: SiblingLessonTitle[],
  accessibilityHints: string
): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = `You are a helpful study assistant embedded in an online course lesson. Summarize ONLY the given lesson content in clear language. ${accessibilityHints} Output 3-6 concise bullet points followed by one short paragraph. Do not invent facts not present in the content. End with 3 lines each starting with "Q:" offering sample follow-up questions a student could ask.`

  const siblingList = siblingLessons.length
    ? `Other lessons in this course (for context only, do not summarize them): ${siblingLessons
        .map((s, i) => `${i + 1}. "${s.title}"`)
        .join(' ')}`
    : ''

  const body = [
    `Lesson title: ${lesson.title}`,
    `Lesson content: ${truncate(stripHtml(lesson.contentHtml))}`,
    lesson.transcript ? `Video transcript: ${truncate(stripHtml(lesson.transcript))}` : '',
    siblingList,
  ]
    .filter(Boolean)
    .join('\n\n')

  return { systemInstruction, userPrompt: body }
}

export interface ChatHistoryTurn {
  role: 'user' | 'assistant'
  content: string
}

export function buildChatSystemPrompt(
  lesson: LessonForPrompt,
  courseTitle: string,
  siblingLessons: SiblingLessonWithSummary[],
  history: ChatHistoryTurn[],
  question: string,
  accessibilityHints: string
): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = `You are a study assistant for the lesson titled "${lesson.title}" in the course "${courseTitle}". You may answer questions about this lesson's content (given in full below) and may reference other lessons in the course only by their titles and short summaries (given below) for continuity/context — you do not have their full content. If the learner asks something unrelated to this lesson or course, politely decline, explain you can only help with course content, and suggest 2-3 on-topic sample questions instead. Keep answers concise. ${accessibilityHints}`

  const siblingBlock = siblingLessons.length
    ? `Other lessons in this course:\n${siblingLessons
        .map((s) => `- "${s.title}": ${s.summary || 'no summary yet'}`)
        .join('\n')}`
    : ''

  const historyBlock = history.length
    ? `Conversation so far:\n${history.map((h) => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}`).join('\n')}`
    : ''

  const body = [
    `Lesson content: ${truncate(stripHtml(lesson.contentHtml))}`,
    lesson.transcript ? `Video transcript: ${truncate(stripHtml(lesson.transcript))}` : '',
    siblingBlock,
    historyBlock,
    `Student's new question: ${question}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  return { systemInstruction, userPrompt: body }
}

export function parseSummaryAndQuestions(raw: string): { summary: string; suggestedQuestions: string[] } {
  const lines = raw.split('\n')
  const questionLines = lines.filter((l) => l.trim().startsWith('Q:'))
  const suggestedQuestions = questionLines.map((l) => l.trim().replace(/^Q:\s*/, '')).filter(Boolean)
  const summary = lines
    .filter((l) => !l.trim().startsWith('Q:'))
    .join('\n')
    .trim()
  return { summary, suggestedQuestions }
}
