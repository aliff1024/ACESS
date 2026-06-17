import type { FlashcardsData, DragDropData, FillBlanksData, MemoryGameData, TimelineData } from '@/lib/interactive-types'

export interface ActivityTemplate<T> {
  id: string
  name: string
  description: string
  icon: string
  data: T
}

export const flashcardTemplates: ActivityTemplate<FlashcardsData>[] = [
  {
    id: 'flashcards-basic',
    name: 'Basic Flashcards',
    description: 'Question-and-answer pairs',
    icon: '🃏',
    data: {
      cards: [
        { id: 't1', front: 'What is accessibility?', back: 'Designing products for people with disabilities', image_url: '' },
        { id: 't2', front: 'What does WCAG stand for?', back: 'Web Content Accessibility Guidelines', image_url: '' },
        { id: 't3', front: 'Name one assistive technology', back: 'Screen reader, voice recognition, switch device', image_url: '' },
      ],
    },
  },
  {
    id: 'flashcards-image',
    name: 'Image Flashcards',
    description: 'Cards with images and explanations',
    icon: '🖼️',
    data: {
      cards: [
        { id: 't1', front: 'Replace with image URL', back: 'Description of the image', image_url: '' },
        { id: 't2', front: 'Replace with image URL', back: 'Description of the image', image_url: '' },
        { id: 't3', front: 'Replace with image URL', back: 'Description of the image', image_url: '' },
      ],
    },
  },
  {
    id: 'flashcards-vocab',
    name: 'Vocabulary Flashcards',
    description: 'Term-to-definition matching for language learning',
    icon: '📖',
    data: {
      cards: [
        { id: 't1', front: 'Term 1', back: 'Definition of term 1', image_url: '' },
        { id: 't2', front: 'Term 2', back: 'Definition of term 2', image_url: '' },
        { id: 't3', front: 'Term 3', back: 'Definition of term 3', image_url: '' },
      ],
    },
  },
]

export const dragDropTemplates: ActivityTemplate<DragDropData>[] = [
  {
    id: 'dragdrop-diagram',
    name: 'Label Diagram',
    description: 'Drag labels onto an image background',
    icon: '🏷️',
    data: {
      items: [
        { id: 't1', text: 'Label A', category: 'Drop Zone 1', image_url: '' },
        { id: 't2', text: 'Label B', category: 'Drop Zone 2', image_url: '' },
        { id: 't3', text: 'Label C', category: 'Drop Zone 3', image_url: '' },
      ],
      categories: ['Drop Zone 1', 'Drop Zone 2', 'Drop Zone 3'],
    },
  },
  {
    id: 'dragdrop-categories',
    name: 'Match Categories',
    description: 'Sort items into the correct categories',
    icon: '📂',
    data: {
      items: [
        { id: 't1', text: 'Item 1', category: 'Category A', image_url: '' },
        { id: 't2', text: 'Item 2', category: 'Category A', image_url: '' },
        { id: 't3', text: 'Item 3', category: 'Category B', image_url: '' },
        { id: 't4', text: 'Item 4', category: 'Category B', image_url: '' },
      ],
      categories: ['Category A', 'Category B'],
    },
  },
]

export const fillBlanksTemplates: ActivityTemplate<FillBlanksData>[] = [
  {
    id: 'fillblanks-paragraph',
    name: 'Single Paragraph',
    description: 'A paragraph with missing words',
    icon: '📝',
    data: {
      segments: [
        { text: 'The ', isBlank: false },
        { text: '_____', isBlank: true, answer: 'quick' },
        { text: ' brown fox jumps over the ', isBlank: false },
        { text: '_____', isBlank: true, answer: 'lazy' },
        { text: ' dog.', isBlank: false },
      ],
    },
  },
  {
    id: 'fillblanks-multiple',
    name: 'Multiple Choice Blank',
    description: 'Students choose from dropdown options',
    icon: '🔽',
    data: {
      segments: [
        { text: 'HTML is a ', isBlank: false },
        { text: '_____', isBlank: true, answer: 'markup' },
        { text: ' language used for structuring web content.', isBlank: false },
      ],
    },
  },
  {
    id: 'fillblanks-vocab',
    name: 'Vocabulary Completion',
    description: 'Complete sentences with vocabulary words',
    icon: '📚',
    data: {
      segments: [
        { text: 'A ', isBlank: false },
        { text: '_____', isBlank: true, answer: 'noun' },
        { text: ' is a person, place, or thing.', isBlank: false },
        { text: ' An ', isBlank: false },
        { text: '_____', isBlank: true, answer: 'adjective' },
        { text: ' describes a noun.', isBlank: false },
      ],
    },
  },
]

