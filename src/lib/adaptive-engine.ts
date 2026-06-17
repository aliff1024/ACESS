import type { AccessibilitySettingsData } from '@/lib/learner-api'
import { supabase } from '@/lib/supabase'

// ─── Types ──────────────────────────────────────────────────────────────

export interface AdaptiveRecommendation {
  disability_type: string
  rationale: string
  recommended_ui: Partial<AccessibilitySettingsData>
  recommended_lesson_modes: {
    focus_mode?: boolean
    chunked_content?: boolean
    guided_mode?: boolean
    checkpoints?: boolean
    simplified_summary?: boolean
  }
}

export interface EffectiveAccessibilitySettings {
  ui: Partial<AccessibilitySettingsData>
  lesson_modes: {
    focus_mode: boolean
    chunked_content: boolean
    guided_mode: boolean
    checkpoints: boolean
    simplified_summary: boolean
  }
  active_recommendation: AdaptiveRecommendation | null
  active_disability: string | null
}

// ─── Disability Presets (recommendations, never forces) ──────────────

const DISABILITY_PRESETS: Record<string, AdaptiveRecommendation> = {
  cognitive_impairment: {
    disability_type: 'cognitive_impairment',
    rationale: 'Simplified language, step-by-step flow, and reduced distractions help learners with cognitive impairments process information more effectively.',
    recommended_ui: {
      simplified_ui: true,
      preferred_reading_level: 'basic',
      line_spacing: 'relaxed',
      reduced_motion: true,
    },
    recommended_lesson_modes: {
      focus_mode: true,
      chunked_content: true,
      guided_mode: true,
      checkpoints: true,
      simplified_summary: true,
    },
  },
  adhd: {
    disability_type: 'adhd',
    rationale: 'Short learning segments, progress indicators, and interactive checkpoints help maintain focus and engagement for learners with ADHD.',
    recommended_ui: {
      simplified_ui: true,
      reduced_motion: false,
    },
    recommended_lesson_modes: {
      chunked_content: true,
      checkpoints: true,
      focus_mode: false,
      guided_mode: false,
      simplified_summary: false,
    },
  },
  dyslexia: {
    disability_type: 'dyslexia',
    rationale: 'Dyslexia-friendly fonts, increased spacing, and text-to-speech support improve reading comprehension and reduce cognitive load.',
    recommended_ui: {
      dyslexia_friendly_font: true,
      preferred_font: 'dyslexia',
      line_spacing: 'loose',
      tts_enabled: true,
    },
    recommended_lesson_modes: {
      focus_mode: false,
      chunked_content: false,
      guided_mode: false,
      checkpoints: false,
      simplified_summary: false,
    },
  },
  asd: {
    disability_type: 'asd',
    rationale: 'Predictable structure, visual schedules, and reduced sensory input help learners with Autism Spectrum Disorder feel comfortable and oriented.',
    recommended_ui: {
      simplified_ui: true,
      reduced_motion: true,
      screen_reader_optimized: false,
    },
    recommended_lesson_modes: {
      focus_mode: true,
      chunked_content: true,
      guided_mode: true,
      checkpoints: false,
      simplified_summary: true,
    },
  },
  visual_impairment: {
    disability_type: 'visual_impairment',
    rationale: 'Screen reader optimization, high-contrast themes, and text-to-speech support enable learners with visual impairments to access content effectively.',
    recommended_ui: {
      screen_reader_optimized: true,
      preferred_font_size: 'xlarge',
      preferred_theme: 'high_contrast',
      tts_enabled: true,
      keyboard_navigation_enabled: true,
    },
    recommended_lesson_modes: {
      focus_mode: false,
      chunked_content: false,
      guided_mode: false,
      checkpoints: false,
      simplified_summary: false,
    },
  },
  hearing_impairment: {
    disability_type: 'hearing_impairment',
    rationale: 'Closed captions and text transcripts ensure learners with hearing impairments can fully access video and audio content.',
    recommended_ui: {
      captions_enabled: true,
    },
    recommended_lesson_modes: {
      focus_mode: false,
      chunked_content: false,
      guided_mode: false,
      checkpoints: false,
      simplified_summary: false,
    },
  },
  motor_impairment: {
    disability_type: 'motor_impairment',
    rationale: 'Keyboard navigation, larger fonts, and reduced fine-motor requirements help learners with motor impairments navigate and interact with content.',
    recommended_ui: {
      keyboard_navigation_enabled: true,
      preferred_font_size: 'large',
    },
    recommended_lesson_modes: {
      focus_mode: false,
      chunked_content: false,
      guided_mode: false,
      checkpoints: false,
      simplified_summary: false,
    },
  },
  multiple_disabilities: {
    disability_type: 'multiple_disabilities',
    rationale: 'Comprehensive accessibility support combines multiple adaptations to address a range of needs simultaneously.',
    recommended_ui: {
      simplified_ui: true,
      preferred_theme: 'high_contrast',
      line_spacing: 'loose',
      tts_enabled: true,
      captions_enabled: true,
      screen_reader_optimized: true,
      keyboard_navigation_enabled: true,
      reduced_motion: true,
      preferred_font_size: 'large',
      dyslexia_friendly_font: true,
    },
    recommended_lesson_modes: {
      focus_mode: true,
      chunked_content: true,
      guided_mode: true,
      checkpoints: true,
      simplified_summary: true,
    },
  },
}

