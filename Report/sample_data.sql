-- =====================================================
-- ACESS SAMPLE DATA
-- 9 courses: 3 disabilities (Dyslexia, ADHD, ASD) × 3 age ranges (13-17, 18-24, 25+)
-- =====================================================
-- Run this AFTER the full schema has been applied.
-- UUIDs are fixed for cross-reference clarity.
-- =====================================================

-- ─── 1. USERS ─────────────────────────────────────────
-- 1 admin, 1 educator, 3 learners (one per disability)

INSERT INTO public.users (id, email, role, full_name, is_active, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@acess.edu.my',    'admin',    'System Admin',         true, now(), now()),
('00000000-0000-0000-0000-000000000002', 'educator@acess.edu.my',  'educator', 'Cikgu Siti Aminah',    true, now(), now()),
('00000000-0000-0000-0000-000000000003', 'learner1@acess.edu.my',  'learner',  'Ahmad Irfan',          true, now(), now()),
('00000000-0000-0000-0000-000000000004', 'learner2@acess.edu.my',  'learner',  'Nurul Aisyah',         true, now(), now()),
('00000000-0000-0000-0000-000000000005', 'learner3@acess.edu.my',  'learner',  'Muhammad Hakim',       true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ─── 2. USER PROFILES ────────────────────────────────

INSERT INTO public.user_profiles (id, user_id, username, avatar_url, birth_date, bio, country, preferred_language, created_at, updated_at) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin',     NULL, '1985-03-15', 'Platform administrator for ACESS.', 'MY', 'en', now(), now()),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'cikgusiti', NULL, '1990-07-22', 'Special education educator with 10 years experience.', 'MY', 'ms', now(), now()),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'ahmirfan',  NULL, '2010-05-10', 'Secondary school student with dyslexia.', 'MY', 'en', now(), now()),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'nurulaisy', NULL, '2002-11-18', 'University student diagnosed with ADHD.', 'MY', 'en', now(), now()),
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'hakim99',   NULL, '1998-02-03', 'Working adult on the autism spectrum.', 'MY', 'en', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ─── 3. USER ACCESSIBILITY PREFERENCES ────────────────

INSERT INTO public.user_accessibility_preferences (id, user_id, preferred_text_size, preferred_reading_mode, reduced_stimulation_mode, text_to_speech_enabled, simplified_navigation_enabled, dyslexia_friendly_font, focus_mode_enabled, created_at, updated_at) VALUES
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'large',   'focus',     false, true,  true,  true,  false, now(), now()),
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'medium', 'simplified', true,  false, true,  false, true,  now(), now()),
('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'medium', 'standard',  true,  false, false, false, true,  now(), now())
ON CONFLICT (user_id) DO NOTHING;

-- ─── 4. ACCESSIBILITY TEMPLATES ───────────────────────

INSERT INTO public.accessibility_templates (id, name, description, target_disability, content_structure, created_at) VALUES
('30000000-0000-0000-0000-000000000001', 'Dyslexia Standard',  'Standard template for dyslexia learners with OpenDyslexic font, increased spacing.', 'dyslexia', '{"font": "OpenDyslexic", "spacing": 1.8, "tts": true, "dyslexia_ruler": true}'::jsonb, now()),
('30000000-0000-0000-0000-000000000002', 'ADHD Focus Mode',     'Focus mode template for ADHD learners with reduced distractions.',            'adhd',     '{"focusMode": true, "sidebarCollapsed": true, "animationsReduced": true}'::jsonb, now()),
('30000000-0000-0000-0000-000000000003', 'ASD Simplified',      'Simplified template for ASD learners with consistent layout.',               'asd',      '{"simplifiedUI": true, "consistentLayout": true, "reducedStimulation": true}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. COURSES (9 total)
-- =====================================================
-- Format: [Disability] [Age Group]
-- =====================================================

-- Helper: educator UUID for created_by
-- '00000000-0000-0000-0000-000000000002'

INSERT INTO public.courses (id, created_by, title, slug, description, status, difficulty_level, category, course_type, system_course, built_in_course, created_by_role, guided_learning_enabled, official_course_order, managed_by_admin, recommended_age_group, learning_streaks_enabled, milestone_tracking_enabled, accessibility_mode_enabled, course_layout_type, chapter_organization_enabled, primary_disability_focus, accessibility_categories, target_reading_age, created_at, updated_at) VALUES

-- DYSLEXIA COURSES
('A0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
 'Reading Foundations: Dyslexia (13-17)', 'dyslexia-13-17',
 'Foundational reading skills course designed for secondary school learners with dyslexia. Uses structured phonics, multisensory techniques, and dyslexia-friendly formatting.',
 'published', 'beginner', 'Literacy', 'system', true, true, 'admin', true, 1, true, '13-17', true, true, true, 'guided', true,
 'dyslexia', ARRAY['dyslexia'], 13, now(), now()),

('A0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
 'Reading Comprehension: Dyslexia (18-24)', 'dyslexia-18-24',
 'Intermediate comprehension strategies for young adult learners with dyslexia. Focuses on summarisation, inference, and vocabulary building.',
 'published', 'intermediate', 'Literacy', 'system', true, true, 'admin', true, 2, true, '18-24', true, true, true, 'guided', true,
 'dyslexia', ARRAY['dyslexia'], 16, now(), now()),

('A0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002',
 'Academic Literacy: Dyslexia (25+)', 'dyslexia-25-plus',
 'Advanced literacy course for adult learners with dyslexia. Covers academic reading, report writing, and professional communication.',
 'published', 'advanced', 'Literacy', 'system', true, true, 'admin', true, 3, true, '25+', true, true, true, 'guided', true,
 'dyslexia', ARRAY['dyslexia'], 18, now(), now()),

-- ADHD COURSES
('A0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002',
 'Focus Skills: ADHD (13-17)', 'adhd-13-17',
 'Teaches attention management and organisational skills for secondary school learners with ADHD. Short lessons with built-in breaks.',
 'published', 'beginner', 'Study Skills', 'system', true, true, 'admin', true, 4, true, '13-17', true, true, true, 'focused', true,
 'adhd', ARRAY['adhd'], 13, now(), now()),

('A0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002',
 'Time Management: ADHD (18-24)', 'adhd-18-24',
 'Covers planning, prioritisation, and procrastination strategies for young adults with ADHD.',
 'published', 'intermediate', 'Study Skills', 'system', true, true, 'admin', true, 5, true, '18-24', true, true, true, 'focused', true,
 'adhd', ARRAY['adhd'], 16, now(), now()),

('A0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002',
 'Executive Function: ADHD (25+)', 'adhd-25-plus',
 'Advanced executive function training for adults with ADHD. Covers workplace productivity, habit formation, and self-regulation.',
 'published', 'advanced', 'Study Skills', 'system', true, true, 'admin', true, 6, true, '25+', true, true, true, 'focused', true,
 'adhd', ARRAY['adhd'], 18, now(), now()),

-- ASD COURSES
('A0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002',
 'Social Communication: ASD (13-17)', 'asd-13-17',
 'Develops social communication skills for secondary school learners on the autism spectrum. Uses visual supports and structured activities.',
 'published', 'beginner', 'Social Skills', 'system', true, true, 'admin', true, 7, true, '13-17', true, true, true, 'simplified', true,
 'asd', ARRAY['asd'], 13, now(), now()),

('A0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002',
 'Emotional Regulation: ASD (18-24)', 'asd-18-24',
 'Teaches emotional识别, coping strategies, and self-advocacy for young adults on the autism spectrum.',
 'published', 'intermediate', 'Social Skills', 'system', true, true, 'admin', true, 8, true, '18-24', true, true, true, 'simplified', true,
 'asd', ARRAY['asd'], 16, now(), now()),

('A0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000002',
 'Independent Living: ASD (25+)', 'asd-25-plus',
 'Covers daily living skills, financial literacy, and workplace social skills for adults on the autism spectrum.',
 'published', 'advanced', 'Life Skills', 'system', true, true, 'admin', true, 9, true, '25+', true, true, true, 'simplified', true,
 'asd', ARRAY['asd'], 18, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ─── 6. COURSE ACCESSIBILITY CATEGORIES ───────────────

INSERT INTO public.course_accessibility_categories (id, course_id, accessibility_category, created_at) VALUES
('40000000-0000-0000-0000-000000000001', 'A0000000-0000-0000-0000-000000000001', 'dyslexia', now()),
('40000000-0000-0000-0000-000000000002', 'A0000000-0000-0000-0000-000000000002', 'dyslexia', now()),
('40000000-0000-0000-0000-000000000003', 'A0000000-0000-0000-0000-000000000003', 'dyslexia', now()),
('40000000-0000-0000-0000-000000000004', 'A0000000-0000-0000-0000-000000000004', 'adhd',     now()),
('40000000-0000-0000-0000-000000000005', 'A0000000-0000-0000-0000-000000000005', 'adhd',     now()),
('40000000-0000-0000-0000-000000000006', 'A0000000-0000-0000-0000-000000000006', 'adhd',     now()),
('40000000-0000-0000-0000-000000000007', 'A0000000-0000-0000-0000-000000000007', 'asd',      now()),
('40000000-0000-0000-0000-000000000008', 'A0000000-0000-0000-0000-000000000008', 'asd',      now()),
('40000000-0000-0000-0000-000000000009', 'A0000000-0000-0000-0000-000000000009', 'asd',      now())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. COURSE CHAPTERS (3 per course = 27 total)
-- =====================================================

INSERT INTO public.course_chapters (id, course_id, title, description, sequence_order, created_at) VALUES
-- DYSLEXIA 13-17 (Course A0000000-0000-0000-0000-000000000001)
('B0000000-0000-0000-0000-000000000001', 'A0000000-0000-0000-0000-000000000001', 'Chapter 1: Letter Sounds', 'Introduction to letter-sound relationships using phonics.', 1, now()),
('B0000000-0000-0000-0000-000000000002', 'A0000000-0000-0000-0000-000000000001', 'Chapter 2: Blending Words', 'Combining sounds to form simple words.', 2, now()),
('B0000000-0000-0000-0000-000000000003', 'A0000000-0000-0000-0000-000000000001', 'Chapter 3: Reading Sentences', 'Reading and understanding short sentences.', 3, now()),

-- DYSLEXIA 18-24 (Course A0000000-0000-0000-0000-000000000002)
('B0000000-0000-0000-0000-000000000004', 'A0000000-0000-0000-0000-000000000002', 'Chapter 1: Main Idea Detection', 'Identifying the central idea of a passage.', 1, now()),
('B0000000-0000-0000-0000-000000000005', 'A0000000-0000-0000-0000-000000000002', 'Chapter 2: Inference Skills', 'Drawing conclusions from textual evidence.', 2, now()),
('B0000000-0000-0000-0000-000000000006', 'A0000000-0000-0000-0000-000000000002', 'Chapter 3: Vocabulary in Context', 'Understanding unfamiliar words through context clues.', 3, now()),

-- DYSLEXIA 25+ (Course A0000000-0000-0000-0000-000000000003)
('B0000000-0000-0000-0000-000000000007', 'A0000000-0000-0000-0000-000000000003', 'Chapter 1: Academic Reading', 'Strategies for reading academic texts and research articles.', 1, now()),
('B0000000-0000-0000-0000-000000000008', 'A0000000-0000-0000-0000-000000000003', 'Chapter 2: Report Writing', 'Structuring and writing professional reports.', 2, now()),
('B0000000-0000-0000-0000-000000000009', 'A0000000-0000-0000-0000-000000000003', 'Chapter 3: Professional Communication', 'Writing emails, memos, and workplace documents.', 3, now()),

-- ADHD 13-17 (Course A0000000-0000-0000-0000-000000000004)
('B0000000-0000-0000-0000-000000000010', 'A0000000-0000-0000-0000-000000000004', 'Chapter 1: Understanding Attention', 'What is attention and how does it work?', 1, now()),
('B0000000-0000-0000-0000-000000000011', 'A0000000-0000-0000-0000-000000000004', 'Chapter 2: Breaking Down Tasks', 'Techniques for managing large assignments.', 2, now()),
('B0000000-0000-0000-0000-000000000012', 'A0000000-0000-0000-0000-000000000004', 'Chapter 3: Building Routines', 'Creating daily schedules that work.', 3, now()),

-- ADHD 18-24 (Course A0000000-0000-0000-0000-000000000005)
('B0000000-0000-0000-0000-000000000013', 'A0000000-0000-0000-0000-000000000005', 'Chapter 1: Planning Your Week', 'Weekly planning methods for university students.', 1, now()),
('B0000000-0000-0000-0000-000000000014', 'A0000000-0000-0000-0000-000000000005', 'Chapter 2: Beating Procrastination', 'Evidence-based strategies to overcome procrastination.', 2, now()),
('B0000000-0000-0000-0000-000000000015', 'A0000000-0000-0000-0000-000000000005', 'Chapter 3: Prioritisation Matrix', 'Using Eisenhower matrix and other prioritisation tools.', 3, now()),

-- ADHD 25+ (Course A0000000-0000-0000-0000-000000000006)
('B0000000-0000-0000-0000-000000000016', 'A0000000-0000-0000-0000-000000000006', 'Chapter 1: Workplace Productivity', 'Managing ADHD in professional settings.', 1, now()),
('B0000000-0000-0000-0000-000000000017', 'A0000000-0000-0000-0000-000000000006', 'Chapter 2: Habit Formation', 'Building sustainable habits using neuroplasticity principles.', 2, now()),
('B0000000-0000-0000-0000-000000000018', 'A0000000-0000-0000-0000-000000000006', 'Chapter 3: Self-Regulation', 'Emotional regulation and impulse control techniques.', 3, now()),

-- ASD 13-17 (Course A0000000-0000-0000-0000-000000000007)
('B0000000-0000-0000-0000-000000000019', 'A0000000-0000-0000-0000-000000000007', 'Chapter 1: Reading Social Cues', 'Understanding facial expressions and body language.', 1, now()),
('B0000000-0000-0000-0000-000000000020', 'A0000000-0000-0000-0000-000000000007', 'Chapter 2: Conversation Skills', 'Turn-taking, topic maintenance, and appropriate responses.', 2, now()),
('B0000000-0000-0000-0000-000000000021', 'A0000000-0000-0000-0000-000000000007', 'Chapter 3: Friendship Building', 'Making and keeping friends in school settings.', 3, now()),

-- ASD 18-24 (Course A0000000-0000-0000-0000-000000000008)
('B0000000-0000-0000-0000-000000000022', 'A0000000-0000-0000-0000-000000000008', 'Chapter 1: Emotion Identification', 'Recognising and naming your own emotions.', 1, now()),
('B0000000-0000-0000-0000-000000000023', 'A0000000-0000-0000-0000-000000000008', 'Chapter 2: Coping Strategies', 'Healthy ways to manage stress and anxiety.', 2, now()),
('B0000000-0000-0000-0000-000000000024', 'A0000000-0000-0000-0000-000000000008', 'Chapter 3: Self-Advocacy', 'Communicating your needs to others effectively.', 3, now()),

-- ASD 25+ (Course A0000000-0000-0000-0000-000000000009)
('B0000000-0000-0000-0000-000000000025', 'A0000000-0000-0000-0000-000000000009', 'Chapter 1: Daily Living Skills', 'Managing household tasks, cooking, and personal care.', 1, now()),
('B0000000-0000-0000-0000-000000000026', 'A0000000-0000-0000-0000-000000000009', 'Chapter 2: Financial Literacy', 'Budgeting, banking, and managing money independently.', 2, now()),
('B0000000-0000-0000-0000-000000000027', 'A0000000-0000-0000-0000-000000000009', 'Chapter 3: Workplace Social Skills', 'Navigating workplace interactions and professional norms.', 3, now())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 8. LESSONS (2 per chapter = 54 lessons)
-- =====================================================
-- Columns: id, course_id, title, content_html, video_url, transcript, sequence_order,
--          status, created_at, updated_at, estimated_duration, chapter_id, chapter_title,
--          learning_objectives, lesson_type, has_video, has_pdf, has_quiz

INSERT INTO public.lessons (id, course_id, title, content_html, sequence_order, status, created_at, updated_at, estimated_duration, chapter_id, chapter_title, learning_objectives, lesson_type, has_video, has_pdf, has_quiz) VALUES

-- ─── DYSLEXIA 13-17, Chapter 1: Letter Sounds ────────
('C0000000-0000-0000-0000-000000000001', 'A0000000-0000-0000-0000-000000000001',
 'Vowel Sounds', '<p>Learn the five vowel sounds: A, E, I, O, U. Each vowel makes a short sound and a long sound.</p>', 1, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000001', 'Chapter 1: Letter Sounds',
 'Identify the five vowels; Distinguish between short and long vowel sounds.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000002', 'A0000000-0000-0000-0000-000000000001',
 'Consonant Blends', '<p>Learn how consonant blends work: bl, br, cl, dr, fl, gr, pl, pr, tr.</p>', 2, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000001', 'Chapter 1: Letter Sounds',
 'Recognise common consonant blends; Read words containing consonant blends.',
 'standard', true, true, true),

-- ─── DYSLEXIA 13-17, Chapter 2: Blending Words ───────
('C0000000-0000-0000-0000-000000000003', 'A0000000-0000-0000-0000-000000000001',
 'CVC Words', '<p>Consonant-Vowel-Consonant words: cat, dog, pig, run, sit. Blend the sounds together.</p>', 3, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000002', 'Chapter 2: Blending Words',
 'Blend CVC words; Read simple one-syllable words.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000004', 'A0000000-0000-0000-0000-000000000001',
 'Digraph Sounds', '<p>Digraphs: sh, ch, th, wh, ph. Two letters that make one sound.</p>', 4, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000002', 'Chapter 2: Blending Words',
 'Identify common digraphs; Read words containing digraphs.',
 'standard', true, true, true),

-- ─── DYSLEXIA 13-17, Chapter 3: Reading Sentences ────
('C0000000-0000-0000-0000-000000000005', 'A0000000-0000-0000-0000-000000000001',
 'Short Sentences', '<p>Read and understand short sentences: "The cat sat on the mat." "I can see a dog."</p>', 5, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000003', 'Chapter 3: Reading Sentences',
 'Read simple sentences fluently; Answer comprehension questions.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000006', 'A0000000-0000-0000-0000-000000000001',
 'Sentence Completion', '<p>Complete sentences by choosing the correct word. "The boy ___ to school." (goes/go)</p>', 6, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000003', 'Chapter 3: Reading Sentences',
 'Use context clues to complete sentences; Demonstrate basic reading comprehension.',
 'standard', true, true, true),

-- ─── DYSLEXIA 18-24, Chapter 1: Main Idea Detection ──
('C0000000-0000-0000-0000-000000000007', 'A0000000-0000-0000-0000-000000000002',
 'Identifying Main Ideas', '<p>Learn to identify the main idea of a paragraph. The main idea is what the text is mostly about.</p>', 1, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000004', 'Chapter 1: Main Idea Detection',
 'Identify main ideas in short passages; Distinguish main ideas from supporting details.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000008', 'A0000000-0000-0000-0000-000000000002',
 'Supporting Details', '<p>Supporting details are facts and examples that explain the main idea.</p>', 2, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000004', 'Chapter 1: Main Idea Detection',
 'Identify supporting details; Match details to main ideas.',
 'standard', true, true, true),

-- ─── DYSLEXIA 18-24, Chapter 2: Inference Skills ─────
('C0000000-0000-0000-0000-000000000009', 'A0000000-0000-0000-0000-000000000002',
 'Making Inferences', '<p>Inference means reading between the lines. Use clues from the text to understand what the author does not say directly.</p>', 3, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000005', 'Chapter 2: Inference Skills',
 'Make inferences from short passages; Support inferences with textual evidence.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000010', 'A0000000-0000-0000-0000-000000000002',
 'Drawing Conclusions', '<p>Use information from the text plus your own knowledge to draw conclusions.</p>', 4, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000005', 'Chapter 2: Inference Skills',
 'Draw logical conclusions from texts; Differentiate between fact and opinion.',
 'standard', true, true, true),

-- ─── DYSLEXIA 18-24, Chapter 3: Vocabulary in Context ─
('C0000000-0000-0000-0000-000000000011', 'A0000000-0000-0000-0000-000000000002',
 'Context Clues', '<p>Use context clues to figure out the meaning of unfamiliar words. Look at the words around the unknown word.</p>', 5, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000006', 'Chapter 3: Vocabulary in Context',
 'Use context clues to determine word meanings; Build vocabulary through reading.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000012', 'A0000000-0000-0000-0000-000000000002',
 'Word Parts Strategy', '<p>Break words into prefixes, roots, and suffixes to understand their meaning: un-happy, re-build, teach-er.</p>', 6, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000006', 'Chapter 3: Vocabulary in Context',
 'Identify prefixes and suffixes; Use word parts to decode unfamiliar vocabulary.',
 'standard', true, true, true),

-- ─── DYSLEXIA 25+, Chapter 1: Academic Reading ───────
('C0000000-0000-0000-0000-000000000013', 'A0000000-0000-0000-0000-000000000003',
 'Reading Research Articles', '<p>Strategies for reading academic papers: read the abstract first, then conclusion, then body.</p>', 1, 'published', now(), now(), 30,
 'B0000000-0000-0000-0000-000000000007', 'Chapter 1: Academic Reading',
 'Apply SQ3R method to academic texts; Identify key arguments in research articles.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000014', 'A0000000-0000-0000-0000-000000000003',
 'Critical Reading', '<p>Critical reading involves evaluating arguments, identifying biases, and analysing evidence.</p>', 2, 'published', now(), now(), 30,
 'B0000000-0000-0000-0000-000000000007', 'Chapter 1: Academic Reading',
 'Evaluate the strength of arguments; Identify logical fallacies in texts.',
 'standard', true, true, true),

-- ─── DYSLEXIA 25+, Chapter 2: Report Writing ─────────
('C0000000-0000-0000-0000-000000000015', 'A0000000-0000-0000-0000-000000000003',
 'Report Structure', '<p>A standard report includes: title page, table of contents, introduction, findings, conclusions, recommendations, references.</p>', 3, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000008', 'Chapter 2: Report Writing',
 'Structure a professional report; Write clear headings and subheadings.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000016', 'A0000000-0000-0000-0000-000000000003',
 'Cohesive Writing', '<p>Use linking words to connect ideas: therefore, however, in addition, consequently.</p>', 4, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000008', 'Chapter 2: Report Writing',
 'Use cohesive devices to link paragraphs; Write coherent paragraphs.',
 'standard', true, true, true),

-- ─── DYSLEXIA 25+, Chapter 3: Professional Communication ─
('C0000000-0000-0000-0000-000000000017', 'A0000000-0000-0000-0000-000000000003',
 'Email Etiquette', '<p>Professional email writing: clear subject line, proper greeting, concise body, professional closing.</p>', 5, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000009', 'Chapter 3: Professional Communication',
 'Write professional emails; Use appropriate tone and formatting.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000018', 'A0000000-0000-0000-0000-000000000003',
 'Memo Writing', '<p>Memos are short internal documents used in workplaces. Format: To, From, Date, Subject, Body.</p>', 6, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000009', 'Chapter 3: Professional Communication',
 'Write workplace memos; Follow standard memo formatting.',
 'standard', true, true, true),

-- ─── ADHD 13-17, Chapter 1: Understanding Attention ──
('C0000000-0000-0000-0000-000000000019', 'A0000000-0000-0000-0000-000000000004',
 'What is Attention?', '<p>Attention is the ability to focus on something. Different types of attention: sustained, selective, divided.</p>', 1, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000010', 'Chapter 1: Understanding Attention',
 'Define different types of attention; Recognise your own attention patterns.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000020', 'A0000000-0000-0000-0000-000000000004',
 'Focus Techniques', '<p>Pomodoro technique: work for 25 minutes, break for 5. Brain fog strategies: movement breaks, water, deep breathing.</p>', 2, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000010', 'Chapter 1: Understanding Attention',
 'Apply Pomodoro technique; Use focus strategies to manage distractions.',
 'standard', true, true, true),

-- ─── ADHD 13-17, Chapter 2: Breaking Down Tasks ──────
('C0000000-0000-0000-0000-000000000021', 'A0000000-0000-0000-0000-000000000004',
 'Task Chunking', '<p>Break big tasks into small steps. Example: "Write an essay" becomes: 1) Choose topic, 2) Write outline, 3) Write intro...</p>', 3, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000011', 'Chapter 2: Breaking Down Tasks',
 'Break complex tasks into manageable steps; Create action lists.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000022', 'A0000000-0000-0000-0000-000000000004',
 'Checklists and Lists', '<p>Use checklists to track progress. Crossing items off feels rewarding and keeps you on track.</p>', 4, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000011', 'Chapter 2: Breaking Down Tasks',
 'Create effective checklists; Use visual progress trackers.',
 'standard', true, true, true),

-- ─── ADHD 13-17, Chapter 3: Building Routines ────────
('C0000000-0000-0000-0000-000000000023', 'A0000000-0000-0000-0000-000000000004',
 'Morning and Evening Routines', '<p>Create simple routines for morning and evening. Same steps every day build habits.</p>', 5, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000012', 'Chapter 3: Building Routines',
 'Design a morning routine; Design an evening routine.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000024', 'A0000000-0000-0000-0000-000000000004',
 'Habit Stacking', '<p>Attach new habits to existing ones. Example: "After I brush my teeth, I will review my notes for 5 minutes."</p>', 6, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000012', 'Chapter 3: Building Routines',
 'Apply habit stacking technique; Create a personalised daily routine.',
 'standard', true, true, true),

-- ─── ADHD 18-24, Chapter 1: Planning Your Week ───────
('C0000000-0000-0000-0000-000000000025', 'A0000000-0000-0000-0000-000000000005',
 'Weekly Planning Methods', '<p>Sunday planning session: review calendar, set priorities, block time for deep work and shallow tasks.</p>', 1, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000013', 'Chapter 1: Planning Your Week',
 'Conduct a weekly planning session; Block time for focused work.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000026', 'A0000000-0000-0000-0000-000000000005',
 'Digital vs Paper Planning', '<p>Compare apps (Google Calendar, Notion) with paper planners. Choose what works for your brain.</p>', 2, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000013', 'Chapter 1: Planning Your Week',
 'Evaluate digital and paper planning tools; Select a planning system.',
 'standard', true, true, true),

-- ─── ADHD 18-24, Chapter 2: Beating Procrastination ──
('C0000000-0000-0000-0000-000000000027', 'A0000000-0000-0000-0000-000000000005',
 'Why We Procrastinate', '<p>Procrastination is not laziness. It is an emotional regulation problem. Understanding the cause helps fix it.</p>', 3, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000014', 'Chapter 2: Beating Procrastination',
 'Identify personal procrastination triggers; Understand the emotional basis of procrastination.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000028', 'A0000000-0000-0000-0000-000000000005',
 'Anti-Procrastination Strategies', '<p>5-minute rule: commit to just 5 minutes. If you still want to stop after 5 minutes, you can. Usually you will continue.</p>', 4, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000014', 'Chapter 2: Beating Procrastination',
 'Apply the 5-minute rule; Use implementation intentions.',
 'standard', true, true, true),

-- ─── ADHD 18-24, Chapter 3: Prioritisation Matrix ────
('C0000000-0000-0000-0000-000000000029', 'A0000000-0000-0000-0000-000000000005',
 'Eisenhower Matrix', '<p>Four quadrants: Urgent+Important (do now), Important+Not Urgent (schedule), Urgent+Not Important (delegate), Neither (eliminate).</p>', 5, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000015', 'Chapter 3: Prioritisation Matrix',
 'Categorise tasks using the Eisenhower Matrix; Apply prioritisation to real tasks.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000030', 'A0000000-0000-0000-0000-000000000005',
 'ABC Method', '<p>Rank tasks A (must do), B (should do), C (nice to do). Focus on A tasks first.</p>', 6, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000015', 'Chapter 3: Prioritisation Matrix',
 'Apply ABC prioritisation method; Combine with Eisenhower matrix.',
 'standard', true, true, true),

-- ─── ADHD 25+, Chapter 1: Workplace Productivity ──────
('C0000000-0000-0000-0000-000000000031', 'A0000000-0000-0000-0000-000000000006',
 'ADHD at Work', '<p>Common workplace challenges: time blindness, task switching, hyperfocus on wrong things. Strategies for each.</p>', 1, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000016', 'Chapter 1: Workplace Productivity',
 'Identify ADHD-related workplace challenges; Apply targeted productivity strategies.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000032', 'A0000000-0000-0000-0000-000000000006',
 'Managing Time Blindness', '<p>Time blindness: not feeling the passage of time. Solutions: visual timers, alarms, time-blocking.</p>', 2, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000016', 'Chapter 1: Workplace Productivity',
 'Use visual timers and alarms; Implement time-blocking in your schedule.',
 'standard', true, true, true),

-- ─── ADHD 25+, Chapter 2: Habit Formation ────────────
('C0000000-0000-0000-0000-000000000033', 'A0000000-0000-0000-0000-000000000006',
 'The Habit Loop', '<p>Cue, Routine, Reward. Understanding the loop helps you build good habits and break bad ones.</p>', 3, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000017', 'Chapter 2: Habit Formation',
 'Identify habit loops in your behaviour; Design new habit loops.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000034', 'A0000000-0000-0000-0000-000000000006',
 '21-Day Habit Tracker', '<p>Track your new habit daily for 21 days. Use a simple yes/no tracker. Missing one day is ok, missing two is a pattern.</p>', 4, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000017', 'Chapter 2: Habit Formation',
 'Use a habit tracker for 21 days; Identify and address habit-breaking patterns.',
 'standard', true, true, true),

-- ─── ADHD 25+, Chapter 3: Self-Regulation ────────────
('C0000000-0000-0000-0000-000000000035', 'A0000000-0000-0000-0000-000000000006',
 'Emotional Dysregulation', '<p>ADHD makes emotions stronger and harder to manage. Recognise your triggers and have a plan.</p>', 5, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000018', 'Chapter 3: Self-Regulation',
 'Identify emotional triggers; Create an emotional regulation plan.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000036', 'A0000000-0000-0000-0000-000000000006',
 'Impulse Control', '<p>The STOP technique: Stop, Think, Observe, Proceed. Use it before making decisions.</p>', 6, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000018', 'Chapter 3: Self-Regulation',
 'Apply the STOP technique; Practise delayed gratification.',
 'standard', true, true, true),

-- ─── ASD 13-17, Chapter 1: Reading Social Cues ───────
('C0000000-0000-0000-0000-000000000037', 'A0000000-0000-0000-0000-000000000007',
 'Facial Expressions', '<p>Learn the six basic emotions: happy, sad, angry, surprised, scared, disgusted. Match expressions to emotions.</p>', 1, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000019', 'Chapter 1: Reading Social Cues',
 'Identify six basic facial expressions; Match expressions to emotions.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000038', 'A0000000-0000-0000-0000-000000000007',
 'Body Language', '<p>Posture, gestures, and personal space communicate feelings. Arms crossed = closed. Leaning in = interested.</p>', 2, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000019', 'Chapter 1: Reading Social Cues',
 'Interpret common body language signals; Respect personal space boundaries.',
 'standard', true, true, true),

-- ─── ASD 13-17, Chapter 2: Conversation Skills ───────
('C0000000-0000-0000-0000-000000000039', 'A0000000-0000-0000-0000-000000000007',
 'Turn-Taking in Conversation', '<p>Conversation is like a game of tennis: you hit, they hit. Wait for the other person to finish before speaking.</p>', 3, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000020', 'Chapter 2: Conversation Skills',
 'Practise turn-taking in conversations; Avoid interrupting.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000040', 'A0000000-0000-0000-0000-000000000007',
 'Topic Maintenance', '<p>Staying on topic: link your words to what the other person said. Ask questions related to the topic.</p>', 4, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000020', 'Chapter 2: Conversation Skills',
 'Stay on topic during conversations; Ask relevant questions.',
 'standard', true, true, true),

-- ─── ASD 13-17, Chapter 3: Friendship Building ───────
('C0000000-0000-0000-0000-000000000041', 'A0000000-0000-0000-0000-000000000007',
 'Making Friends', '<p>Find people with similar interests. Join clubs, start conversations, share activities.</p>', 5, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000021', 'Chapter 3: Friendship Building',
 'Identify strategies for making friends; Practise initiating conversations.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000042', 'A0000000-0000-0000-0000-000000000007',
 'Keeping Friends', '<p>Friendship maintenance: check in regularly, show interest in their life, be reliable, apologise when wrong.</p>', 6, 'published', now(), now(), 15,
 'B0000000-0000-0000-0000-000000000021', 'Chapter 3: Friendship Building',
 'Apply friendship maintenance strategies; Resolve conflicts peacefully.',
 'standard', true, true, true),

-- ─── ASD 18-24, Chapter 1: Emotion Identification ────
('C0000000-0000-0000-0000-000000000043', 'A0000000-0000-0000-0000-000000000008',
 'Naming Your Emotions', '<p>Use an emotions wheel to identify exactly what you are feeling. Fine-grained labels help regulate emotions.</p>', 1, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000022', 'Chapter 1: Emotion Identification',
 'Use an emotions wheel to identify feelings; Distinguish between similar emotions.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000044', 'A0000000-0000-0000-0000-000000000008',
 'Emotional Triggers', '<p>Identify situations, people, or sensory inputs that trigger strong emotional responses. Keep a trigger journal.</p>', 2, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000022', 'Chapter 1: Emotion Identification',
 'Identify personal emotional triggers; Record triggers in a journal.',
 'standard', true, true, true),

-- ─── ASD 18-24, Chapter 2: Coping Strategies ─────────
('C0000000-0000-0000-0000-000000000045', 'A0000000-0000-0000-0000-000000000008',
 'Sensory Regulation', '<p>Identify your sensory needs: noise-cancelling headphones, fidget tools, weighted blankets, dim lighting.</p>', 3, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000023', 'Chapter 2: Coping Strategies',
 'Identify sensory needs; Create a sensory regulation toolkit.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000046', 'A0000000-0000-0000-0000-000000000008',
 'Anxiety Management', '<p>Grounding techniques: 5-4-3-2-1 (5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste).</p>', 4, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000023', 'Chapter 2: Coping Strategies',
 'Apply grounding techniques; Manage anxiety in social situations.',
 'standard', true, true, true),

-- ─── ASD 18-24, Chapter 3: Self-Advocacy ─────────────
('C0000000-0000-0000-0000-000000000047', 'A0000000-0000-0000-0000-000000000008',
 'Communicating Your Needs', '<p>Be direct and specific about what you need. Example: "I need a quiet space to work" rather than "This is too loud."</p>', 5, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000024', 'Chapter 3: Self-Advocacy',
 'State needs clearly and specifically; Practise self-advocacy scripts.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000048', 'A0000000-0000-0000-0000-000000000008',
 'Disclosure Decisions', '<p>Deciding whether to disclose your autism to others: pros, cons, and how to do it safely.</p>', 6, 'published', now(), now(), 20,
 'B0000000-0000-0000-0000-000000000024', 'Chapter 3: Self-Advocacy',
 'Evaluate disclosure options; Practise disclosure conversations.',
 'standard', true, true, true),

-- ─── ASD 25+, Chapter 1: Daily Living Skills ─────────
('C0000000-0000-0000-0000-000000000049', 'A0000000-0000-0000-0000-000000000009',
 'Household Management', '<p>Creating cleaning schedules, doing laundry, washing dishes. Use visual schedules and checklists.</p>', 1, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000025', 'Chapter 1: Daily Living Skills',
 'Create a household cleaning schedule; Follow step-by-step routines.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000050', 'A0000000-0000-0000-0000-000000000009',
 'Meal Planning', '<p>Simple meal planning: plan 5 dinners, write a shopping list, cook one meal at a time.</p>', 2, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000025', 'Chapter 1: Daily Living Skills',
 'Create a weekly meal plan; Write a structured shopping list.',
 'standard', true, true, true),

-- ─── ASD 25+, Chapter 2: Financial Literacy ──────────
('C0000000-0000-0000-0000-000000000051', 'A0000000-0000-0000-0000-000000000009',
 'Budgeting Basics', '<p>Track income and expenses. Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings.</p>', 3, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000026', 'Chapter 2: Financial Literacy',
 'Create a monthly budget; Apply the 50/30/20 rule.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000052', 'A0000000-0000-0000-0000-000000000009',
 'Banking and Payments', '<p>Using bank accounts, ATM cards, online banking, and paying bills on time.</p>', 4, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000026', 'Chapter 2: Financial Literacy',
 'Navigate online banking; Set up automatic bill payments.',
 'standard', true, true, true),

-- ─── ASD 25+, Chapter 3: Workplace Social Skills ──────
('C0000000-0000-0000-0000-000000000053', 'A0000000-0000-0000-0000-000000000009',
 'Workplace Communication', '<p>Email, meetings, and conversations with colleagues. Professional tone, appropriate topics, reading between the lines.</p>', 5, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000027', 'Chapter 3: Workplace Social Skills',
 'Write professional workplace emails; Navigate meeting etiquette.',
 'standard', true, true, true),

('C0000000-0000-0000-0000-000000000054', 'A0000000-0000-0000-0000-000000000009',
 'Handling Workplace Conflict', '<p>Disagreements happen. Use "I feel" statements, listen to the other person, find a compromise.</p>', 6, 'published', now(), now(), 25,
 'B0000000-0000-0000-0000-000000000027', 'Chapter 3: Workplace Social Skills',
 'Apply "I feel" statements; Practise conflict resolution steps.',
 'standard', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 9. QUIZZES (1 per lesson = 54 quizzes)
-- =====================================================
-- Columns: id, lesson_id, title, time_limit_seconds, max_attempts, pass_threshold_pct,
--          created_at, updated_at

INSERT INTO public.quizzes (id, lesson_id, title, time_limit_seconds, max_attempts, pass_threshold_pct, created_at, updated_at) VALUES
-- DYSLEXIA 13-17 quizzes
('D0000000-0000-0000-0000-000000000001', 'C0000000-0000-0000-0000-000000000001', 'Vowel Sounds Quiz',  300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000002', 'C0000000-0000-0000-0000-000000000002', 'Consonant Blends Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000003', 'C0000000-0000-0000-0000-000000000003', 'CVC Words Quiz',     300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000004', 'C0000000-0000-0000-0000-000000000004', 'Digraph Sounds Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000005', 'C0000000-0000-0000-0000-000000000005', 'Short Sentences Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000006', 'C0000000-0000-0000-0000-000000000006', 'Sentence Completion Quiz', 300, 3, 60, now(), now()),
-- DYSLEXIA 18-24 quizzes
('D0000000-0000-0000-0000-000000000007', 'C0000000-0000-0000-0000-000000000007', 'Main Idea Quiz',     300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000008', 'C0000000-0000-0000-0000-000000000008', 'Supporting Details Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000009', 'C0000000-0000-0000-0000-000000000009', 'Making Inferences Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000010', 'C0000000-0000-0000-0000-000000000010', 'Drawing Conclusions Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000011', 'C0000000-0000-0000-0000-000000000011', 'Context Clues Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000012', 'C0000000-0000-0000-0000-000000000012', 'Word Parts Quiz',    300, 3, 60, now(), now()),
-- DYSLEXIA 25+ quizzes
('D0000000-0000-0000-0000-000000000013', 'C0000000-0000-0000-0000-000000000013', 'Academic Reading Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000014', 'C0000000-0000-0000-0000-000000000014', 'Critical Reading Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000015', 'C0000000-0000-0000-0000-000000000015', 'Report Structure Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000016', 'C0000000-0000-0000-0000-000000000016', 'Cohesive Writing Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000017', 'C0000000-0000-0000-0000-000000000017', 'Email Etiquette Quiz',  300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000018', 'C0000000-0000-0000-0000-000000000018', 'Memo Writing Quiz',    300, 3, 60, now(), now()),
-- ADHD 13-17 quizzes
('D0000000-0000-0000-0000-000000000019', 'C0000000-0000-0000-0000-000000000019', 'What is Attention Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000020', 'C0000000-0000-0000-0000-000000000020', 'Focus Techniques Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000021', 'C0000000-0000-0000-0000-000000000021', 'Task Chunking Quiz',    300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000022', 'C0000000-0000-0000-0000-000000000022', 'Checklists Quiz',       300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000023', 'C0000000-0000-0000-0000-000000000023', 'Morning Routine Quiz',  300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000024', 'C0000000-0000-0000-0000-000000000024', 'Habit Stacking Quiz',   300, 3, 60, now(), now()),
-- ADHD 18-24 quizzes
('D0000000-0000-0000-0000-000000000025', 'C0000000-0000-0000-0000-000000000025', 'Weekly Planning Quiz',  300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000026', 'C0000000-0000-0000-0000-000000000026', 'Digital vs Paper Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000027', 'C0000000-0000-0000-0000-000000000027', 'Why Procrastinate Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000028', 'C0000000-0000-0000-0000-000000000028', 'Anti-Procrastination Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000029', 'C0000000-0000-0000-0000-000000000029', 'Eisenhower Matrix Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000030', 'C0000000-0000-0000-0000-000000000030', 'ABC Method Quiz',       300, 3, 60, now(), now()),
-- ADHD 25+ quizzes
('D0000000-0000-0000-0000-000000000031', 'C0000000-0000-0000-0000-000000000031', 'ADHD at Work Quiz',     300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000032', 'C0000000-0000-0000-0000-000000000032', 'Time Blindness Quiz',   300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000033', 'C0000000-0000-0000-0000-000000000033', 'Habit Loop Quiz',       300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000034', 'C0000000-0000-0000-0000-000000000034', 'Habit Tracker Quiz',    300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000035', 'C0000000-0000-0000-0000-000000000035', 'Emotional Regulation Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000036', 'C0000000-0000-0000-0000-000000000036', 'STOP Technique Quiz',   300, 3, 60, now(), now()),
-- ASD 13-17 quizzes
('D0000000-0000-0000-0000-000000000037', 'C0000000-0000-0000-0000-000000000037', 'Facial Expressions Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000038', 'C0000000-0000-0000-0000-000000000038', 'Body Language Quiz',    300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000039', 'C0000000-0000-0000-0000-000000000039', 'Turn-Taking Quiz',      300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000040', 'C0000000-0000-0000-0000-000000000040', 'Topic Maintenance Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000041', 'C0000000-0000-0000-0000-000000000041', 'Making Friends Quiz',   300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000042', 'C0000000-0000-0000-0000-000000000042', 'Keeping Friends Quiz',  300, 3, 60, now(), now()),
-- ASD 18-24 quizzes
('D0000000-0000-0000-0000-000000000043', 'C0000000-0000-0000-0000-000000000043', 'Emotions Wheel Quiz',   300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000044', 'C0000000-0000-0000-0000-000000000044', 'Triggers Quiz',         300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000045', 'C0000000-0000-0000-0000-000000000045', 'Sensory Needs Quiz',    300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000046', 'C0000000-0000-0000-0000-000000000046', 'Grounding Quiz',        300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000047', 'C0000000-0000-0000-0000-000000000047', 'Communicating Needs Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000048', 'C0000000-0000-0000-0000-000000000048', 'Disclosure Quiz',       300, 3, 60, now(), now()),
-- ASD 25+ quizzes
('D0000000-0000-0000-0000-000000000049', 'C0000000-0000-0000-0000-000000000049', 'Household Quiz',        300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000050', 'C0000000-0000-0000-0000-000000000050', 'Meal Planning Quiz',    300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000051', 'C0000000-0000-0000-0000-000000000051', 'Budgeting Quiz',        300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000052', 'C0000000-0000-0000-0000-000000000052', 'Banking Quiz',          300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000053', 'C0000000-0000-0000-0000-000000000053', 'Workplace Communication Quiz', 300, 3, 60, now(), now()),
('D0000000-0000-0000-0000-000000000054', 'C0000000-0000-0000-0000-000000000054', 'Conflict Resolution Quiz', 300, 3, 60, now(), now())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 10. QUIZ QUESTIONS (2 per quiz = 54 questions)
-- =====================================================
-- Columns: id, quiz_id, question_text, question_type, sequence_order, created_at

INSERT INTO public.quiz_questions (id, quiz_id, question_text, question_type, sequence_order, created_at) VALUES
-- DYSLEXIA 13-17 Quiz 1: Vowel Sounds
('E0000000-0000-0000-0000-000000000001', 'D0000000-0000-0000-0000-000000000001', 'Which letter is a vowel?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000002', 'D0000000-0000-0000-0000-000000000001', 'What sound does "a" make in "cat"?', 'multiple-choice', 2, now()),
-- DYSLEXIA 13-17 Quiz 2: Consonant Blends
('E0000000-0000-0000-0000-000000000003', 'D0000000-0000-0000-0000-000000000002', 'Which is a consonant blend?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000004', 'D0000000-0000-0000-0000-000000000002', 'What sound does "bl" make?', 'multiple-choice', 2, now()),
-- DYSLEXIA 13-17 Quiz 3: CVC Words
('E0000000-0000-0000-0000-000000000005', 'D0000000-0000-0000-0000-000000000003', 'Which is a CVC word?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000006', 'D0000000-0000-0000-0000-000000000003', 'What does C-V-C stand for?', 'multiple-choice', 2, now()),
-- DYSLEXIA 13-17 Quiz 4: Digraph Sounds
('E0000000-0000-0000-0000-000000000007', 'D0000000-0000-0000-0000-000000000004', 'Which is a digraph?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000008', 'D0000000-0000-0000-0000-000000000004', 'What sound does "sh" make?', 'multiple-choice', 2, now()),
-- DYSLEXIA 13-17 Quiz 5: Short Sentences
('E0000000-0000-0000-0000-000000000009', 'D0000000-0000-0000-0000-000000000005', 'What did the cat sit on?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000010', 'D0000000-0000-0000-0000-000000000005', 'Complete: "I can ___ a dog."', 'multiple-choice', 2, now()),
-- DYSLEXIA 13-17 Quiz 6: Sentence Completion
('E0000000-0000-0000-0000-000000000011', 'D0000000-0000-0000-0000-000000000006', 'Which word completes: "The boy ___ to school"?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000012', 'D0000000-0000-0000-0000-000000000006', 'Which is a complete sentence?', 'multiple-choice', 2, now()),
-- DYSLEXIA 18-24 Quiz 7: Main Idea
('E0000000-0000-0000-0000-000000000013', 'D0000000-0000-0000-0000-000000000007', 'What is the main idea of a paragraph?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000014', 'D0000000-0000-0000-0000-000000000007', 'How is a main idea different from a detail?', 'multiple-choice', 2, now()),
-- DYSLEXIA 18-24 Quiz 8: Supporting Details
('E0000000-0000-0000-0000-000000000015', 'D0000000-0000-0000-0000-000000000008', 'What are supporting details?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000016', 'D0000000-0000-0000-0000-000000000008', 'Which is a supporting detail for "cats are independent"?', 'multiple-choice', 2, now()),
-- DYSLEXIA 18-24 Quiz 9: Inference
('E0000000-0000-0000-0000-000000000017', 'D0000000-0000-0000-0000-000000000009', 'What is an inference?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000018', 'D0000000-0000-0000-0000-000000000009', 'What is the difference between fact and inference?', 'multiple-choice', 2, now()),
-- DYSLEXIA 18-24 Quiz 10: Drawing Conclusions
('E0000000-0000-0000-0000-000000000019', 'D0000000-0000-0000-0000-000000000010', 'What does drawing conclusions require?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000020', 'D0000000-0000-0000-0000-000000000010', 'How is a conclusion different from a fact?', 'multiple-choice', 2, now()),
-- DYSLEXIA 18-24 Quiz 11: Context Clues
('E0000000-0000-0000-0000-000000000021', 'D0000000-0000-0000-0000-000000000011', 'What is a context clue?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000022', 'D0000000-0000-0000-0000-000000000011', 'Which strategy helps with unknown words?', 'multiple-choice', 2, now()),
-- DYSLEXIA 18-24 Quiz 12: Word Parts
('E0000000-0000-0000-0000-000000000023', 'D0000000-0000-0000-0000-000000000012', 'What is a prefix?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000024', 'D0000000-0000-0000-0000-000000000012', 'Break down "unhappy" into word parts.', 'multiple-choice', 2, now()),
-- DYSLEXIA 25+ Quiz 13: Academic Reading
('E0000000-0000-0000-0000-000000000025', 'D0000000-0000-0000-0000-000000000013', 'What should you read first in a research paper?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000026', 'D0000000-0000-0000-0000-000000000013', 'What is the SQ3R method?', 'multiple-choice', 2, now()),
-- DYSLEXIA 25+ Quiz 14: Critical Reading
('E0000000-0000-0000-0000-000000000027', 'D0000000-0000-0000-0000-000000000014', 'What is critical reading?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000028', 'D0000000-0000-0000-0000-000000000014', 'How do you identify bias in a text?', 'multiple-choice', 2, now()),
-- DYSLEXIA 25+ Quiz 15: Report Structure
('E0000000-0000-0000-0000-000000000029', 'D0000000-0000-0000-0000-000000000015', 'What section comes first in a report?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000030', 'D0000000-0000-0000-0000-000000000015', 'What is the purpose of a table of contents?', 'multiple-choice', 2, now()),
-- DYSLEXIA 25+ Quiz 16: Cohesive Writing
('E0000000-0000-0000-0000-000000000031', 'D0000000-0000-0000-0000-000000000016', 'What is a linking word?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000032', 'D0000000-0000-0000-0000-000000000016', 'Which linking word shows contrast?', 'multiple-choice', 2, now()),
-- DYSLEXIA 25+ Quiz 17: Email Etiquette
('E0000000-0000-0000-0000-000000000033', 'D0000000-0000-0000-0000-000000000017', 'What makes a good email subject line?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000034', 'D0000000-0000-0000-0000-000000000017', 'How should you end a professional email?', 'multiple-choice', 2, now()),
-- DYSLEXIA 25+ Quiz 18: Memo Writing
('E0000000-0000-0000-0000-000000000035', 'D0000000-0000-0000-0000-000000000018', 'What are the parts of a memo?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000036', 'D0000000-0000-0000-0000-000000000018', 'When would you use a memo instead of an email?', 'multiple-choice', 2, now()),
-- ADHD 13-17 Quiz 19: What is Attention
('E0000000-0000-0000-0000-000000000037', 'D0000000-0000-0000-0000-000000000019', 'What are the types of attention?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000038', 'D0000000-0000-0000-0000-000000000019', 'What is sustained attention?', 'multiple-choice', 2, now()),
-- ADHD 13-17 Quiz 20: Focus Techniques
('E0000000-0000-0000-0000-000000000039', 'D0000000-0000-0000-0000-000000000020', 'How long is a Pomodoro session?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000040', 'D0000000-0000-0000-0000-000000000020', 'What should you do during a Pomodoro break?', 'multiple-choice', 2, now()),
-- ADHD 13-17 Quiz 21: Task Chunking
('E0000000-0000-0000-0000-000000000041', 'D0000000-0000-0000-0000-000000000021', 'What is task chunking?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000042', 'D0000000-0000-0000-0000-000000000021', 'What is the first step when breaking down a task?', 'multiple-choice', 2, now()),
-- ADHD 13-17 Quiz 22: Checklists
('E0000000-0000-0000-0000-000000000043', 'D0000000-0000-0000-0000-000000000022', 'Why are checklists helpful?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000044', 'D0000000-0000-0000-0000-000000000022', 'How do you make an effective checklist?', 'multiple-choice', 2, now()),
-- ADHD 13-17 Quiz 23: Morning Routine
('E0000000-0000-0000-0000-000000000045', 'D0000000-0000-0000-0000-000000000023', 'Why is a morning routine important?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000046', 'D0000000-0000-0000-0000-000000000023', 'What should a morning routine include?', 'multiple-choice', 2, now()),
-- ADHD 13-17 Quiz 24: Habit Stacking
('E0000000-0000-0000-0000-000000000047', 'D0000000-0000-0000-0000-000000000024', 'What is habit stacking?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000048', 'D0000000-0000-0000-0000-000000000024', 'Give an example of habit stacking.', 'multiple-choice', 2, now()),
-- ADHD 18-24 Quiz 25: Weekly Planning
('E0000000-0000-0000-0000-000000000049', 'D0000000-0000-0000-0000-000000000025', 'When is the best time to do weekly planning?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000050', 'D0000000-0000-0000-0000-000000000025', 'What is time-blocking?', 'multiple-choice', 2, now()),
-- ADHD 18-24 Quiz 26: Digital vs Paper
('E0000000-0000-0000-0000-000000000051', 'D0000000-0000-0000-0000-000000000026', 'Name one advantage of digital planning.', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000052', 'D0000000-0000-0000-0000-000000000026', 'Name one advantage of paper planning.', 'multiple-choice', 2, now()),
-- ADHD 18-24 Quiz 27: Why Procrastinate
('E0000000-0000-0000-0000-000000000053', 'D0000000-0000-0000-0000-000000000027', 'What causes procrastination?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000054', 'D0000000-0000-0000-0000-000000000027', 'Is procrastination the same as laziness?', 'multiple-choice', 2, now()),
-- ADHD 18-24 Quiz 28: Anti-Procrastination
('E0000000-0000-0000-0000-000000000055', 'D0000000-0000-0000-0000-000000000028', 'What is the 5-minute rule?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000056', 'D0000000-0000-0000-0000-000000000028', 'What is an implementation intention?', 'multiple-choice', 2, now()),
-- ADHD 18-24 Quiz 29: Eisenhower Matrix
('E0000000-0000-0000-0000-000000000057', 'D0000000-0000-0000-0000-000000000029', 'What are the four quadrants of the Eisenhower Matrix?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000058', 'D0000000-0000-0000-0000-000000000029', 'Which quadrant should you focus on most?', 'multiple-choice', 2, now()),
-- ADHD 18-24 Quiz 30: ABC Method
('E0000000-0000-0000-0000-000000000059', 'D0000000-0000-0000-0000-000000000030', 'What does "A" represent in the ABC method?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000060', 'D0000000-0000-0000-0000-000000000030', 'How does ABC differ from Eisenhower?', 'multiple-choice', 2, now()),
-- ADHD 25+ Quiz 31: ADHD at Work
('E0000000-0000-0000-0000-000000000061', 'D0000000-0000-0000-0000-000000000031', 'What is time blindness?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000062', 'D0000000-0000-0000-0000-000000000031', 'What is hyperfocus?', 'multiple-choice', 2, now()),
-- ADHD 25+ Quiz 32: Time Blindness
('E0000000-0000-0000-0000-000000000063', 'D0000000-0000-0000-0000-000000000032', 'Name a tool for managing time blindness.', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000064', 'D0000000-0000-0000-0000-000000000032', 'What is time-blocking?', 'multiple-choice', 2, now()),
-- ADHD 25+ Quiz 33: Habit Loop
('E0000000-0000-0000-0000-000000000065', 'D0000000-0000-0000-0000-000000000033', 'What are the three parts of the habit loop?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000066', 'D0000000-0000-0000-0000-000000000033', 'How do you change a bad habit?', 'multiple-choice', 2, now()),
-- ADHD 25+ Quiz 34: Habit Tracker
('E0000000-0000-0000-0000-000000000067', 'D0000000-0000-0000-0000-000000000034', 'How many days should you track a new habit?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000068', 'D0000000-0000-0000-0000-000000000034', 'What counts as a missed day?', 'multiple-choice', 2, now()),
-- ADHD 25+ Quiz 35: Emotional Regulation
('E0000000-0000-0000-0000-000000000069', 'D0000000-0000-0000-0000-000000000035', 'Why do people with ADHD have stronger emotions?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000070', 'D0000000-0000-0000-0000-000000000035', 'How can you prepare for emotional triggers?', 'multiple-choice', 2, now()),
-- ADHD 25+ Quiz 36: STOP Technique
('E0000000-0000-0000-0000-000000000071', 'D0000000-0000-0000-0000-000000000036', 'What does STOP stand for?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000072', 'D0000000-0000-0000-0000-000000000036', 'When should you use the STOP technique?', 'multiple-choice', 2, now()),
-- ASD 13-17 Quiz 37: Facial Expressions
('E0000000-0000-0000-0000-000000000073', 'D0000000-0000-0000-0000-000000000037', 'What are the six basic emotions?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000074', 'D0000000-0000-0000-0000-000000000037', 'Which emotion shows on the face when someone smiles?', 'multiple-choice', 2, now()),
-- ASD 13-17 Quiz 38: Body Language
('E0000000-0000-0000-0000-000000000075', 'D0000000-0000-0000-0000-000000000038', 'What does crossed arms mean?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000076', 'D0000000-0000-0000-0000-000000000038', 'What does leaning in mean?', 'multiple-choice', 2, now()),
-- ASD 13-17 Quiz 39: Turn-Taking
('E0000000-0000-0000-0000-000000000077', 'D0000000-0000-0000-0000-000000000039', 'What is turn-taking in conversation?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000078', 'D0000000-0000-0000-0000-000000000039', 'Why is it important not to interrupt?', 'multiple-choice', 2, now()),
-- ASD 13-17 Quiz 40: Topic Maintenance
('E0000000-0000-0000-0000-000000000079', 'D0000000-0000-0000-0000-000000000040', 'What does staying on topic mean?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000080', 'D0000000-0000-0000-0000-000000000040', 'How do you change a topic appropriately?', 'multiple-choice', 2, now()),
-- ASD 13-17 Quiz 41: Making Friends
('E0000000-0000-0000-0000-000000000081', 'D0000000-0000-0000-0000-000000000041', 'How do you find people with similar interests?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000082', 'D0000000-0000-0000-0000-000000000041', 'What is a good way to start a conversation?', 'multiple-choice', 2, now()),
-- ASD 13-17 Quiz 42: Keeping Friends
('E0000000-0000-0000-0000-000000000083', 'D0000000-0000-0000-0000-000000000042', 'What is important for maintaining friendships?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000084', 'D0000000-0000-0000-0000-000000000042', 'What should you do after a disagreement with a friend?', 'multiple-choice', 2, now()),
-- ASD 18-24 Quiz 43: Emotions Wheel
('E0000000-0000-0000-0000-000000000085', 'D0000000-0000-0000-0000-000000000043', 'Why are fine-grained emotion labels helpful?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000086', 'D0000000-0000-0000-0000-000000000043', 'What is the difference between "angry" and "frustrated"?', 'multiple-choice', 2, now()),
-- ASD 18-24 Quiz 44: Triggers
('E0000000-0000-0000-0000-000000000087', 'D0000000-0000-0000-0000-000000000044', 'What is an emotional trigger?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000088', 'D0000000-0000-0000-0000-000000000044', 'How does a trigger journal help?', 'multiple-choice', 2, now()),
-- ASD 18-24 Quiz 45: Sensory Needs
('E0000000-0000-0000-0000-000000000089', 'D0000000-0000-0000-0000-000000000045', 'Name one sensory tool.', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000090', 'D0000000-0000-0000-0000-000000000045', 'Why might someone need noise-cancelling headphones?', 'multiple-choice', 2, now()),
-- ASD 18-24 Quiz 46: Grounding
('E0000000-0000-0000-0000-000000000091', 'D0000000-0000-0000-0000-000000000046', 'What are the 5 senses used in 5-4-3-2-1?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000092', 'D0000000-0000-0000-0000-000000000046', 'When should you use grounding techniques?', 'multiple-choice', 2, now()),
-- ASD 18-24 Quiz 47: Communicating Needs
('E0000000-0000-0000-0000-000000000093', 'D0000000-0000-0000-0000-000000000047', 'What does "being direct" mean?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000094', 'D0000000-0000-0000-0000-000000000047', 'Give an example of clearly stating a need.', 'multiple-choice', 2, now()),
-- ASD 18-24 Quiz 48: Disclosure
('E0000000-0000-0000-0000-000000000095', 'D0000000-0000-0000-0000-000000000048', 'What are pros of disclosing autism?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000096', 'D0000000-0000-0000-0000-000000000048', 'When might it be safer not to disclose?', 'multiple-choice', 2, now()),
-- ASD 25+ Quiz 49: Household
('E0000000-0000-0000-0000-000000000097', 'D0000000-0000-0000-0000-000000000049', 'Why are visual schedules helpful for household tasks?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000098', 'D0000000-0000-0000-0000-000000000049', 'How do you create a cleaning schedule?', 'multiple-choice', 2, now()),
-- ASD 25+ Quiz 50: Meal Planning
('E0000000-0000-0000-0000-000000000099', 'D0000000-0000-0000-0000-000000000050', 'What are the steps of meal planning?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000100', 'D0000000-0000-0000-0000-000000000050', 'How does a shopping list help with meal planning?', 'multiple-choice', 2, now()),
-- ASD 25+ Quiz 51: Budgeting
('E0000000-0000-0000-0000-000000000101', 'D0000000-0000-0000-0000-000000000051', 'What is the 50/30/20 rule?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000102', 'D0000000-0000-0000-0000-000000000051', 'How do you track income and expenses?', 'multiple-choice', 2, now()),
-- ASD 25+ Quiz 52: Banking
('E0000000-0000-0000-0000-000000000103', 'D0000000-0000-0000-0000-000000000052', 'What is online banking?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000104', 'D0000000-0000-0000-0000-000000000052', 'How do automatic bill payments work?', 'multiple-choice', 2, now()),
-- ASD 25+ Quiz 53: Workplace Communication
('E0000000-0000-0000-0000-000000000105', 'D0000000-0000-0000-0000-000000000053', 'What is professional tone in workplace emails?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000106', 'D0000000-0000-0000-0000-000000000053', 'What are appropriate topics for workplace conversations?', 'multiple-choice', 2, now()),
-- ASD 25+ Quiz 54: Conflict Resolution
('E0000000-0000-0000-0000-000000000107', 'D0000000-0000-0000-0000-000000000054', 'What is an "I feel" statement?', 'multiple-choice', 1, now()),
('E0000000-0000-0000-0000-000000000108', 'D0000000-0000-0000-0000-000000000054', 'What are the steps of conflict resolution?', 'multiple-choice', 2, now())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 12. COURSE MILESTONES (1 per course = 9 milestones)
-- =====================================================

INSERT INTO public.course_milestones (id, course_id, title, description, required_completion_pct, icon, sequence_order, created_at) VALUES
('G0000000-0000-0000-0000-000000000001', 'A0000000-0000-0000-0000-000000000001', 'Dyslexia Reading Starter',   'Complete all lessons in Reading Foundations: Dyslexia (13-17).', 100, 'star', 1, now()),
('G0000000-0000-0000-0000-000000000002', 'A0000000-0000-0000-0000-000000000002', 'Comprehension Achiever',     'Complete all lessons in Reading Comprehension: Dyslexia (18-24).', 100, 'trophy', 1, now()),
('G0000000-0000-0000-0000-000000000003', 'A0000000-0000-0000-0000-000000000003', 'Academic Literacy Master',   'Complete all lessons in Academic Literacy: Dyslexia (25+).', 100, 'medal', 1, now()),
('G0000000-0000-0000-0000-000000000004', 'A0000000-0000-0000-0000-000000000004', 'Focus Skills Graduate',      'Complete all lessons in Focus Skills: ADHD (13-17).', 100, 'brain', 1, now()),
('G0000000-0000-0000-0000-000000000005', 'A0000000-0000-0000-0000-000000000005', 'Time Management Pro',        'Complete all lessons in Time Management: ADHD (18-24).', 100, 'clock', 1, now()),
('G0000000-0000-0000-0000-000000000006', 'A0000000-0000-0000-0000-000000000006', 'Executive Function Expert',  'Complete all lessons in Executive Function: ADHD (25+).', 100, 'rocket', 1, now()),
('G0000000-0000-0000-0000-000000000007', 'A0000000-0000-0000-0000-000000000007', 'Social Communication Star',  'Complete all lessons in Social Communication: ASD (13-17).', 100, 'people', 1, now()),
('G0000000-0000-0000-0000-000000000008', 'A0000000-0000-0000-0000-000000000008', 'Emotional Regulation Champion', 'Complete all lessons in Emotional Regulation: ASD (18-24).', 100, 'heart', 1, now()),
('G0000000-0000-0000-0000-000000000009', 'A0000000-0000-0000-0000-000000000009', 'Independent Living Leader',  'Complete all lessons in Independent Living: ASD (25+).', 100, 'home', 1, now())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 13. COURSE ACHIEVEMENTS (2 per course = 18 achievements)
-- =====================================================

INSERT INTO public.course_achievements (id, course_id, name, description, icon_url, requirement_type, requirement_threshold, created_at, updated_at) VALUES
-- DYSLEXIA achievements
('H0000000-0000-0000-0000-000000000001', 'A0000000-0000-0000-0000-000000000001', 'First Lesson Complete', 'Complete your first lesson in Reading Foundations.', NULL, 'lesson', 1, now(), now()),
('H0000000-0000-0000-0000-000000000002', 'A0000000-0000-0000-0000-000000000001', 'Perfect Quiz Score', 'Score 100% on any quiz in Reading Foundations.', NULL, 'quiz', 100, now(), now()),
('H0000000-0000-0000-0000-000000000003', 'A0000000-0000-0000-0000-000000000002', 'Comprehension Starter', 'Complete your first lesson in Reading Comprehension.', NULL, 'lesson', 1, now(), now()),
('H0000000-0000-0000-0000-000000000004', 'A0000000-0000-0000-0000-000000000002', 'Vocabulary Builder', 'Complete all vocabulary lessons.', NULL, 'lesson', 2, now(), now()),
('H0000000-0000-0000-0000-000000000005', 'A0000000-0000-0000-0000-000000000003', 'Academic Reader', 'Complete the academic reading chapter.', NULL, 'lesson', 2, now(), now()),
('H0000000-0000-0000-0000-000000000006', 'A0000000-0000-0000-0000-000000000003', 'Report Writer', 'Submit a practice report.', NULL, 'activity', 1, now(), now()),
-- ADHD achievements
('H0000000-0000-0000-0000-000000000007', 'A0000000-0000-0000-0000-000000000004', 'Focus Beginner', 'Complete the Understanding Attention chapter.', NULL, 'lesson', 2, now(), now()),
('H0000000-0000-0000-0000-000000000008', 'A0000000-0000-0000-0000-000000000004', 'Pomodoro Pro', 'Use the Pomodoro technique for 5 sessions.', NULL, 'streak', 5, now(), now()),
('H0000000-0000-0000-0000-000000000009', 'A0000000-0000-0000-0000-000000000005', 'Planning Pioneer', 'Complete the Weekly Planning chapter.', NULL, 'lesson', 2, now(), now()),
('H0000000-0000-0000-0000-000000000010', 'A0000000-0000-0000-0000-000000000005', 'Anti-Procrastination Master', 'Apply the 5-minute rule for 7 days.', NULL, 'streak', 7, now(), now()),
('H0000000-0000-0000-0000-000000000011', 'A0000000-0000-0000-0000-000000000006', 'Workplace Warrior', 'Complete the ADHD at Work chapter.', NULL, 'lesson', 2, now(), now()),
('H0000000-0000-0000-0000-000000000012', 'A0000000-0000-0000-0000-000000000006', 'Habit Former', 'Track a new habit for 21 days.', NULL, 'streak', 21, now(), now()),
-- ASD achievements
('H0000000-0000-0000-0000-000000000013', 'A0000000-0000-0000-0000-000000000007', 'Social Cue Spotter', 'Complete the Facial Expressions and Body Language lessons.', NULL, 'lesson', 2, now(), now()),
('H0000000-0000-0000-0000-000000000014', 'A0000000-0000-0000-0000-000000000007', 'Conversation Navigator', 'Practise turn-taking in 3 conversation simulations.', NULL, 'activity', 3, now(), now()),
('H0000000-0000-0000-0000-000000000015', 'A0000000-0000-0000-0000-000000000008', 'Emotion Expert', 'Identify 10 different emotions using the emotions wheel.', NULL, 'activity', 10, now(), now()),
('H0000000-0000-0000-0000-000000000016', 'A0000000-0000-0000-0000-000000000008', 'Coping Champion', 'Complete all grounding technique exercises.', NULL, 'lesson', 2, now(), now()),
('H0000000-0000-0000-0000-000000000017', 'A0000000-0000-0000-0000-000000000009', 'Life Skills Graduate', 'Complete the Daily Living Skills chapter.', NULL, 'lesson', 2, now(), now()),
('H0000000-0000-0000-0000-000000000018', 'A0000000-0000-0000-0000-000000000009', 'Financial Freedom', 'Create a monthly budget using the 50/30/20 rule.', NULL, 'activity', 1, now(), now())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 14. ENROLLMENTS (1 per learner-course = 15 enrollments)
-- =====================================================
-- Learner 1 (Dyslexia) enrolled in Dyslexia courses
-- Learner 2 (ADHD) enrolled in ADHD courses
-- Learner 3 (ASD) enrolled in ASD courses

INSERT INTO public.enrollments (id, user_id, course_id, enrolled_at, status) VALUES
-- Ahmad Irfan (Dyslexia learner)
('J0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'A0000000-0000-0000-0000-000000000001', now() - interval '30 days', 'active'),
('J0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'A0000000-0000-0000-0000-000000000002', now() - interval '15 days', 'active'),
('J0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'A0000000-0000-0000-0000-000000000003', now() - interval '5 days',  'active'),
-- Nurul Aisyah (ADHD learner)
('J0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'A0000000-0000-0000-0000-000000000004', now() - interval '25 days', 'active'),
('J0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 'A0000000-0000-0000-0000-000000000005', now() - interval '10 days', 'active'),
('J0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000004', 'A0000000-0000-0000-0000-000000000006', now() - interval '3 days',  'active'),
-- Muhammad Hakim (ASD learner)
('J0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000005', 'A0000000-0000-0000-0000-000000000007', now() - interval '20 days', 'active'),
('J0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000005', 'A0000000-0000-0000-0000-000000000008', now() - interval '12 days', 'active'),
('J0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000005', 'A0000000-0000-0000-0000-000000000009', now() - interval '7 days',  'active')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 15. LESSON PROGRESS (sample progress for learner 1)
-- =====================================================

INSERT INTO public.lesson_progress (id, user_id, lesson_id, completed, completed_at, created_at, updated_at) VALUES
-- Ahmad completed first 2 lessons of Dyslexia 13-17
('K0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'C0000000-0000-0000-0000-000000000001', true,  now() - interval '28 days', now() - interval '30 days', now() - interval '28 days'),
('K0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'C0000000-0000-0000-0000-000000000002', true,  now() - interval '26 days', now() - interval '30 days', now() - interval '26 days'),
('K0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'C0000000-0000-0000-0000-000000000003', true,  now() - interval '24 days', now() - interval '30 days', now() - interval '24 days'),
('K0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'C0000000-0000-0000-0000-000000000004', false, NULL, now() - interval '30 days', now() - interval '30 days'),
-- Nurul completed first 2 lessons of ADHD 13-17
('K0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 'C0000000-0000-0000-0000-000000000019', true,  now() - interval '23 days', now() - interval '25 days', now() - interval '23 days'),
('K0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000004', 'C0000000-0000-0000-0000-000000000020', true,  now() - interval '21 days', now() - interval '25 days', now() - interval '21 days'),
-- Hakim completed first 2 lessons of ASD 13-17
('K0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000005', 'C0000000-0000-0000-0000-000000000037', true,  now() - interval '18 days', now() - interval '20 days', now() - interval '18 days'),
('K0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000005', 'C0000000-0000-0000-0000-000000000038', true,  now() - interval '16 days', now() - interval '20 days', now() - interval '16 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 16. ADAPTIVE INTERACTIONS (sample)
-- =====================================================

INSERT INTO public.adaptive_interactions (id, user_id, lesson_id, course_id, adaptation_used, session_id, duration_seconds, created_at) VALUES
('L0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'C0000000-0000-0000-0000-000000000001', 'A0000000-0000-0000-0000-000000000001', 'dyslexia_standard', 'sess_001', 900, now() - interval '28 days'),
('L0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'C0000000-0000-0000-0000-000000000019', 'A0000000-0000-0000-0000-000000000004', 'adhd_focus',        'sess_002', 750, now() - interval '23 days'),
('L0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 'C0000000-0000-0000-0000-000000000037', 'A0000000-0000-0000-0000-000000000007', 'asd_simplified',    'sess_003', 850, now() - interval '18 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- DONE
-- =====================================================
