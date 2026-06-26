-- =====================================================
-- QUIZ OPTIONS CONTINUATION (Q85-Q108)
-- Append this to sample_data.sql
-- =====================================================

-- Q85: What is online banking?
INSERT INTO public.quiz_options (id, question_id, option_text, is_correct, sequence_order, created_at) VALUES
('F0000000-0000-0000-0000-000000000337', 'E0000000-0000-0000-0000-000000000103', 'Managing your bank account through the internet', true,  1, now()),
('F0000000-0000-0000-0000-000000000338', 'E0000000-0000-0000-0000-000000000103', 'Going to the bank in person', false, 2, now()),
('F0000000-0000-0000-0000-000000000339', 'E0000000-0000-0000-0000-000000000103', 'Using an ATM only',         false, 3, now()),
('F0000000-0000-0000-0000-000000000340', 'E0000000-0000-0000-0000-000000000103', 'Writing paper cheques',     false, 4, now());

-- Q86: How do automatic bill payments work?
INSERT INTO public.quiz_options (id, question_id, option_text, is_correct, sequence_order, created_at) VALUES
('F0000000-0000-0000-0000-000000000341', 'E0000000-0000-0000-0000-000000000104', 'Set up once, bank pays bills automatically each month', true,  1, now()),
('F0000000-0000-0000-0000-000000000342', 'E0000000-0000-0000-0000-000000000104', 'You must pay manually every time', false, 2, now()),
('F0000000-0000-0000-0000-000000000343', 'E0000000-0000-0000-0000-000000000104', 'Someone else pays for you',  false, 3, now()),
('F0000000-0000-0000-0000-000000000344', 'E0000000-0000-0000-0000-000000000104', 'Bills are free',            false, 4, now());

-- Q87: What is professional tone in workplace emails?
INSERT INTO public.quiz_options (id, question_id, option_text, is_correct, sequence_order, created_at) VALUES
('F0000000-0000-0000-0000-000000000345', 'E0000000-0000-0000-0000-000000000105', 'Polite, clear, and formal language', true,  1, now()),
('F0000000-0000-0000-0000-000000000346', 'E0000000-0000-0000-0000-000000000105', 'Using slang and emojis',    false, 2, now()),
('F0000000-0000-0000-0000-000000000347', 'E0000000-0000-0000-0000-000000000105', 'Being very casual',         false, 3, now()),
('F0000000-0000-0000-0000-000000000348', 'E0000000-0000-0000-0000-000000000105', 'Writing in ALL CAPS',       false, 4, now());

-- Q88: What are appropriate topics for workplace conversations?
INSERT INTO public.quiz_options (id, question_id, option_text, is_correct, sequence_order, created_at) VALUES
('F0000000-0000-0000-0000-000000000349', 'E0000000-0000-0000-0000-000000000106', 'Work projects, industry news, shared interests', true,  1, now()),
('F0000000-0000-0000-0000-000000000350', 'E0000000-0000-0000-0000-000000000106', 'Personal salary details',   false, 2, now()),
('F0000000-0000-0000-0000-000000000351', 'E0000000-0000-0000-0000-000000000106', 'Gossip about colleagues',   false, 3, now()),
('F0000000-0000-0000-0000-000000000352', 'E0000000-0000-0000-0000-000000000106', 'Political debates',         false, 4, now());

-- Q89: What is an "I feel" statement?
INSERT INTO public.quiz_options (id, question_id, option_text, is_correct, sequence_order, created_at) VALUES
('F0000000-0000-0000-0000-000000000353', 'E0000000-0000-0000-0000-000000000107', 'Expressing feelings without blaming others', true,  1, now()),
('F0000000-0000-0000-0000-000000000354', 'E0000000-0000-0000-0000-000000000107', 'Blaming the other person',  false, 2, now()),
('F0000000-0000-0000-0000-000000000355', 'E0000000-0000-0000-0000-000000000107', 'Saying nothing',            false, 3, now()),
('F0000000-0000-0000-0000-000000000356', 'E0000000-0000-0000-0000-000000000107', 'Being aggressive',          false, 4, now());

-- Q90: What are the steps of conflict resolution?
INSERT INTO public.quiz_options (id, question_id, option_text, is_correct, sequence_order, created_at) VALUES
('F0000000-0000-0000-0000-000000000357', 'E0000000-0000-0000-0000-000000000108', 'Listen, express feelings, find compromise', true,  1, now()),
('F0000000-0000-0000-0000-000000000358', 'E0000000-0000-0000-0000-000000000108', 'Win the argument',          false, 2, now()),
('F0000000-0000-0000-0000-000000000359', 'E0000000-0000-0000-0000-000000000108', 'Ignore the problem',        false, 3, now()),
('F0000000-0000-0000-0000-000000000360', 'E0000000-0000-0000-0000-000000000108', 'Get someone else to solve it', false, 4, now());
