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
    id: 'flashcards-vocab',
    name: 'Vocabulary Learning',
    description: 'Term-to-definition and example',
    icon: '📖',
    data: {
      cards: [
        { id: 't1', front: 'Accessibility', back: 'The design of products and environments to be usable by all people.\n\nExample: Adding alt text to images.', front_image: '', back_image: '' },
        { id: 't2', front: 'Semantics', back: 'The meaning or purpose of code.\n\nExample: Using <nav> for navigation links instead of a generic <div>.', front_image: '', back_image: '' },
        { id: 't3', front: 'Contrast Ratio', back: 'The difference in luminance between the foreground and background.\n\nExample: Text needs a contrast ratio of at least 4.5:1 against its background.', front_image: '', back_image: '' },
      ],
    },
  },
  {
    id: 'flashcards-language',
    name: 'Language Learning',
    description: 'Image and Word to Translation and Pronunciation',
    icon: '🗣️',
    data: {
      cards: [
        { id: 't1', front: 'Apple', back: 'Manzana\n\n(mahn-ZAH-nah)', front_image: '', back_image: '' },
        { id: 't2', front: 'Cat', back: 'Gato\n\n(GAH-toh)', front_image: '', back_image: '' },
        { id: 't3', front: 'Sun', back: 'Sol\n\n(sohl)', front_image: '', back_image: '' },
      ],
    },
  },
  {
    id: 'flashcards-concept',
    name: 'Concept Learning',
    description: 'Question to Explanation',
    icon: '💡',
    data: {
      cards: [
        { id: 't1', front: 'What is the DOM?', back: 'The Document Object Model (DOM) is a programming interface for web documents. It represents the page so that programs can change the document structure, style, and content.', front_image: '', back_image: '' },
        { id: 't2', front: 'Why is responsive design important?', back: 'It ensures that web pages look good and function properly on a variety of devices and window or screen sizes, improving user experience and accessibility.', front_image: '', back_image: '' },
      ],
    },
  },
]

