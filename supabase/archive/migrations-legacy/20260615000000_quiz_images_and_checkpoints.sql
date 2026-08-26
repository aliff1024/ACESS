-- Add image support to quiz questions and options
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.quiz_options ADD COLUMN IF NOT EXISTS image_url text;
