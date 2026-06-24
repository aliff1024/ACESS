import type { AccessibilitySettingsData } from '@/lib/learner-api'
import { supabase } from '@/lib/supabase'

// ─── Types ──────────────────────────────────────────────────────────────

export interface PresetDefinition {
  id: string
  label: string
  goal: string
  settings: PresetSettings
  additional_features: string[]
}

/** The granular settings that a preset applies */
export interface PresetSettings {
  font_family: string
  font_size_px: number
  line_spacing_multiplier: number
  word_spacing_pct: number
  background_tint: string
  reading_spotlight: boolean
  distraction_free_mode: boolean
  chunked_content_mode: boolean
  layout_mode: 'scroll' | 'slide' | 'chunked'
  structure_mode: 'full' | 'minimal' | 'checklist'
  reduced_motion: boolean
  animation_level: string
  tts_enabled: boolean
  high_contrast: boolean
  low_contrast: boolean
  muted_colors: boolean
  preferred_theme: string
  simplified_ui: boolean
  // Executive function
  task_checklist_enabled: boolean
  visual_schedule_enabled: boolean
  step_by_step_enabled: boolean
  auto_save_enabled: boolean
  progress_timeline_enabled: boolean
}

/** Full effective settings including both legacy and new fields */
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

// ─── Default Preset Settings ─────────────────────────────────────────────

export const DEFAULT_PRESET_SETTINGS: PresetSettings = {
  font_family: 'arial',
  font_size_px: 16,
  line_spacing_multiplier: 1.5,
  word_spacing_pct: 0,
  background_tint: 'white',
  reading_spotlight: false,
  distraction_free_mode: false,
  chunked_content_mode: false,
  layout_mode: 'slide',
  structure_mode: 'full',
  reduced_motion: false,
  animation_level: 'normal',
  tts_enabled: false,
  high_contrast: false,
  low_contrast: false,
  muted_colors: false,
  preferred_theme: 'light',
  simplified_ui: false,
  task_checklist_enabled: false,
  visual_schedule_enabled: false,
  step_by_step_enabled: false,
  auto_save_enabled: true,
  progress_timeline_enabled: false,
}

// ─── Accessibility Presets ───────────────────────────────────────────────

export const ACCESSIBILITY_PRESETS: Record<string, PresetDefinition> = {
  dyslexia: {
    id: 'dyslexia',
    label: 'Dyslexia Preset',
    goal: 'Reduce visual crowding and reading fatigue',
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      font_family: 'atkinson_hyperlegible',
      font_size_px: 18,
      line_spacing_multiplier: 1.6,
      word_spacing_pct: 20,
      background_tint: 'cream',
      reading_spotlight: true,
      chunked_content_mode: true,
      layout_mode: 'chunked',
      structure_mode: 'full',
      reduced_motion: true,
      animation_level: 'low',
      tts_enabled: false,
      preferred_theme: 'light',
      auto_save_enabled: true,
    },
    additional_features: ['Text-to-Speech', 'Reading Spotlight'],
  },
  adhd: {
    id: 'adhd',
    label: 'ADHD Preset',
    goal: 'Reduce distractions and support attention',
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      font_family: 'arial',
      font_size_px: 18,
      line_spacing_multiplier: 1.5,
      word_spacing_pct: 10,
      background_tint: 'grey',
      reading_spotlight: true,
      distraction_free_mode: true,
      chunked_content_mode: true,
      layout_mode: 'slide',
      structure_mode: 'minimal',
      reduced_motion: true,
      animation_level: 'low',
      preferred_theme: 'light',
      task_checklist_enabled: true,
      auto_save_enabled: true,
      progress_timeline_enabled: true,
    },
    additional_features: ['Task Checklist', 'Progress Timeline', 'Auto Save'],
  },
  autism: {
    id: 'autism',
    label: 'Autism Preset',
    goal: 'Reduce uncertainty and sensory overload',
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      font_family: 'arial',
      font_size_px: 18,
      line_spacing_multiplier: 1.5,
      word_spacing_pct: 10,
      background_tint: 'pale_blue',
      layout_mode: 'scroll',
      structure_mode: 'checklist',
      distraction_free_mode: true,
      chunked_content_mode: true,
      reduced_motion: true,
      animation_level: 'none',
      muted_colors: true,
      preferred_theme: 'light',
      visual_schedule_enabled: true,
      step_by_step_enabled: true,
      progress_timeline_enabled: true,
      auto_save_enabled: true,
    },
    additional_features: ['Visual Schedule', 'Step-by-Step Guidance', 'Progress Timeline', 'Distraction-Free'],
  },
  dyscalculia: {
    id: 'dyscalculia',
    label: 'Dyscalculia Preset',
    goal: 'Support number comprehension and math learning',
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      font_family: 'arial',
      font_size_px: 18,
      line_spacing_multiplier: 1.6,
      word_spacing_pct: 15,
      background_tint: 'soft_green',
      reading_spotlight: true,
      chunked_content_mode: true,
      reduced_motion: true,
      animation_level: 'low',
      low_contrast: true,
      preferred_theme: 'light',
      tts_enabled: true,
      step_by_step_enabled: true,
      auto_save_enabled: true,
      progress_timeline_enabled: true,
    },
    additional_features: ['Chunked Content', 'Step-by-Step Guidance', 'Progress Timeline', 'Text-to-Speech'],
  },
}

// ─── Legacy Disability Presets (backward compatibility) ──────────────────

const DEFAULT_LESSON_MODES = {
  focus_mode: false,
  chunked_content: false,
  guided_mode: false,
  checkpoints: false,
  simplified_summary: false,
}

