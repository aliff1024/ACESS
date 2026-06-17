export type InteractiveContentType = 'flashcards' | 'drag_drop' | 'fill_blanks' | 'memory_game' | 'timeline'

export interface Flashcard {
  id: string
  front: string
  back: string
  image_url?: string
}

export interface FlashcardsData {
  cards: Flashcard[]
}

export interface DragDropItem {
  id: string
  text: string
  category: string
  image_url?: string
}

export interface DragDropData {
  items: DragDropItem[]
  categories: string[]
}

export interface FillBlanksSegment {
  text: string
  isBlank: boolean
  answer?: string
}

export interface FillBlanksData {
  segments: FillBlanksSegment[]
}

export interface MemoryCard {
  id: string
  pairId: string
  text: string
  image_url?: string
}

export interface MemoryGameData {
  cards: MemoryCard[]
}

export interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
  image_url?: string
}

export interface TimelineData {
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
}