export const dragDropTemplates: ActivityTemplate<DragDropData>[] = [
  {
    id: 'dragdrop-diagram',
    name: 'Label a Diagram',
    description: 'Drag labels onto a central image background',
    icon: '🏷️',
    data: {
      background_image: '',
      items: [
        { id: 't1', text: 'Header', category: 'Zone 1', image_url: '' },
        { id: 't2', text: 'Main Content', category: 'Zone 2', image_url: '' },
        { id: 't3', text: 'Footer', category: 'Zone 3', image_url: '' },
      ],
      categories: ['Zone 1', 'Zone 2', 'Zone 3'],
    },
  },
  {
    id: 'dragdrop-categories',
    name: 'Match Categories',
    description: 'Sort items into the correct categories',
    icon: '📂',
    data: {
      items: [
        { id: 't1', text: 'HTML', category: 'Frontend', image_url: '' },
        { id: 't2', text: 'CSS', category: 'Frontend', image_url: '' },
        { id: 't3', text: 'Node.js', category: 'Backend', image_url: '' },
        { id: 't4', text: 'Python', category: 'Backend', image_url: '' },
        { id: 't5', text: 'PostgreSQL', category: 'Database', image_url: '' },
      ],
      categories: ['Frontend', 'Backend', 'Database'],
    },
  },
  {
    id: 'dragdrop-process',
    name: 'Process Matching',
    description: 'Match actions to steps in a workflow',
    icon: '🔄',
    data: {
      items: [
        { id: 't1', text: 'Write Code', category: 'Development', image_url: '' },
        { id: 't2', text: 'Run Tests', category: 'Testing', image_url: '' },
        { id: 't3', text: 'Deploy to Server', category: 'Deployment', image_url: '' },
      ],
      categories: ['Development', 'Testing', 'Deployment'],
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
    id: 'memory-image',
    name: 'Image Matching',
    description: 'Match identical pairs of images',
    icon: '🖼️',
    data: {
      cards: [
        { id: 't1', pairId: 'p1', text: '', image_url: '' },
        { id: 't2', pairId: 'p1', text: '', image_url: '' },
        { id: 't3', pairId: 'p2', text: '', image_url: '' },
        { id: 't4', pairId: 'p2', text: '', image_url: '' },
        { id: 't5', pairId: 'p3', text: '', image_url: '' },
        { id: 't6', pairId: 'p3', text: '', image_url: '' },
      ],
    },
  },
  {
    id: 'memory-term',
    name: 'Term Matching',
    description: 'Match concept and definition',
    icon: '📖',
    data: {
      cards: [
        { id: 't1', pairId: 'p1', text: 'HTML', image_url: '' },
        { id: 't2', pairId: 'p1', text: 'Structure of a webpage', image_url: '' },
        { id: 't3', pairId: 'p2', text: 'CSS', image_url: '' },
        { id: 't4', pairId: 'p2', text: 'Styling of a webpage', image_url: '' },
        { id: 't5', pairId: 'p3', text: 'JavaScript', image_url: '' },
        { id: 't6', pairId: 'p3', text: 'Interactivity of a webpage', image_url: '' },
      ],
    },
  },
  {
    id: 'memory-question',
    name: 'Question Matching',
    description: 'Match question and answer',
    icon: '❓',
    data: {
      cards: [
        { id: 't1', pairId: 'p1', text: 'What is 2 + 2?', image_url: '' },
        { id: 't2', pairId: 'p1', text: '4', image_url: '' },
        { id: 't3', pairId: 'p2', text: 'What is the capital of France?', image_url: '' },
        { id: 't4', pairId: 'p2', text: 'Paris', image_url: '' },
        { id: 't5', pairId: 'p3', text: 'Which planet is the Red Planet?', image_url: '' },
        { id: 't6', pairId: 'p3', text: 'Mars', image_url: '' },
      ],
    },
  },
]

export const timelineTemplates: ActivityTemplate<TimelineData>[] = [
  {
    id: 'timeline-historical',
    name: 'Historical Events',
    description: 'Arrange historical events chronologically',
    icon: '🏛️',
    data: {
      events: [
        { id: 't1', date: '1989', title: 'World Wide Web Invented', description: 'Tim Berners-Lee invented the World Wide Web.', image_url: '' },
        { id: 't2', date: '1993', title: 'First Web Browser', description: 'Mosaic, the first popular web browser, was released.', image_url: '' },
        { id: 't3', date: '1995', title: 'JavaScript Created', description: 'Brendan Eich created JavaScript in 10 days.', image_url: '' },
        { id: 't4', date: '1996', title: 'CSS Introduced', description: 'Cascading Style Sheets level 1 was published.', image_url: '' },
      ],
    },
  },
  {
    id: 'timeline-learning',
    name: 'Learning Process',
    description: 'Arrange standard learning steps',
    icon: '🎓',
    data: {
      events: [
        { id: 't1', date: 'Step 1', title: 'Plan', description: 'Identify learning objectives and resources.', image_url: '' },
        { id: 't2', date: 'Step 2', title: 'Learn', description: 'Absorb new information and concepts.', image_url: '' },
        { id: 't3', date: 'Step 3', title: 'Practice', description: 'Apply concepts through exercises.', image_url: '' },
        { id: 't4', date: 'Step 4', title: 'Review', description: 'Assess understanding and reflect.', image_url: '' },
      ],
    },
  },
  {
    id: 'timeline-project',
    name: 'Project Milestones',
    description: 'Arrange project phases',
    icon: '🚀',
    data: {
      events: [
        { id: 't1', date: 'Phase 1', title: 'Requirements Gathering', description: 'Understand what needs to be built.', image_url: '' },
        { id: 't2', date: 'Phase 2', title: 'Design', description: 'Create UI/UX and system architecture.', image_url: '' },
        { id: 't3', date: 'Phase 3', title: 'Implementation', description: 'Write the code and build the product.', image_url: '' },
        { id: 't4', date: 'Phase 4', title: 'Launch', description: 'Release the product to users.', image_url: '' },
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