/** Maps active_preset to lesson modes */
const PRESET_LESSON_MODES: Record<string, Partial<typeof DEFAULT_LESSON_MODES>> = {
  dyslexia: {
    chunked_content: true,
  },
  adhd: {
    chunked_content: true,
    checkpoints: true,
  },
  autism: {
    chunked_content: true,
    guided_mode: true,
    focus_mode: true,
    checkpoints: true,
    simplified_summary: true,
  },
  dyscalculia: {
    chunked_content: true,
    guided_mode: true,
  },
}

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

// ─── Preset Functions ──────────────────────────────────────────────────

/** Get a preset definition by name */
export function getPreset(presetName: string): PresetDefinition | null {
  return ACCESSIBILITY_PRESETS[presetName] ?? null
}

/** Get all preset definitions as an array */
export function getAllPresets(): PresetDefinition[] {
  return Object.values(ACCESSIBILITY_PRESETS)
}

/** Apply a preset and return the full settings object ready for saving */
export function applyPreset(presetName: string, currentSettings?: Partial<AccessibilitySettingsData>): AccessibilitySettingsData {
  const preset = ACCESSIBILITY_PRESETS[presetName]
  if (!preset) {
    return {
      ...currentSettings,
      active_preset: 'none',
    } as AccessibilitySettingsData
  }

  const s = preset.settings

  return {
    ...currentSettings,
    active_preset: presetName,
    font_family: s.font_family,
    font_size_px: s.font_size_px,
    line_spacing_multiplier: s.line_spacing_multiplier,
    word_spacing_pct: s.word_spacing_pct,
    background_tint: s.background_tint,
    reading_spotlight: s.reading_spotlight,
    distraction_free_mode: s.distraction_free_mode,
    chunked_content_mode: s.chunked_content_mode,
    reduced_motion: s.reduced_motion,
    animation_level: s.animation_level,
    tts_enabled: s.tts_enabled,
    high_contrast: s.high_contrast,
    low_contrast: s.low_contrast,
    muted_colors: s.muted_colors,
    preferred_theme: s.preferred_theme,
    simplified_ui: s.simplified_ui,
    task_checklist_enabled: s.task_checklist_enabled,
    visual_schedule_enabled: s.visual_schedule_enabled,
    step_by_step_enabled: s.step_by_step_enabled,
    auto_save_enabled: s.auto_save_enabled,
    progress_timeline_enabled: s.progress_timeline_enabled,
    // Map to legacy fields for backward compatibility
    preferred_font_size: s.font_size_px <= 14 ? 'small' : s.font_size_px <= 16 ? 'medium' : s.font_size_px <= 18 ? 'large' : 'xlarge',
    line_spacing: s.line_spacing_multiplier <= 1.4 ? 'normal' : s.line_spacing_multiplier <= 1.7 ? 'relaxed' : 'loose',
    preferred_font: s.font_family === 'opendyslexic' || s.font_family === 'atkinson_hyperlegible' ? 'dyslexia' : 'default',
    dyslexia_friendly_font: s.font_family === 'opendyslexic' || s.font_family === 'atkinson_hyperlegible',
  } as AccessibilitySettingsData
}

/** Get what settings would change if a preset is applied */
export function getPresetDiff(
  presetName: string,
  currentSettings: Partial<AccessibilitySettingsData>,
): { key: string; from: unknown; to: unknown }[] {
  const preset = ACCESSIBILITY_PRESETS[presetName]
  if (!preset) return []

  const diffs: { key: string; from: unknown; to: unknown }[] = []
  const presetSettings = preset.settings as unknown as Record<string, unknown>

  for (const [key, value] of Object.entries(presetSettings)) {
    const currentValue = (currentSettings as unknown as Record<string, unknown>)[key]
    if (currentValue !== value) {
      diffs.push({ key, from: currentValue, to: value })
    }
  }

  return diffs
}

// ─── Legacy Core Functions (backward compatibility) ─────────────────────

export function getAdaptiveRecommendation(disabilityType: string | null | undefined): AdaptiveRecommendation | null {
  if (!disabilityType || disabilityType === 'none' || disabilityType === 'other') return null
  return DISABILITY_PRESETS[disabilityType] ?? null
}

export function computeAdaptiveSettings(
  disabilityType: string | null | undefined,
  userSettings: Partial<AccessibilitySettingsData>,
): EffectiveAccessibilitySettings {
  const recommendation = getAdaptiveRecommendation(disabilityType)

  const defaultLessonModes = { ...DEFAULT_LESSON_MODES }

  // Merge lesson modes from disability recommendation
  let lessonModes = { ...defaultLessonModes }
  if (recommendation) {
    lessonModes = {
      ...lessonModes,
      ...recommendation.recommended_lesson_modes,
    }
  }

  // Merge lesson modes from active_preset (presets act as a stronger signal)
  const activePreset = userSettings.active_preset
  if (activePreset && activePreset !== 'none' && PRESET_LESSON_MODES[activePreset]) {
    lessonModes = {
      ...lessonModes,
      ...PRESET_LESSON_MODES[activePreset],
    }
  }

  if (!recommendation) {
    return {
      ui: { ...userSettings },
      lesson_modes: lessonModes,
      active_recommendation: null,
      active_disability: null,
    }
  }

  // User settings always win over recommendations
  const mergedUi: Partial<AccessibilitySettingsData> = {
    ...recommendation.recommended_ui,
    ...userSettings,
  }

  return {
    ui: mergedUi,
    lesson_modes: lessonModes,
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
  | 'reading_spotlight'
  | 'distraction_free'

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
