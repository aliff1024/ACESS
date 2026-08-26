-- ============================================================
-- ACESS System: Course Seed Data
-- 3 Disabilities (dyslexia, adhd, asd) x 3 Age Ranges (6-12, 13-17, 18+) x 3 Courses = 27 Courses
-- ============================================================

-- Admin user UUID for created_by
-- admin@acess.demo: 094fd776-0e8f-4523-a727-1d05f6dc0a2c

-- ============================================================
-- DYSLEXIA COURSES
-- ============================================================

-- Age 6-12: Dyslexia
INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Phonics Adventures: Sound It Out',
  'phonics-adventures',
  'An interactive phonics course designed for dyslexic learners aged 6-12. Uses multi-sensory approaches with visual letter mapping, audio reinforcement, and tactile exercises to build reading fundamentals.',
  'published',
  'beginner',
  'system',
  true,
  true,
  'admin',
  '6-12',
  'dyslexia',
  ARRAY['cognitive_impairment'],
  ARRAY['dyslexia', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['phonics', 'reading', 'dyslexia-friendly', 'multisensory', 'early-literacy'],
  'Literacy',
  'simplified'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Word World: Vocabulary Builder',
  'word-world-vocabulary',
  'Build vocabulary through visual word maps, picture associations, and story-based learning. Specifically designed for dyslexic children with dyslexia-friendly fonts and color-coded syllables.',
  'published',
  'beginner',
  'system',
  true,
  true,
  'admin',
  '6-12',
  'dyslexia',
  ARRAY['cognitive_impairment'],
  ARRAY['dyslexia', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['vocabulary', 'reading', 'dyslexia-friendly', 'visual-learning', 'early-literacy'],
  'Literacy',
  'simplified'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Story Sequencer: Reading Comprehension',
  'story-sequencer',
  'Develop reading comprehension through interactive story sequencing. Learners arrange story cards, identify cause-and-effect, and answer questions with visual supports.',
  'published',
  'beginner',
  'system',
  true,
  true,
  'admin',
  '6-12',
  'dyslexia',
  ARRAY['cognitive_impairment'],
  ARRAY['dyslexia', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['reading-comprehension', 'storytelling', 'dyslexia-friendly', 'sequencing', 'early-literacy'],
  'Literacy',
  'simplified'
);

-- Age 13-17: Dyslexia
INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Study Skills for Dyslexic Teens',
  'study-skills-dyslexia-teens',
  'Evidence-based study strategies for teenagers with dyslexia. Covers note-taking methods, memory techniques, time management, and exam preparation using dyslexia-friendly tools.',
  'published',
  'intermediate',
  'system',
  true,
  true,
  'admin',
  '13-17',
  'dyslexia',
  ARRAY['adhd'],
  ARRAY['dyslexia', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['study-skills', 'note-taking', 'exam-prep', 'dyslexia-friendly', 'teen'],
  'Academic Skills',
  'guided'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Creative Writing Without Barriers',
  'creative-writing-dyslexia',
  'Express creativity through writing with dyslexia-friendly tools. Learn storytelling, poetry, and essay writing with speech-to-text support, visual prompts, and structured templates.',
  'published',
  'intermediate',
  'system',
  true,
  true,
  'admin',
  '13-17',
  'dyslexia',
  ARRAY['adhd'],
  ARRAY['dyslexia', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['creative-writing', 'storytelling', 'dyslexia-friendly', 'expression', 'teen'],
  'Language Arts',
  'guided'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Research Skills for Teens',
  'research-skills-teens',
  'Learn how to research effectively with tools designed for dyslexic learners. Covers source evaluation, note organization, citation basics, and presentation skills.',
  'published',
  'intermediate',
  'system',
  true,
  true,
  'admin',
  '13-17',
  'dyslexia',
  ARRAY['adhd'],
  ARRAY['dyslexia', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['research', 'academic', 'dyslexia-friendly', 'information-literacy', 'teen'],
  'Academic Skills',
  'guided'
);

-- Age 18+: Dyslexia
INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Workplace Reading Strategies',
  'workplace-reading-strategies',
  'Master professional reading skills with dyslexia-friendly techniques. Covers email comprehension, report analysis, documentation navigation, and workplace communication.',
  'published',
  'advanced',
  'system',
  true,
  true,
  'admin',
  '18+',
  'dyslexia',
  ARRAY['adhd'],
  ARRAY['dyslexia', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['workplace', 'professional', 'dyslexia-friendly', 'reading', 'adult'],
  'Professional Development',
  'standard'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Professional Communication Mastery',
  'professional-communication',
  'Develop confident workplace communication skills. Learn to write clear emails, give presentations, and participate in meetings with dyslexia-friendly strategies and tools.',
  'published',
  'advanced',
  'system',
  true,
  true,
  'admin',
  '18+',
  'dyslexia',
  ARRAY['adhd'],
  ARRAY['dyslexia', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['communication', 'professional', 'dyslexia-friendly', 'presentation', 'adult'],
  'Professional Development',
  'standard'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Digital Literacy for Adults',
  'digital-literacy-adults',
  'Build essential digital skills with dyslexia-friendly interfaces. Covers computer basics, internet navigation, online safety, and productivity software.',
  'published',
  'beginner',
  'system',
  true,
  true,
  'admin',
  '18+',
  'dyslexia',
  ARRAY['cognitive_impairment'],
  ARRAY['dyslexia', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['digital-literacy', 'technology', 'dyslexia-friendly', 'computer-basics', 'adult'],
  'Technology',
  'standard'
);

-- ============================================================
-- ADHD COURSES
-- ============================================================

-- Age 6-12: ADHD
INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Focus Quest: Attention Training',
  'focus-quest-attention',
  'Gamified attention-building exercises for children with ADHD. Short, engaging activities with immediate rewards, progress tracking, and movement breaks.',
  'published',
  'beginner',
  'system',
  true,
  true,
  'admin',
  '6-12',
  'adhd',
  ARRAY['asd'],
  ARRAY['adhd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['focus', 'attention', 'adhd-friendly', 'gamification', 'early-learning'],
  'Executive Function',
  'focused'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Brain Games: Concentration Boost',
  'brain-games-concentration',
  'Fun brain-training games designed to improve concentration. Includes puzzles, memory games, and pattern recognition with ADHD-friendly pacing and rewards.',
  'published',
  'beginner',
  'system',
  true,
  true,
  'admin',
  '6-12',
  'adhd',
  ARRAY['asd'],
  ARRAY['adhd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['brain-games', 'concentration', 'adhd-friendly', 'puzzles', 'cognitive-training'],
  'Executive Function',
  'focused'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Movement & Learn: Active Education',
  'movement-learn-active',
  'Combine physical movement with learning activities. Designed for kinesthetic learners with ADHD, featuring standing exercises, dance breaks, and hands-on projects.',
  'published',
  'beginner',
  'system',
  true,
  true,
  'admin',
  '6-12',
  'adhd',
  ARRAY['asd'],
  ARRAY['adhd', 'motor'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['movement', 'kinesthetic', 'adhd-friendly', 'active-learning', 'physical'],
  'Active Learning',
  'focused'
);

-- Age 13-17: ADHD
INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Time Management for Teens',
  'time-management-teens',
  'Master time management with ADHD-friendly tools. Learn to use planners, set priorities, break tasks into chunks, and manage deadlines with visual timers.',
  'published',
  'intermediate',
  'system',
  true,
  true,
  'admin',
  '13-17',
  'adhd',
  ARRAY['dyslexia'],
  ARRAY['adhd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['time-management', 'organization', 'adhd-friendly', 'planning', 'teen'],
  'Executive Function',
  'guided'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Study Habits That Stick',
  'study-habits-stick',
  'Build sustainable study habits designed for ADHD brains. Covers spaced repetition, active recall, study environment setup, and motivation techniques.',
  'published',
  'intermediate',
  'system',
  true,
  true,
  'admin',
  '13-17',
  'adhd',
  ARRAY['dyslexia'],
  ARRAY['adhd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['study-habits', 'memory', 'adhd-friendly', 'self-regulation', 'teen'],
  'Academic Skills',
  'guided'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Goal Setting Workshop',
  'goal-setting-workshop',
  'Learn to set and achieve meaningful goals. Covers SMART goals, action planning, progress tracking, and overcoming procrastination with ADHD-specific strategies.',
  'published',
  'intermediate',
  'system',
  true,
  true,
  'admin',
  '13-17',
  'adhd',
  ARRAY['dyslexia'],
  ARRAY['adhd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['goal-setting', 'motivation', 'adhd-friendly', 'planning', 'teen'],
  'Executive Function',
  'guided'
);

-- Age 18+: ADHD
INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Productivity Systems for Adults',
  'productivity-systems-adults',
  'Discover productivity systems that work for ADHD adults. Covers Getting Things Done, Pomodoro Technique, habit stacking, and digital tools for focus.',
  'published',
  'advanced',
  'system',
  true,
  true,
  'admin',
  '18+',
  'adhd',
  ARRAY['dyslexia'],
  ARRAY['adhd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['productivity', 'systems', 'adhd-friendly', 'adult', 'work-life-balance'],
  'Professional Development',
  'standard'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Career Development Focus',
  'career-development-focus',
  'Navigate your career with ADHD-friendly strategies. Covers resume writing, interview skills, workplace accommodations, and professional growth planning.',
  'published',
  'advanced',
  'system',
  true,
  true,
  'admin',
  '18+',
  'adhd',
  ARRAY['dyslexia'],
  ARRAY['adhd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['career', 'professional', 'adhd-friendly', 'job-search', 'adult'],
  'Professional Development',
  'standard'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Executive Function Training',
  'executive-function-training',
  'Strengthen executive function skills for daily life. Covers planning, organization, emotional regulation, impulse control, and working memory exercises.',
  'published',
  'advanced',
  'system',
  true,
  true,
  'admin',
  '18+',
  'adhd',
  ARRAY['asd'],
  ARRAY['adhd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['executive-function', 'self-regulation', 'adhd-friendly', 'daily-living', 'adult'],
  'Life Skills',
  'standard'
);

-- ============================================================
-- ASD (AUTISM SPECTRUM DISORDER) COURSES
-- ============================================================

-- Age 6-12: ASD
INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Social Skills Playground',
  'social-skills-playground',
  'Learn social skills through interactive scenarios and role-playing. Covers greeting others, sharing, turn-taking, and reading social cues with visual supports.',
  'published',
  'beginner',
  'system',
  true,
  true,
  'admin',
  '6-12',
  'asd',
  ARRAY['adhd'],
  ARRAY['asd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['social-skills', 'communication', 'asd-friendly', 'role-playing', 'early-learning'],
  'Social Skills',
  'simplified'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Pattern World: Visual Learning',
  'pattern-world-visual',
  'Explore mathematics through patterns and visual structures. Ideal for autistic learners who thrive on visual-spatial reasoning and logical patterns.',
  'published',
  'beginner',
  'system',
  true,
  true,
  'admin',
  '6-12',
  'asd',
  ARRAY['adhd'],
  ARRAY['asd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['patterns', 'mathematics', 'asd-friendly', 'visual-learning', 'logic'],
  'Mathematics',
  'simplified'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Routine Builder: Daily Structure',
  'routine-builder-daily',
  'Create and maintain daily routines with visual schedules and checklists. Helps autistic children build predictability and reduce anxiety.',
  'published',
  'beginner',
  'system',
  true,
  true,
  'admin',
  '6-12',
  'asd',
  ARRAY['adhd'],
  ARRAY['asd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['routine', 'structure', 'asd-friendly', 'daily-living', 'visual-schedule'],
  'Life Skills',
  'simplified'
);

-- Age 13-17: ASD
INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Navigating Social Situations',
  'navigating-social-situations',
  'Learn to navigate complex social situations as a teenager. Covers friendships, group dynamics, conflict resolution, and online social skills.',
  'published',
  'intermediate',
  'system',
  true,
  true,
  'admin',
  '13-17',
  'asd',
  ARRAY['adhd'],
  ARRAY['asd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['social-skills', 'friendship', 'asd-friendly', 'teen', 'communication'],
  'Social Skills',
  'guided'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Emotional Regulation Toolkit',
  'emotional-regulation-toolkit',
  'Develop emotional regulation skills with visual emotion cards, coping strategies, and mindfulness exercises designed for autistic teens.',
  'published',
  'intermediate',
  'system',
  true,
  true,
  'admin',
  '13-17',
  'asd',
  ARRAY['adhd'],
  ARRAY['asd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['emotional-regulation', 'mindfulness', 'asd-friendly', 'coping', 'teen'],
  'Mental Health',
  'guided'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Transition Planning for Teens',
  'transition-planning-teens',
  'Prepare for life transitions with structured planning. Covers high school to college, independence skills, self-advocacy, and future planning.',
  'published',
  'intermediate',
  'system',
  true,
  true,
  'admin',
  '13-17',
  'asd',
  ARRAY['adhd'],
  ARRAY['asd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['transition', 'planning', 'asd-friendly', 'self-advocacy', 'teen'],
  'Life Skills',
  'guided'
);

-- Age 18+: ASD
INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Professional Social Skills',
  'professional-social-skills',
  'Master workplace social skills. Covers professional email writing, meeting etiquette, networking, and building professional relationships.',
  'published',
  'advanced',
  'system',
  true,
  true,
  'admin',
  '18+',
  'asd',
  ARRAY['adhd'],
  ARRAY['asd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['professional', 'social-skills', 'asd-friendly', 'workplace', 'adult'],
  'Professional Development',
  'standard'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Independent Living Skills',
  'independent-living-skills',
  'Build essential skills for independent living. Covers cooking, budgeting, time management, household organization, and self-care routines.',
  'published',
  'advanced',
  'system',
  true,
  true,
  'admin',
  '18+',
  'asd',
  ARRAY['adhd'],
  ARRAY['asd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['independent-living', 'daily-living', 'asd-friendly', 'self-care', 'adult'],
  'Life Skills',
  'standard'
);

INSERT INTO courses (
  id, created_by, title, slug, description, status, difficulty_level,
  course_type, system_course, built_in_course, created_by_role,
  recommended_age_group, primary_disability_focus, secondary_disability_focuses,
  accessibility_categories, supports_tts, supports_transcripts,
  supports_focus_mode, supports_chunked_learning, accessibility_mode_enabled,
  certificate_enabled, tags, category, course_layout_type
) VALUES (
  gen_random_uuid(),
  '094fd776-0e8f-4523-a727-1d05f6dc0a2c',
  'Workplace Communication',
  'workplace-communication-asd',
  'Develop effective workplace communication skills. Covers asking for help, giving updates, handling feedback, and collaborating with colleagues.',
  'published',
  'advanced',
  'system',
  true,
  true,
  'admin',
  '18+',
  'asd',
  ARRAY['adhd'],
  ARRAY['asd', 'cognitive'],
  true,
  true,
  true,
  true,
  true,
  true,
  ARRAY['communication', 'workplace', 'asd-friendly', 'collaboration', 'adult'],
  'Professional Development',
  'standard'
);

-- ============================================================
-- END OF SEED DATA
-- ============================================================