export const memoryGameTemplates: ActivityTemplate<MemoryGameData>[] = [
  {
    id: 'memory-text',
    name: 'Text Matching',
    description: 'Match question-and-answer pairs',
    icon: '🔤',
    data: {
      cards: [
        { id: 't1', pairId: 'p1', text: 'Question 1', image_url: '' },
        { id: 't2', pairId: 'p1', text: 'Answer 1', image_url: '' },
        { id: 't3', pairId: 'p2', text: 'Question 2', image_url: '' },
        { id: 't4', pairId: 'p2', text: 'Answer 2', image_url: '' },
        { id: 't5', pairId: 'p3', text: 'Question 3', image_url: '' },
        { id: 't6', pairId: 'p3', text: 'Answer 3', image_url: '' },
      ],
    },
  },
  {
    id: 'memory-image',
    name: 'Image Matching',
    description: 'Match images to descriptions',
    icon: '🖼️',
    data: {
      cards: [
        { id: 't1', pairId: 'p1', text: 'Replace with image URL', image_url: '' },
        { id: 't2', pairId: 'p1', text: 'Description 1', image_url: '' },
        { id: 't3', pairId: 'p2', text: 'Replace with image URL', image_url: '' },
        { id: 't4', pairId: 'p2', text: 'Description 2', image_url: '' },
      ],
    },
  },
  {
    id: 'memory-concept',
    name: 'Concept Matching',
    description: 'Match concepts to explanations',
    icon: '💡',
    data: {
      cards: [
        { id: 't1', pairId: 'p1', text: 'Accessibility', image_url: '' },
        { id: 't2', pairId: 'p1', text: 'Designing for all users', image_url: '' },
        { id: 't3', pairId: 'p2', text: 'Responsive Design', image_url: '' },
        { id: 't4', pairId: 'p2', text: 'Adapts to screen size', image_url: '' },
        { id: 't5', pairId: 'p3', text: 'Progressive Enhancement', image_url: '' },
        { id: 't6', pairId: 'p3', text: 'Works without JavaScript', image_url: '' },
      ],
    },
  },
]

export const timelineTemplates: ActivityTemplate<TimelineData>[] = [
  {
    id: 'timeline-historical',
    name: 'Historical Timeline',
    description: 'Arrange events in chronological order',
    icon: '📅',
    data: {
      events: [
        { id: 't1', date: 'Event 1', title: 'Title 1', description: 'Description 1', image_url: '' },
        { id: 't2', date: 'Event 2', title: 'Title 2', description: 'Description 2', image_url: '' },
        { id: 't3', date: 'Event 3', title: 'Title 3', description: 'Description 3', image_url: '' },
        { id: 't4', date: 'Event 4', title: 'Title 4', description: 'Description 4', image_url: '' },
      ],
    },
  },
  {
    id: 'timeline-process',
    name: 'Process / Lifecycle',
    description: 'Arrange process steps in correct order',
    icon: '⚙️',
    data: {
      events: [
        { id: 't1', date: 'Step 1', title: 'Planning', description: 'Define goals and requirements', image_url: '' },
        { id: 't2', date: 'Step 2', title: 'Design', description: 'Create wireframes and prototypes', image_url: '' },
        { id: 't3', date: 'Step 3', title: 'Development', description: 'Build and implement the solution', image_url: '' },
        { id: 't4', date: 'Step 4', title: 'Testing', description: 'Verify and validate the output', image_url: '' },
        { id: 't5', date: 'Step 5', title: 'Deployment', description: 'Release to production', image_url: '' },
      ],
    },
  },
  {
    id: 'timeline-learning',
    name: 'Learning Sequence',
    description: 'Arrange lesson steps in correct order',
    icon: '🎓',
    data: {
      events: [
        { id: 't1', date: 'Step 1', title: 'Introduction', description: 'Overview of topics', image_url: '' },
        { id: 't2', date: 'Step 2', title: 'Core Concepts', description: 'Learn the fundamentals', image_url: '' },
        { id: 't3', date: 'Step 3', title: 'Practice', description: 'Apply what you learned', image_url: '' },
        { id: 't4', date: 'Step 4', title: 'Assessment', description: 'Test your understanding', image_url: '' },
      ],
    },
  },
]

export const templatesByType: Record<string, ActivityTemplate<unknown>[]> = {
  flashcards: flashcardTemplates,
  drag_drop: dragDropTemplates,
  fill_blanks: fillBlanksTemplates,
  memory_game: memoryGameTemplates,
  timeline: timelineTemplates,
}