const DISABILITY_DISPLAY_NAMES: Record<string, string> = {
  none: 'No accessibility support required',
  dyslexia: 'Dyslexia',
  adhd: 'ADHD',
  cognitive_impairment: 'Cognitive Impairment',
  asd: 'Autism Spectrum Disorder (ASD)',
  visual_impairment: 'Visual Impairment',
  hearing_impairment: 'Hearing Impairment',
  motor_impairment: 'Motor Impairment',
  multiple_disabilities: 'Multiple Disabilities',
  other: 'Other',
}

// ─── Core Functions ────────────────────────────────────────────────────

export function getAdaptiveRecommendation(disabilityType: string | null | undefined): AdaptiveRecommendation | null {
  if (!disabilityType || disabilityType === 'none' || disabilityType === 'other') return null
  return DISABILITY_PRESETS[disabilityType] ?? null
}

export function computeAdaptiveSettings(
  disabilityType: string | null | undefined,
  userSettings: Partial<AccessibilitySettingsData>,
): EffectiveAccessibilitySettings {
  const recommendation = getAdaptiveRecommendation(disabilityType)

  if (!recommendation) {
    return {
      ui: { ...userSettings },
      lesson_modes: {
        focus_mode: false,
        chunked_content: false,
        guided_mode: false,
        checkpoints: false,
        simplified_summary: false,
      },
      active_recommendation: null,
      active_disability: null,
    }
  }

  // User settings always win over recommendations
  const mergedUi: Partial<AccessibilitySettingsData> = {
    ...recommendation.recommended_ui,
    ...userSettings,
  }

  const defaultLessonModes = {
    focus_mode: false,
    chunked_content: false,
    guided_mode: false,
    checkpoints: false,
    simplified_summary: false,
  }

  return {
    ui: mergedUi,
    lesson_modes: {
      ...defaultLessonModes,
      ...recommendation.recommended_lesson_modes,
    },
    active_recommendation: recommendation,
    active_disability: disabilityType ?? null,
  }
}

export function getDisabilityDisplayName(type: string | null | undefined): string {
  if (!type) return 'Not specified'
  return DISABILITY_DISPLAY_NAMES[type] ?? type
}

export function getDisabilityRationale(type: string | null | undefined): string | null {
  if (!type || type === 'none' || type === 'other') return null
  return DISABILITY_PRESETS[type]?.rationale ?? null
}

// ─── Analytics Logging ─────────────────────────────────────────────────

export type AdaptationType =
  | 'tts'
  | 'focus_mode'
  | 'chunked_content'
  | 'simplified_summary'
  | 'captions'
  | 'slideshow'
  | 'guided_mode'

export async function trackAdaptation(
  adaptation: AdaptationType,
  options?: {
    userId?: string
    lessonId?: string
    courseId?: string
    sessionId?: string
    durationSeconds?: number
  },
): Promise<void> {
  try {
    let userId = options?.userId
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userId = user.id
    }
    await supabase.from('adaptive_interactions').insert({
      user_id: userId,
      lesson_id: options?.lessonId ?? null,
      course_id: options?.courseId ?? null,
      adaptation_used: adaptation,
      session_id: options?.sessionId ?? null,
      duration_seconds: options?.durationSeconds ?? null,
    })
  } catch {
    // Analytics failures should never break the user experience
  }
}
