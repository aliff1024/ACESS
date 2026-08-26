-- Add is_draft column to lesson_interactive_content table
ALTER TABLE public.lesson_interactive_content
ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.lesson_interactive_content.is_draft IS 'Whether this activity is still a draft and should not be shown to learners.';
