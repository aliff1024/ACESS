import { supabase } from './supabase';
import { createChapter } from './admin-api';

export interface CourseTemplateLesson {
  title: string;
  lesson_type: string;
  estimated_duration?: number;
  content_html: string;
}

export interface CourseTemplateChapter {
  title: string;
  description?: string;
  lessons: CourseTemplateLesson[];
}

export interface CourseTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  recommended_age_group?: string;
  guided_learning_enabled?: boolean;
  chapter_organization_enabled?: boolean;
  chapters?: CourseTemplateChapter[];
  lessons: CourseTemplateLesson[];
}

export const COURSE_TEMPLATES: CourseTemplate[] = [
  {
    id: 'blank',
    title: 'Blank Canvas',
    description: 'Start from scratch with an empty course.',
    category: 'Accessibility',
    difficulty: 'beginner',
    lessons: [],
  },
  {
    id: 'accessibility-basics',
    title: 'Accessibility Basics',
    description: '3-lesson intro covering web accessibility fundamentals.',
    category: 'Accessibility',
    difficulty: 'beginner',
    recommended_age_group: '14-17',
    guided_learning_enabled: true,
    lessons: [
      {
        title: 'What Is Accessibility?',
        lesson_type: 'reading',
        estimated_duration: 10,
        content_html: '<h2>Welcome</h2><p>In this lesson, learners discover why accessibility matters for everyone.</p>',
      },
      {
        title: 'Common Barriers',
        lesson_type: 'standard',
        estimated_duration: 15,
        content_html: '<h2>Barriers to Access</h2><p>Explore visual, auditory, motor, and cognitive barriers learners may face.</p>',
      },
      {
        title: 'Quick Wins',
        lesson_type: 'practice',
        estimated_duration: 20,
        content_html: '<h2>Easy Improvements</h2><p>Practice applying simple accessibility improvements to everyday content.</p>',
      },
    ],
  },
  {
    id: 'reading-literacy',
    title: 'Reading & Literacy',
    description: '5-lesson course organized into two chapters for guided reading.',
    category: 'Reading & Literacy',
    difficulty: 'beginner',
    recommended_age_group: '8-10',
    guided_learning_enabled: true,
    chapter_organization_enabled: true,
    chapters: [
      {
        title: 'Foundations',
        description: 'Build core reading skills.',
        lessons: [
          {
            title: 'Phonics Refresher',
            lesson_type: 'reading',
            estimated_duration: 12,
            content_html: '<p>Review letter sounds and blending techniques.</p>',
          },
          {
            title: 'Sight Words',
            lesson_type: 'reading',
            estimated_duration: 10,
            content_html: '<p>Practice high-frequency words with visual supports.</p>',
          },
        ],
      },
      {
        title: 'Comprehension',
        description: 'Understand what you read.',
        lessons: [
          {
            title: 'Main Idea',
            lesson_type: 'standard',
            estimated_duration: 15,
            content_html: '<p>Learn to identify the main idea in short passages.</p>',
          },
          {
            title: 'Making Connections',
            lesson_type: 'practice',
            estimated_duration: 15,
            content_html: '<p>Connect reading to personal experiences and prior knowledge.</p>',
          },
          {
            title: 'Reading Reflection',
            lesson_type: 'assessment',
            estimated_duration: 20,
            content_html: '<p>Reflect on strategies that worked best during the course.</p>',
          },
        ],
      },
    ],
    lessons: [],
  },
  {
    id: 'study-skills',
    title: 'Study Skills Toolkit',
    description: '4 lessons on organization, note-taking, and focus.',
    category: 'Study Skills',
    difficulty: 'intermediate',
    recommended_age_group: '11-13',
    guided_learning_enabled: true,
    lessons: [
      {
        title: 'Planning Your Study Time',
        lesson_type: 'standard',
        estimated_duration: 12,
        content_html: '<p>Create a simple, realistic study schedule.</p>',
      },
      {
        title: 'Note-Taking Strategies',
        lesson_type: 'reading',
        estimated_duration: 15,
        content_html: '<p>Try Cornell notes, mind maps, and bullet summaries.</p>',
      },
      {
        title: 'Staying Focused',
        lesson_type: 'practice',
        estimated_duration: 15,
        content_html: '<p>Practice focus techniques and distraction management.</p>',
      },
      {
        title: 'Review & Recall',
        lesson_type: 'quiz',
        estimated_duration: 10,
        content_html: '<p>Apply spaced repetition and self-quizzing habits.</p>',
      },
    ],
  },
];

export async function applyCourseTemplate(courseId: string, templateId: string): Promise<void> {
  const template = COURSE_TEMPLATES.find((t) => t.id === templateId);
  if (!template || template.id === 'blank') return;

  if (template.chapter_organization_enabled) {
    await supabase
      .from('courses')
      .update({ chapter_organization_enabled: true, updated_at: new Date().toISOString() })
      .eq('id', courseId);
  }

  let sequenceOrder = 0;

  if (template.chapters?.length) {
    for (const chapter of template.chapters) {
      const created = await createChapter(courseId, chapter.title, chapter.description);
      for (const lesson of chapter.lessons) {
        sequenceOrder += 1;
        const { error } = await supabase.from('lessons').insert({
          course_id: courseId,
          chapter_id: created.id,
          title: lesson.title,
          content_html: lesson.content_html,
          lesson_type: lesson.lesson_type,
          estimated_duration: lesson.estimated_duration ?? null,
          sequence_order: sequenceOrder,
          status: 'draft',
        });
        if (error) throw error;
      }
    }
    return;
  }

  for (const lesson of template.lessons) {
    sequenceOrder += 1;
    const { error } = await supabase.from('lessons').insert({
      course_id: courseId,
      title: lesson.title,
      content_html: lesson.content_html,
      lesson_type: lesson.lesson_type,
      estimated_duration: lesson.estimated_duration ?? null,
      sequence_order: sequenceOrder,
      status: 'draft',
    });
    if (error) throw error;
  }
}
