export type InteractiveContentType = 'flashcards' | 'drag_drop' | 'fill_blanks' | 'memory_game' | 'timeline'

export type FlashcardMode = 'study' | 'carousel' | 'grid'
export type FlashcardLayout = 'text' | 'image' | 'both'

export interface Flashcard {
  id: string
  front: string
  back: string
  image_url?: string // Deprecated
  front_image?: string
  back_image?: string
  front_layout?: FlashcardLayout
  back_layout?: FlashcardLayout
}

export interface FlashcardsData {
  mode?: FlashcardMode
  cards: Flashcard[]
}

export type DragDropMode = 'categories' | 'diagram' | 'matching'

export interface DragDropItem {
  id: string
  text: string
  category: string
  image_url?: string
}

export interface DragDropZone {
  id: string
  label: string
  x: number // percentage
  y: number // percentage
  width?: number
  height?: number
}

export interface DragDropData {
  mode?: DragDropMode
  items: DragDropItem[]
  categories: string[]
  background_image?: string
  diagram_zones?: DragDropZone[]
}

export type FillBlanksMode = 'word_bank' | 'typing' | 'mixed'

export interface FillBlanksSegment {
  text: string
  isBlank: boolean
  answer?: string
  options?: string[] // For mixed/word bank overrides
}

export interface FillBlanksData {
  mode?: FillBlanksMode
  segments: FillBlanksSegment[]
  raw_text?: string
  extra_words?: string[]
}

export type MemoryGameMode = 'image_image' | 'concept_match' | 'term_match' | 'image_label'

export interface MemoryCard {
  id: string
  pairId: string
  text: string
  image_url?: string
}

export interface MemoryGameData {
  mode?: MemoryGameMode
  cards: MemoryCard[]
}

export type TimelineMode = 'sorting' | 'historical' | 'process'

export interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
  image_url?: string
}

export interface TimelineData {
  mode?: TimelineMode
  events: TimelineEvent[]
}

export type InteractiveActivityData =
  | FlashcardsData
  | DragDropData
  | FillBlanksData
  | MemoryGameData
  | TimelineData

export interface InteractiveActivityConfig {
  id?: string
  lessonId?: string
  courseId?: string
  contentType: InteractiveContentType
  title: string
  data: InteractiveActivityData
  accessibilitySettings?: Record<string, unknown>
  sequenceOrder?: number
  is_draft?: boolean
}
